-- Nimbus schema: boards, columns, categories, tasks (+ subtasks, comments, deps),
-- user preferences, and AI usage events. Every row is scoped to its owner via RLS.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'My Board',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.columns (
  id        uuid primary key default gen_random_uuid(),
  board_id  uuid not null references public.boards (id) on delete cascade,
  key       text not null,
  name      text not null,
  dot       text not null default 'var(--accent)',
  core      boolean not null default false,
  position  int not null default 0,
  unique (board_id, key)
);

create table public.categories (
  id        uuid primary key default gen_random_uuid(),
  board_id  uuid not null references public.boards (id) on delete cascade,
  name      text not null default 'New list',
  color     text not null default '#7c5cff',
  position  int not null default 0
);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references public.boards (id) on delete cascade,
  text         text not null default '',
  status       text not null default 'todo',
  pri          text not null default 'med' check (pri in ('high','med','low')),
  category_id  uuid references public.categories (id) on delete set null,
  due          date,
  est          numeric not null default 0,
  description  text not null default '',
  repeat       text check (repeat in ('none','daily','weekdays','weekly')),
  started_at   date,
  completed_at date,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.subtasks (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references public.tasks (id) on delete cascade,
  text      text not null default '',
  done      boolean not null default false,
  position  int not null default 0
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  author      text not null default 'You',
  body        text not null,
  created_at  timestamptz not null default now()
);

