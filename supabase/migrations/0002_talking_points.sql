-- Talking Points: a per-board, pinned list of one-line notes to raise with a
-- client (or in any meeting). Each point is either sourced from a card
-- (task_id set) or typed by hand (task_id null). Deleting the source card keeps
-- the point — task_id is simply set null, and it degrades to a standalone note.

create table public.talking_points (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  text        text not null default '',
  task_id     uuid references public.tasks (id) on delete set null,
  done        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create index talking_points_board_idx on public.talking_points (board_id, position);

alter table public.talking_points enable row level security;

create policy talking_points_owner on public.talking_points
  for all using (public.owns_board(board_id)) with check (public.owns_board(board_id));
