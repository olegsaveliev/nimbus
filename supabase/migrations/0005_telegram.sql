-- Telegram bot linking: one row per user. The app (RLS owner) creates a one-time
-- link code from Settings; the telegram-webhook edge function (service role)
-- redeems the code via /start and from then on maps chat_id → user.

create table public.telegram_links (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  chat_id    bigint unique,
  link_code  text unique,
  linked_at  timestamptz,
  created_at timestamptz not null default now()
);

alter table public.telegram_links enable row level security;

create policy telegram_links_owner on public.telegram_links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
