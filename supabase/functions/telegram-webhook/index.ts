/* Telegram bot webhook: turns messages into tasks on the sender's board.
 *
 *   "Email Maya tomorrow #Work !high"  →  task in To Do, due tomorrow, Work, high
 *
 * Linking: the app's Settings generates a one-time code (telegram_links.link_code);
 * the user sends `/start CODE` to the bot and this function binds their chat_id.
 * Runs with the service role (RLS bypassed) — safe because the user identity is
 * derived from the verified chat link, never from message content.
 *
 * Required secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
 * See README.md next to this file for full setup.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function reply(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

/* ---- quick-add parsing (port of src/domain/quickAdd.ts; dates are UTC) ---- */

const DAY = 86400000;
const WD_NAMES: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface Parsed {
  text: string;
  pri: "high" | "med" | "low" | null;
  cat: { id: string; name: string } | null;
  due: string | null;
}

function parseQuickAdd(raw: string, cats: Array<{ id: string; name: string }>): Parsed {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let text = " " + (raw || "") + " ";
  let pri: Parsed["pri"] = null;
  let cat: Parsed["cat"] = null;
  let due: string | null = null;

  text = text.replace(/\s!(high|h|med|medium|m|low|l)\b/i, (_m, p: string) => {
    p = p.toLowerCase();
    pri = p[0] === "h" ? "high" : p[0] === "l" ? "low" : "med";
    return " ";
  });
  text = text.replace(/\s#([\p{L}][\p{L}\d_-]*)/u, (m, name: string) => {
    const n = name.toLowerCase();
    const f = cats.find((c) => c.name.toLowerCase() === n) || cats.find((c) => c.name.toLowerCase().startsWith(n));
    if (f) {
      cat = f;
      return " ";
    }
    return m;
  });

  const setDue = (off: number) => {
    due = isoDate(new Date(today.getTime() + off * DAY));
  };
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\b(today|tdy)\b/i))) {
    setDue(0);
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\b(tomorrow|tmrw|tmr|tom)\b/i))) {
    setDue(1);
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\bin\s+(\d{1,2})\s*(?:d|days?)\b/i))) {
    setDue(parseInt(m[1], 10));
    text = text.replace(m[0], " ");
  } else if ((m = text.match(/\bnext\s+week\b/i))) {
    setDue(7);
    text = text.replace(m[0], " ");
  } else if (
    (m = text.match(
      /\b(sunday|saturday|monday|tuesday|wednesday|thursday|friday|sun|mon|tues|tue|weds|wed|thurs|thur|thu|fri|sat)\b/i,
    ))
  ) {
    const tgt = WD_NAMES[m[1].toLowerCase()];
    const diff = (tgt - today.getUTCDay() + 7) % 7;
    setDue(diff);
    text = text.replace(m[0], " ");
  }
  text = text.replace(/\s+/g, " ").trim();
  return { text, pri, cat, due };
}

/* ---- link & insert ---- */

const HELP =
  'Send me a task and it lands in your To Do column. I understand:\n' +
  '  "Email Maya tomorrow #Work !high"\n' +
  "  !high / !med / !low — priority\n" +
  "  #Work — category\n" +
  "  today · tomorrow · friday · in 3 days · next week — due date\n\n" +
  "To connect your account: Nimbus → Settings → Telegram → send me the /start code.";

async function handleStart(chatId: number, code: string | undefined): Promise<void> {
  if (!code) {
    await reply(chatId, HELP);
    return;
  }
  // One chat = one account: free this chat_id from any previous link first.
  await db.from("telegram_links").update({ chat_id: null, linked_at: null }).eq("chat_id", chatId);
  const { data, error } = await db
    .from("telegram_links")
    .update({ chat_id: chatId, linked_at: new Date().toISOString(), link_code: null })
    .eq("link_code", code)
    .select("user_id");
  if (error || !data || data.length === 0) {
    await reply(chatId, "That code wasn't recognized. Generate a fresh one in Nimbus → Settings → Telegram.");
    return;
  }
  await reply(chatId, "Connected ✓ — send me a task any time and it'll appear in your To Do column.");
}

async function handleTask(chatId: number, text: string): Promise<void> {
  const { data: link } = await db.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
  if (!link) {
    await reply(chatId, "This chat isn't connected yet. Open Nimbus → Settings → Telegram and send me the /start code.");
    return;
  }

  // Target board: the user's active board, falling back to their first board.
  const { data: prefs } = await db
    .from("user_preferences")
    .select("active_board_id")
    .eq("user_id", link.user_id)
    .maybeSingle();
  let boardId = prefs?.active_board_id ?? null;
  let boardName = "";
  if (boardId) {
    const { data: b } = await db.from("boards").select("id, name").eq("id", boardId).maybeSingle();
    boardId = b?.id ?? null;
    boardName = b?.name ?? "";
  }
  if (!boardId) {
    const { data: b } = await db
      .from("boards")
      .select("id, name")
      .eq("user_id", link.user_id)
      .order("position")
      .limit(1)
      .maybeSingle();
    boardId = b?.id ?? null;
    boardName = b?.name ?? "";
  }
  if (!boardId) {
    await reply(chatId, "Couldn't find a board on your account — open Nimbus once to create one.");
    return;
  }

  const { data: cats } = await db.from("categories").select("id, name").eq("board_id", boardId);
  const p = parseQuickAdd(text, cats ?? []);
  if (!p.text) {
    await reply(chatId, "I couldn't find any task text in that. " + HELP);
    return;
  }

  const { data: last } = await db
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("tasks").insert({
    board_id: boardId,
    text: p.text,
    status: "todo",
    pri: p.pri ?? "med",
    category_id: p.cat?.id ?? null,
    due: p.due,
    position: (last?.position ?? -1) + 1,
  });
  if (error) {
    await reply(chatId, "Something went wrong saving that — try again in a moment.");
    return;
  }

  const bits = [p.due ? "due " + p.due : null, p.pri ? "!" + p.pri : null, p.cat ? "#" + p.cat.name : null]
    .filter(Boolean)
    .join(" · ");
  await reply(chatId, `Added to ${boardName || "your board"} ✓ “${p.text}”${bits ? "  (" + bits + ")" : ""}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== TG_SECRET) {
    return new Response("forbidden", { status: 401 });
  }

  let update: { message?: { text?: string; chat?: { id?: number } } };
  try {
    update = await req.json();
  } catch {
    return new Response("ok", { status: 200 });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  // Always 200 below this point — Telegram re-delivers anything else forever.
  if (!chatId || !text) return new Response("ok", { status: 200 });

  try {
    if (/^\/start\b/.test(text)) await handleStart(chatId, text.split(/\s+/)[1]);
    else if (/^\/help\b/.test(text)) await reply(chatId, HELP);
    else await handleTask(chatId, text);
  } catch (e) {
    console.error("telegram-webhook:", e);
  }
  return new Response("ok", { status: 200 });
});
