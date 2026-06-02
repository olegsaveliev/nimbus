/* Aggregates ai_events into the shape the Reports "AI usage" card expects. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryClient";
import type { AIUsage } from "@/types";
import { iso } from "@/domain/dates";

interface EventRow {
  provider: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
}

const EMPTY: AIUsage = { total: 0, prov: {}, days: {}, tokIn: {}, tokOut: {} };

export function useAIUsage() {
  return useQuery({
    queryKey: qk.aiUsage,
    queryFn: async (): Promise<AIUsage> => {
      const { data, error } = await supabase
        .from("ai_events")
        .select("provider, tokens_in, tokens_out, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const usage: AIUsage = { total: 0, prov: {}, days: {}, tokIn: {}, tokOut: {} };
      (data as EventRow[] | null)?.forEach((e) => {
        usage.total += 1;
        usage.prov[e.provider] = (usage.prov[e.provider] || 0) + 1;
        usage.tokIn[e.provider] = (usage.tokIn[e.provider] || 0) + (e.tokens_in || 0);
        usage.tokOut[e.provider] = (usage.tokOut[e.provider] || 0) + (e.tokens_out || 0);
        const d = iso(new Date(e.created_at));
        usage.days[d] = (usage.days[d] || 0) + 1;
      });
      return usage;
    },
  });
}

/** Call after running an AI action so the Reports card refreshes. */
export function useRefreshAIUsage() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.aiUsage });
}

export { EMPTY as EMPTY_AI_USAGE };
