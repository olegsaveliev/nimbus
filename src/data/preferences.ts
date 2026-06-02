/* User preferences (theme, tweaks, WIP limit, lane mode, active board).
 *
 * Local-first with remote reconciliation:
 *   - The authoritative store is Postgres (synced across devices).
 *   - A localStorage snapshot is the *immediate* source of truth at boot, fed to
 *     React Query as `initialData` so the UI never renders the defaults while the
 *     network request is in flight. The server value reconciles in the background
 *     (a no-op when they match), and every resolved value is written back to the
 *     snapshot. This is what makes theme changes flash-free on refresh.
 *
 * (A separate `nimbus-css-cache` snapshot — written by applyTheme — drives the
 * pre-paint inline boot script in index.html; that handles the frame before React
 * even mounts. The two snapshots cover the two distinct timing windows.) */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryClient";
import type { LaneBy, Preferences } from "@/types";
import { DEFAULT_THEME, TWEAK_DEFAULTS } from "@/domain/themes";

const PREFS_CACHE_KEY = "nimbus-prefs";

const DEFAULTS: Preferences = {
  theme: DEFAULT_THEME,
  tweaks: { ...TWEAK_DEFAULTS },
  wipLimit: 3,
  laneBy: "none",
  activeBoardId: null,
};

interface PrefRow {
  theme: number;
  accent: string;
  radius: number;
  blur: number;
  opacity: number | string;
  wip_limit: number;
  lane_by: string;
  active_board_id: string | null;
}

function fromRow(r: Partial<PrefRow> | null): Preferences {
  if (!r) return DEFAULTS;
  return {
    theme: typeof r.theme === "number" ? r.theme : DEFAULTS.theme,
    tweaks: {
      accent: r.accent ?? DEFAULTS.tweaks.accent,
      radius: r.radius ?? DEFAULTS.tweaks.radius,
      blur: r.blur ?? DEFAULTS.tweaks.blur,
      opacity: r.opacity != null ? Number(r.opacity) : DEFAULTS.tweaks.opacity,
    },
    wipLimit: r.wip_limit ?? DEFAULTS.wipLimit,
    laneBy: (r.lane_by as LaneBy) ?? DEFAULTS.laneBy,
    activeBoardId: r.active_board_id ?? null,
  };
}

/** Synchronous local snapshot — the boot-time source of truth. */
function readSnapshot(): Preferences | undefined {
  try {
    const raw = localStorage.getItem(PREFS_CACHE_KEY);
    if (!raw) return undefined;
    const p = JSON.parse(raw) as Partial<Preferences>;
    if (typeof p?.theme !== "number" || !p?.tweaks) return undefined;
    return { ...DEFAULTS, ...p, tweaks: { ...DEFAULTS.tweaks, ...p.tweaks } };
  } catch {
    return undefined;
  }
}
function writeSnapshot(p: Preferences) {
  try {
    localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function toRow(userId: string, p: Preferences) {
  return {
    user_id: userId,
    theme: p.theme,
    accent: p.tweaks.accent,
    radius: p.tweaks.radius,
    blur: p.tweaks.blur,
    opacity: p.tweaks.opacity,
    wip_limit: p.wipLimit,
    lane_by: p.laneBy,
    active_board_id: p.activeBoardId,
    updated_at: new Date().toISOString(),
  };
}

export function usePreferences() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: qk.preferences,
    queryFn: async (): Promise<Preferences> => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("theme, accent, radius, blur, opacity, wip_limit, lane_by, active_board_id")
        .maybeSingle();
      if (error) throw error;
      const prefs = fromRow(data as Partial<PrefRow> | null);
      writeSnapshot(prefs); // keep the local snapshot in sync with the server
      return prefs;
    },
    // Hydrate instantly from the local snapshot so React never shows the defaults
    // mid-load; staleTime:0 ensures we still reconcile with the server on mount.
    initialData: readSnapshot,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: async (next: Preferences) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { error } = await supabase.from("user_preferences").upsert(toRow(u.user.id, next));
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: qk.preferences }),
  });

  /** Optimistically patch cache + local snapshot, then persist. */
  const update = (patch: Partial<Preferences>) => {
    const curr = qc.getQueryData<Preferences>(qk.preferences) ?? readSnapshot() ?? DEFAULTS;
    const next: Preferences = {
      ...curr,
      ...patch,
      tweaks: { ...curr.tweaks, ...(patch.tweaks ?? {}) },
    };
    qc.setQueryData(qk.preferences, next);
    writeSnapshot(next);
    mutation.mutate(next);
  };

  return { prefs: query.data ?? DEFAULTS, isLoaded: query.isSuccess, update };
}
