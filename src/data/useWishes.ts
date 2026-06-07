/* Wishlist controller: loads the per-user wish list into the React Query cache
 * and exposes optimistic actions (add / addFull / patch / bump / cyclePri / del)
 * that patch the cache immediately and persist to Postgres. On any persistence
 * error the wishes query is invalidated to resync — same discipline as
 * useBoardData. Also seeds the sample wishes once on first ever visit (mirrors
 * ensureStarterBoard), gated by a *per-account* flag (user_preferences
 * .wishlist_seeded) so it never re-seeds — including across browsers/devices. */
import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryClient";
import { PRI_CYCLE } from "@/domain/priority";
import { applyBump, SEED_WISHES, smartParse } from "@/domain/wishlist";
import type { Priority, Wish, WishStage } from "@/types";
import * as repo from "./wishRepo";

const uid = () => crypto.randomUUID();

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export interface WishActions {
  /** Capture from the smart bar: parse text → create a wish. Returns its id. */
  add: (text: string) => string | null;
  /** Create from the full-details draft (string fields). Returns its id. */
  addFull: (draft: { title: string; price?: string; saved?: string; pri?: Priority; type?: Wish["type"]; where?: string; link?: string; note?: string; target?: string }) => string | null;
  patch: (id: string, d: Partial<Wish>) => void;
  bump: (id: string, amount: number) => void;
  cyclePri: (id: string) => void;
  del: (id: string) => void;
}

export function useWishes() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: qk.wishes,
    queryFn: repo.fetchWishes,
  });

  // Per-account "samples already seeded" flag — read separately from the main
  // preferences query so a not-yet-migrated column degrades to "not seeded"
  // rather than breaking preferences/theme/board loading.
  const seededQuery = useQuery({
    queryKey: qk.wishlistSeeded,
    queryFn: repo.fetchWishlistSeeded,
  });

  // One-time seed: on first ever load with an empty list, insert the sample
  // wishes so the feed has something to show — the Wishlist analogue of the
  // starter board. The flag lives on the user's preferences row, so deleting
  // every wish never re-seeds, on this device or any other.
  const seedingRef = useRef(false);
  useEffect(() => {
    if (!query.isSuccess || !seededQuery.isSuccess || seedingRef.current) return;
    const hasWishes = (query.data?.length ?? 0) > 0;

    // Account already has wishes but the flag isn't set (e.g. it was seeded under
    // the old per-browser localStorage scheme). Back-fill the flag so deleting
    // them all later can't trigger a re-seed on a fresh browser/device.
    if (hasWishes) {
      if (!seededQuery.data) {
        qc.setQueryData<boolean>(qk.wishlistSeeded, true);
        currentUserId().then((userId) => {
          if (userId) repo.markWishlistSeeded(userId);
        });
      }
      return;
    }

    // Empty list: seed only if this account has never been seeded before.
    if (seededQuery.data) return;
    seedingRef.current = true;
    (async () => {
      const userId = await currentUserId();
      if (!userId) {
        seedingRef.current = false;
        return;
      }
      const wishes: Wish[] = SEED_WISHES.map((s, i) => ({ ...s, id: uid(), position: i }));
      try {
        await repo.insertWishRows(wishes.map((w) => repo.toInsertRow(w, userId)));
        await repo.markWishlistSeeded(userId);
        qc.setQueryData<boolean>(qk.wishlistSeeded, true);
        qc.setQueryData<Wish[]>(qk.wishes, wishes);
      } catch (e) {
        console.error("[Nimbus] wishlist seed failed:", e);
        qc.invalidateQueries({ queryKey: qk.wishes });
      } finally {
        seedingRef.current = false;
      }
    })();
  }, [query.isSuccess, query.data, seededQuery.isSuccess, seededQuery.data, qc]);

  const actions = useMemo<WishActions>(() => {
    const current = () => qc.getQueryData<Wish[]>(qk.wishes) ?? [];
    const setWishes = (fn: (list: Wish[]) => Wish[]) =>
      qc.setQueryData<Wish[]>(qk.wishes, (old) => fn(old ?? []));
    const resync = () => qc.invalidateQueries({ queryKey: qk.wishes });
    const persist = (p: Promise<unknown>) => {
      p.catch((e) => {
        console.error("[Nimbus] wishlist persistence error:", e);
        resync();
      });
    };
    /** Newest captures sort to the top: one below the current smallest position. */
    const topPosition = () => current().reduce((m, w) => Math.min(m, w.position), 0) - 1;

    const create = (w: Wish) => {
      setWishes((list) => [w, ...list]);
      persist(
        currentUserId().then((userId) => {
          if (!userId) throw new Error("no user");
          return repo.insertWishRow(repo.toInsertRow(w, userId));
        }),
      );
    };

    const add: WishActions["add"] = (text) => {
      if (!text.trim()) return null;
      const p = smartParse(text);
      const w: Wish = {
        id: uid(),
        title: p.title,
        type: p.type,
        price: p.price,
        saved: 0,
        pri: p.pri,
        where: p.where,
        link: p.link,
        note: p.note,
        target: "",
        stage: p.price ? "saving" : "wishing",
        position: topPosition(),
      };
      create(w);
      return w.id;
    };

    const addFull: WishActions["addFull"] = (d) => {
      if (!d.title.trim()) return null;
      const price = d.price ? parseFloat(d.price) : null;
      const saved = d.saved ? parseFloat(d.saved) : 0;
      const stage: WishStage = saved && price && saved >= price ? "ready" : saved ? "saving" : "wishing";
      const w: Wish = {
        id: uid(),
        title: d.title.trim(),
        type: d.type ?? "buy",
        price: price != null && !isNaN(price) ? price : null,
        saved: !isNaN(saved) ? saved : 0,
        pri: d.pri ?? "med",
        where: d.where ?? "",
        link: d.link ?? "",
        note: d.note ?? "",
        target: d.target ?? "",
        stage,
        position: topPosition(),
      };
      create(w);
      return w.id;
    };

    const patch: WishActions["patch"] = (id, d) => {
      setWishes((list) => list.map((w) => (w.id === id ? { ...w, ...d } : w)));
      const row = repo.toPatchRow(d);
      if (Object.keys(row).length) persist(repo.updateWishRow(id, row));
    };

    const bump: WishActions["bump"] = (id, amount) => {
      const w = current().find((x) => x.id === id);
      if (!w) return;
      const res = applyBump(w, amount);
      setWishes((list) => list.map((x) => (x.id === id ? { ...x, ...res } : x)));
      persist(repo.updateWishRow(id, { saved: res.saved, stage: res.stage }));
    };

    const cyclePri: WishActions["cyclePri"] = (id) => {
      const w = current().find((x) => x.id === id);
      if (!w) return;
      const nextPri: Priority = PRI_CYCLE[w.pri];
      setWishes((list) => list.map((x) => (x.id === id ? { ...x, pri: nextPri } : x)));
      persist(repo.updateWishRow(id, { pri: nextPri }));
    };

    const del: WishActions["del"] = (id) => {
      setWishes((list) => list.filter((w) => w.id !== id));
      persist(repo.deleteWishRow(id));
    };

    return { add, addFull, patch, bump, cyclePri, del };
  }, [qc]);

  return { wishes: query.data ?? [], isLoaded: query.isSuccess, actions };
}
