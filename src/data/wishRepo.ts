/* Raw Supabase reads/writes for the per-user Wishlist. Thin and predictable —
 * the controller (useWishes) builds DB-shaped payloads and owns optimistic cache
 * updates, mirroring boardRepo's split. Maps the client `where` field to the
 * `where_at` column (where is a SQL keyword). */
import { supabase } from "@/lib/supabase";
import type { Wish } from "@/types";

/** A wishes row as stored in Postgres. */
export interface WishRow {
  id: string;
  user_id?: string;
  title: string;
  type: Wish["type"];
  price: number | null;
  saved: number;
  pri: Wish["pri"];
  where_at: string;
  link: string;
  note: string;
  target: string;
  stage: Wish["stage"];
  position: number;
}

/** Map a DB row to the client Wish model. */
export function fromRow(r: WishRow): Wish {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    price: r.price != null ? Number(r.price) : null,
    saved: Number(r.saved) || 0,
    pri: r.pri,
    where: r.where_at ?? "",
    link: r.link ?? "",
    note: r.note ?? "",
    target: r.target ?? "",
    stage: r.stage,
    position: r.position ?? 0,
  };
}

/** Build an insert row from a client Wish (user_id is set by the caller). */
export function toInsertRow(w: Wish, userId: string): WishRow {
  return {
    id: w.id,
    user_id: userId,
    title: w.title,
    type: w.type,
    price: w.price,
    saved: w.saved,
    pri: w.pri,
    where_at: w.where,
    link: w.link,
    note: w.note,
    target: w.target,
    stage: w.stage,
    position: w.position,
  };
}

/** Translate a partial client patch into a DB column patch. */
export function toPatchRow(patch: Partial<Wish>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("title" in patch) row.title = patch.title;
  if ("type" in patch) row.type = patch.type;
  if ("price" in patch) row.price = patch.price;
  if ("saved" in patch) row.saved = patch.saved;
  if ("pri" in patch) row.pri = patch.pri;
  if ("where" in patch) row.where_at = patch.where;
  if ("link" in patch) row.link = patch.link;
  if ("note" in patch) row.note = patch.note;
  if ("target" in patch) row.target = patch.target;
  if ("stage" in patch) row.stage = patch.stage;
  if ("position" in patch) row.position = patch.position;
  return row;
}

export async function fetchWishes(): Promise<Wish[]> {
  const { data, error } = await supabase
    .from("wishes")
    .select("id, title, type, price, saved, pri, where_at, link, note, target, stage, position")
    .order("position");
  if (error) throw error;
  return ((data ?? []) as WishRow[]).map(fromRow);
}

export async function insertWishRow(row: WishRow): Promise<void> {
  const { error } = await supabase.from("wishes").insert(row);
  if (error) throw error;
}

export async function insertWishRows(rows: WishRow[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase.from("wishes").insert(rows);
  if (error) throw error;
}

export async function updateWishRow(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("wishes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteWishRow(id: string): Promise<void> {
  const { error } = await supabase.from("wishes").delete().eq("id", id);
  if (error) throw error;
}

/* ---- Per-account "samples already seeded" flag (user_preferences.wishlist_seeded) ----
 * Read/written separately from the main preferences query so a not-yet-migrated
 * column degrades gracefully (treated as "not seeded") instead of breaking the
 * whole preferences load. */
export async function fetchWishlistSeeded(): Promise<boolean> {
  const { data, error } = await supabase.from("user_preferences").select("wishlist_seeded").maybeSingle();
  if (error) {
    console.warn("[Nimbus] wishlist_seeded unavailable (run migration 0004):", error.message);
    return false;
  }
  return Boolean((data as { wishlist_seeded?: boolean } | null)?.wishlist_seeded);
}

export async function markWishlistSeeded(userId: string): Promise<void> {
  const { error } = await supabase.from("user_preferences").update({ wishlist_seeded: true }).eq("user_id", userId);
  if (error) console.warn("[Nimbus] could not persist wishlist_seeded:", error.message);
}
