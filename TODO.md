# Nimbus — TODO / deferred

Things intentionally skipped for now. Safe to launch without these; revisit when convenient.

## 🔑 AI is BYOK / client-side — revisit if going multi-user

**Current:** AI calls Anthropic/OpenAI **directly from the browser** with a key the user pastes into Settings (stored in their localStorage). This is the right call for a personal/solo tool — simple, no server, no shared key.

**If Nimbus ever opens to other people**, switch AI back to a **server-side proxy** so you're not asking strangers to paste API keys into a shared app, and so one key (yours) isn't exposed client-side. That means:
- re-add a Supabase Edge Function (`supabase/functions/ai`) that holds the key as a secret and forwards to Anthropic,
- point `src/services/ai.ts` at `supabase.functions.invoke("ai", …)` instead of `fetch`-ing the provider directly,
- (and then the old "lock CORS to our domain" hardening becomes relevant again).

Not needed while it's just you.

---

## Other deferred / nice-to-have

- [ ] **Decide email confirmation** in Supabase Auth (off = instant signups; on = needs SMTP + users confirm before the board opens). See [DEPLOY.md](DEPLOY.md).
- [ ] **Prune anonymous/demo users** periodically (or disable Anonymous sign-ins) — the "demo account" button creates real `auth.users` rows that accumulate.
- [ ] **Remove the dev error overlay** in [`index.html`](index.html) before final polish (it's harmless — only shows on uncaught errors — but it's a dev aid).
- [ ] **Code-split the bundle** — the JS chunk is ~520 kB; lazy-loading the modals would trim it. (Build warns about >500 kB; cosmetic.)
- [ ] **Add unit tests** for the pure domain logic in `src/domain/` (deps, quickAdd parsing, brief, reports).
- [ ] **Smoke-test against a live Supabase project** — the app is type-checked + builds + runs in mock mode, but the real auth/RLS/AI path hasn't been exercised end-to-end yet.
