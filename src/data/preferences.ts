/* User preferences (theme, tweaks, WIP limit, lane mode, active board) persisted
 * to Postgres so they follow the user across devices. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryClient";
import type { LaneBy, Preferences } from "@/types";
import { DEFAULT_THEME, TWEAK_DEFAULTS } from "@/domain/themes";

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
      return fromRow(data as Partial<PrefRow> | null);
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: Preferences) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const row = {
        user_id: u.user.id,
        theme: next.theme,
        accent: next.tweaks.accent,
        radius: next.tweaks.radius,
        blur: next.tweaks.blur,
        opacity: next.tweaks.opacity,
        wip_limit: next.wipLimit,
        lane_by: next.laneBy,
        active_board_id: next.activeBoardId,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("user_preferences").upsert(row);
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: qk.preferences }),
  });

  /** Optimistically patch + persist a subset of preferences. */
  const update = (patch: Partial<Preferences>) => {
    const curr = qc.getQueryData<Preferences>(qk.preferences) ?? DEFAULTS;
    const next: Preferences = {
      ...curr,
      ...patch,
      tweaks: { ...curr.tweaks, ...(patch.tweaks ?? {}) },
    };
    qc.setQueryData(qk.preferences, next);
    mutation.mutate(next);
  };

  return { prefs: query.data ?? DEFAULTS, isLoaded: query.isSuccess, update };
}
