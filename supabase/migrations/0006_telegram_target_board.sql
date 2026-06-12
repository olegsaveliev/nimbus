-- Per-chat board override for Telegram capture: /board <name> pins tasks to a
-- specific board; null falls back to the user's active board.
alter table public.telegram_links
  add column target_board_id uuid references public.boards (id) on delete set null;
