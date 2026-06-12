/* Telegram link management for Settings. The row itself is owner-scoped via RLS;
 * the webhook edge function (service role) is the only other writer. */
import { supabase } from "@/lib/supabase";

export interface TelegramLink {
  linked: boolean;
  code: string | null;
}

export async function fetchTelegramLink(): Promise<TelegramLink> {
  const { data, error } = await supabase.from("telegram_links").select("chat_id, link_code").maybeSingle();
  if (error) throw error;
  return { linked: data?.chat_id != null, code: data?.link_code ?? null };
}

/** Create (or rotate) the one-time connect code shown in Settings. */
export async function createTelegramCode(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not signed in");
  // No ambiguous characters — the user may have to type this on a phone.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alphabet[b % alphabet.length]).join("");
  const { error } = await supabase
    .from("telegram_links")
    .upsert({ user_id: uid, link_code: code, chat_id: null, linked_at: null });
  if (error) throw error;
  return code;
}

export async function disconnectTelegram(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  const { error } = await supabase.from("telegram_links").delete().eq("user_id", uid);
  if (error) throw error;
}
