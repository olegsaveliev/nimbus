-- Connect codes expire 15 minutes after issue; track when each was generated.
-- (Rows created before this migration have null = already expired.)
alter table public.telegram_links
  add column code_issued_at timestamptz;
