/* BYOK (bring-your-own-key) AI client.
 *
 * Calls Anthropic / OpenAI directly from the browser using a key the user pastes
 * into Settings (stored in localStorage). Intended for personal use — the key
 * lives only in this browser. Usage is still logged to the ai_events table so the
 * Reports "AI usage" card keeps working.
 *
 * (The prototype's server-side proxy was swapped out for this at the user's
 * request; for a multi-user product, prefer a server proxy so keys never ship to
 * the client.) */
import { supabase } from "@/lib/supabase";

const KEY_LS = "nimbus-anthropic-key";
const OKEY_LS = "nimbus-openai-key";
const PROV_LS = "nimbus-ai-provider"; // auto | anthropic | openai

const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";
const OPENAI_MODEL = "gpt-4o-mini";

type Provider = "anthropic" | "openai" | "none";

function lsGet(k: string): string {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
}
export function getAKey() { return lsGet(KEY_LS); }
export function getOKey() { return lsGet(OKEY_LS); }
export function getProvider(): string { return lsGet(PROV_LS) || "auto"; }
export function hasKey(): boolean { return !!(getAKey() || getOKey()); }

export function setAKey(v: string) { try { localStorage.setItem(KEY_LS, v); } catch { /* ignore */ } }
export function clearAKey() { try { localStorage.removeItem(KEY_LS); } catch { /* ignore */ } }
export function setOKey(v: string) { try { localStorage.setItem(OKEY_LS, v); } catch { /* ignore */ } }
export function clearOKey() { try { localStorage.removeItem(OKEY_LS); } catch { /* ignore */ } }
export function setProvider(p: string) { try { localStorage.setItem(PROV_LS, p); } catch { /* ignore */ } }

export function activeProvider(): Provider {
  const p = getProvider();
  if (p === "anthropic") return getAKey() ? "anthropic" : "none";
  if (p === "openai") return getOKey() ? "openai" : "none";
  // auto
  if (getAKey()) return "anthropic";
  if (getOKey()) return "openai";
  return "none";
}

export function aiSource(): string {
  const p = activeProvider();
  return p === "anthropic" ? "Anthropic (your key)" : p === "openai" ? "OpenAI (your key)" : "No key — add one in Settings";
}

function estTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

/** Best-effort usage logging to ai_events (under RLS) + notify the Reports card. */
async function logAIEvent(provider: string, inTok: number, outTok: number, feature: string) {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await supabase.from("ai_events").insert({
        user_id: data.user.id,
        feature,
        provider,
        tokens_in: inTok,
        tokens_out: outTok,
      });
    }
  } catch {
    /* non-fatal */
  }
  try {
    window.dispatchEvent(new CustomEvent("nimbus-ai-used"));
  } catch {
    /* ignore */
  }
}

export async function aiComplete(prompt: string, maxTokens?: number, feature = "misc"): Promise<string> {
  const prov = activeProvider();
  const mt = maxTokens || 300;

  if (prov === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": getAKey(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: mt, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) throw new Error("anthropic " + r.status);
    const data = await r.json();
    const text: string = data?.content?.[0]?.text || "";
    const u = data.usage || {};
    void logAIEvent("anthropic", u.input_tokens ?? estTokens(prompt), u.output_tokens ?? estTokens(text), feature);
    return text;
  }

  if (prov === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + getOKey() },
      body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: mt, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) throw new Error("openai " + r.status);
    const data = await r.json();
    const text: string = data?.choices?.[0]?.message?.content || "";
    const u = data.usage || {};
    void logAIEvent("openai", u.prompt_tokens ?? estTokens(prompt), u.completion_tokens ?? estTokens(text), feature);
    return text;
  }

  throw new Error("no-ai");
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
