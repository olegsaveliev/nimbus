-- Track Wishlist sample-seeding per *account* instead of per-browser.
--
-- The sample wishes are inserted once when a user first opens an empty Wishlist.
-- Previously "already seeded" was remembered in the browser's localStorage, which
-- doesn't sync — so deleting all the samples and then opening the app on another
-- device would re-insert them. Persisting the flag on the user's preferences row
-- makes the memory follow the account across browsers/devices.
--
-- Additive and safe: a single boolean column with a default; no data is changed.

alter table public.user_preferences
  add column if not exists wishlist_seeded boolean not null default false;
