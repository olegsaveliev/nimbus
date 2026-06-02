// Nimbus AI proxy (Supabase Edge Function, Deno).
//
// Replaces the prototype's client-side BYOK calls. The Anthropic key lives ONLY
// in this function's environment (set via `supabase secrets set ANTHROPIC_API_KEY=...`)
// and is never shipped to the browser. The client sends a built prompt; we forward
// it to Anthropic, log usage to ai_events (as the calling user, under RLS), and
// return the text + token usage.
//
// Deploy:  supabase functions deploy ai
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          (optional) supabase secrets set AI_MODEL=claude-haiku-4-5

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

interface AiRequest {
  prompt?: string;
  maxTokens?: number;
  feature?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ai-not-configured" }, 503);

  let payload: AiRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad-request" }, 400);
  }
  const prompt = (payload.prompt || "").trim();
  if (!prompt) return json({ error: "empty-prompt" }, 400);
  const maxTokens = Math.min(Math.max(payload.maxTokens || 300, 16), 2048);
  const feature = (payload.feature || "misc").slice(0, 40);
  const model = Deno.env.get("AI_MODEL") || "claude-3-5-haiku-latest";

  // Identify the caller (JWT is verified by the gateway when verify_jwt is on).
  const authHeader = req.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
  } catch {
    return json({ error: "upstream-unreachable" }, 502);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: "upstream-error", status: res.status, detail }, 502);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const usage = data?.usage ?? {};
  const tokensIn = usage.input_tokens ?? Math.ceil(prompt.length / 4);
  const tokensOut = usage.output_tokens ?? Math.ceil(text.length / 4);

  // Best-effort usage logging (RLS inserts the row for the authed user).
  try {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      await supabase.from("ai_events").insert({
        user_id: u.user.id,
        feature,
        provider: "anthropic",
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      });
    }
  } catch {
    // non-fatal
  }

  return json({ text, usage: { input_tokens: tokensIn, output_tokens: tokensOut } });
});
