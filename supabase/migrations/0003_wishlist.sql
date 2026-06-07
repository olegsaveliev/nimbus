-- Wishlist: a per-user space for things to buy / goals / experiences, with money
-- tracked toward each one. Unlike tasks, wishes are NOT board-scoped — the
-- Wishlist is a single personal space, so each row is owned directly by a user.
-- The list organizes itself into buckets from `stage` + saved/price (client-side).

create table public.wishes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default '',
  type        text not null default 'buy'     check (type in ('buy','goal','exp')),
  price       numeric,                          -- nullable: "no price yet"
  saved       numeric not null default 0,
  pri         text not null default 'med'      check (pri in ('high','med','low')),
  -- `where` is a SQL keyword; store the source/store as where_at.
  where_at    text not null default '',
  link        text not null default '',
  note        text not null default '',
  target      text not null default '',         -- freeform, e.g. "Oct 2026"
  stage       text not null default 'wishing'  check (stage in ('wishing','saving','ready','got')),
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index wishes_user_idx on public.wishes (user_id, position);

alter table public.wishes enable row level security;

create policy wishes_owner on public.wishes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