create table public.task_dependencies (
  task_id             uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id  uuid not null references public.tasks (id) on delete cascade,
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create table public.user_preferences (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  theme            int  not null default 6,
  accent           text not null default '#a78bfa',
  radius           int  not null default 18,
  blur             int  not null default 22,
  opacity          numeric not null default 0.42,
  wip_limit        int  not null default 3,
  lane_by          text not null default 'none',
  active_board_id  uuid references public.boards (id) on delete set null,
  updated_at       timestamptz not null default now()
);

create table public.ai_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  feature     text not null default 'misc',
  provider    text not null default 'anthropic',
  tokens_in   int  not null default 0,
  tokens_out  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index boards_user_idx       on public.boards (user_id, position);
create index columns_board_idx     on public.columns (board_id, position);
create index categories_board_idx  on public.categories (board_id, position);
create index tasks_board_idx       on public.tasks (board_id, status, position);
create index subtasks_task_idx     on public.subtasks (task_id, position);
create index comments_task_idx     on public.comments (task_id, created_at);
create index deps_dependson_idx    on public.task_dependencies (depends_on_task_id);
create index ai_events_user_idx    on public.ai_events (user_id, created_at);

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------------------

alter table public.boards            enable row level security;
alter table public.columns           enable row level security;
alter table public.categories        enable row level security;
alter table public.tasks             enable row level security;
alter table public.subtasks          enable row level security;
alter table public.comments          enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.ai_events         enable row level security;

-- Helper: does the current user own this board?
create or replace function public.owns_board(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.boards where id = b and user_id = auth.uid());
$$;

-- Helper: does the current user own the board this task belongs to?
create or replace function public.owns_task(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasks tk
    join public.boards b on b.id = tk.board_id
    where tk.id = t and b.user_id = auth.uid()
  );
$$;

create policy boards_owner on public.boards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy columns_owner on public.columns
  for all using (public.owns_board(board_id)) with check (public.owns_board(board_id));

create policy categories_owner on public.categories
  for all using (public.owns_board(board_id)) with check (public.owns_board(board_id));

create policy tasks_owner on public.tasks
  for all using (public.owns_board(board_id)) with check (public.owns_board(board_id));

create policy subtasks_owner on public.subtasks
  for all using (public.owns_task(task_id)) with check (public.owns_task(task_id));

create policy comments_owner on public.comments
  for all using (public.owns_task(task_id)) with check (public.owns_task(task_id));

create policy deps_owner on public.task_dependencies
  for all using (public.owns_task(task_id)) with check (public.owns_task(task_id) and public.owns_task(depends_on_task_id));

create policy prefs_owner on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_events_owner on public.ai_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Seed a starter board for the current user (called on first login).
-- Creates the three core columns, the default categories, and — when
-- with_samples is true — the README's sample tasks (incl. one dependency).
-- ----------------------------------------------------------------------------

create or replace function public.seed_starter_board(with_samples boolean default true)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_board uuid;
  c_work uuid; c_personal uuid; c_health uuid; c_shopping uuid;
  t_proposal uuid; t_feedback uuid;
begin
  insert into public.boards (user_id, name, position)
    values (auth.uid(), 'My Board', 0)
    returning id into v_board;

  insert into public.columns (board_id, key, name, dot, core, position) values
    (v_board, 'todo',  'To Do',       'var(--accent)', true, 0),
    (v_board, 'doing', 'In Progress', '#f5a623',       true, 1),
    (v_board, 'done',  'Done',        '#38c172',       true, 2);

  insert into public.categories (board_id, name, color, position) values
    (v_board, 'Work',     '#7c5cff', 0) returning id into c_work;
  insert into public.categories (board_id, name, color, position) values
    (v_board, 'Personal', '#ff6b9d', 1) returning id into c_personal;
  insert into public.categories (board_id, name, color, position) values
    (v_board, 'Health',   '#22d3ee', 2) returning id into c_health;
  insert into public.categories (board_id, name, color, position) values
    (v_board, 'Shopping', '#fb923c', 3) returning id into c_shopping;

  insert into public.user_preferences (user_id, active_board_id)
    values (auth.uid(), v_board)
    on conflict (user_id) do update set active_board_id = excluded.active_board_id;

  if not with_samples then
    return v_board;
  end if;

  insert into public.tasks (board_id, text, status, pri, category_id, due, est, description, position)
    values (v_board, 'Send the Q3 proposal to Maya', 'todo', 'high', c_work, current_date, 2,
      'Final numbers from finance are in. Pull the latest deck, swap in the Q3 figures, and write a short cover note before sending to Maya for sign-off.', 0)
    returning id into t_proposal;
  insert into public.subtasks (task_id, text, done, position) values
    (t_proposal, 'Pull the latest figures from finance', true, 0),
    (t_proposal, 'Swap Q3 numbers into slides 3–5', false, 1),
    (t_proposal, 'Write a short cover note', false, 2);
  insert into public.comments (task_id, author, body) values
    (t_proposal, 'Maya R.', 'Can we add the regional breakdown to slide 4? Leadership will ask.'),
    (t_proposal, 'You', 'Good call — adding it now. Should have a draft over by end of day.');

  insert into public.tasks (board_id, text, status, pri, category_id, due, description, position)
    values (v_board, 'Revise the design feedback thread', 'doing', 'med', c_work, current_date + 1,
      'Address the comments on spacing and the empty states.', 1)
    returning id into t_feedback;

  -- the proposal is blocked by the feedback revision
  insert into public.task_dependencies (task_id, depends_on_task_id) values (t_proposal, t_feedback);
  update public.tasks set est = 1 where id = t_feedback;

  insert into public.tasks (board_id, text, status, pri, category_id, due, position) values
    (v_board, 'Book dentist appointment', 'todo', 'med', c_health, current_date - 1, 2),
    (v_board, 'Draft birthday plans for Sam', 'todo', 'med', c_personal, current_date + 4, 3);

  insert into public.tasks (board_id, text, status, pri, category_id, due, repeat, position) values
    (v_board, '30-min evening walk', 'doing', 'low', c_health, current_date, 'daily', 4);

  insert into public.tasks (board_id, text, status, pri, category_id, due, completed_at, position) values
    (v_board, 'Pick up oat milk & lemons', 'done', 'low', c_shopping, current_date - 1, current_date, 5),
    (v_board, 'Renew gym membership', 'done', 'med', c_health, current_date - 2, current_date - 1, 6);

  return v_board;
end;
$$;

-- Create an additional empty board (default columns + categories, no tasks).
create or replace function public.new_board(p_name text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_board uuid;
  v_pos int;
begin
  select coalesce(max(position), -1) + 1 into v_pos from public.boards where user_id = auth.uid();

  insert into public.boards (user_id, name, position)
    values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'New board'), v_pos)
    returning id into v_board;

  insert into public.columns (board_id, key, name, dot, core, position) values
    (v_board, 'todo',  'To Do',       'var(--accent)', true, 0),
    (v_board, 'doing', 'In Progress', '#f5a623',       true, 1),
    (v_board, 'done',  'Done',        '#38c172',       true, 2);

  insert into public.categories (board_id, name, color, position) values
    (v_board, 'Work',     '#7c5cff', 0),
    (v_board, 'Personal', '#ff6b9d', 1),
    (v_board, 'Health',   '#22d3ee', 2),
    (v_board, 'Shopping', '#fb923c', 3);

  return v_board;
end;
$$;
