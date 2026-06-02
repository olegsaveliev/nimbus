/* Client wrapper for the server-side AI proxy (Supabase Edge Function "ai").
 * Replaces the prototype's BYOK aiComplete — no API keys ever live in the client. */
import { supabase } from "@/lib/supabase";

export async function aiComplete(prompt: string, maxTokens?: number, feature = "misc"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai", {
    body: { prompt, maxTokens: maxTokens || 300, feature },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  // let the Reports usage card know to refresh
  try {
    window.dispatchEvent(new CustomEvent("nimbus-ai-used"));
  } catch {
    /* ignore */
  }
  return (data?.text as string) || "";
}

/** Extract a JSON array/object from a possibly fenced or chatty AI response. */
export function extractJSON<T = unknown>(out: string): T | null {
  if (!out) return null;
  let s = String(out).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const first = Math.min(...[s.indexOf("["), s.indexOf("{")].filter((i) => i >= 0));
  const lastA = s.lastIndexOf("]"),
    lastO = s.lastIndexOf("}");
  const last = Math.max(lastA, lastO);
  if (isFinite(first) && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function aiJSON<T = unknown>(prompt: string, maxTokens?: number, feature = "misc"): Promise<T | null> {
  return extractJSON<T>(await aiComplete(prompt, maxTokens || 700, feature));
}

export function aiSource(): string {
  return "Nimbus server (Claude)";
}

/* Approx public prices, $ per 1M tokens (used for the Reports cost estimate). */
export const AI_PRICING: Record<string, { in: number; out: number; model: string }> = {
  anthropic: { in: 0.8, out: 4.0, model: "claude-3-5-haiku" },
  openai: { in: 0.15, out: 0.6, model: "gpt-4o-mini" },
  builtin: { in: 0, out: 0, model: "built-in" },
};

export function aiCost(usage: { tokIn?: Record<string, number>; tokOut?: Record<string, number> }): number {
  let c = 0;
  Object.keys(AI_PRICING).forEach((p) => {
    const pr = AI_PRICING[p];
    c += ((usage.tokIn || {})[p] || 0) / 1e6 * pr.in + ((usage.tokOut || {})[p] || 0) / 1e6 * pr.out;
  });
  return c;
}
