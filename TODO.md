# Nimbus — TODO / deferred

Things intentionally skipped for now. Safe to launch without these; revisit when convenient.

## 🔒 Lock the AI function's CORS to our domain (optional, security hardening)

**Why:** the `ai` Edge Function currently allows calls from *any* website (`Access-Control-Allow-Origin: "*"`). The login requirement (`verify_jwt = true`) is the real protection, so this is defense-in-depth — it stops another website, opened in a logged-in user's browser, from quietly calling our AI endpoint (and burning Anthropic budget) using that user's session. Not urgent for a small/personal app.

**How (≈5 min):**
1. In [`supabase/functions/ai/index.ts`](supabase/functions/ai/index.ts), replace the hardcoded `"Access-Control-Allow-Origin": "*"` with an allowlist driven by an env var, e.g.:
   ```ts
   const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
   const origin = req.headers.get("Origin") ?? "";
   const allowOrigin = ALLOWED.includes(origin) ? origin : ALLOWED[0] || "";
   const CORS = {
     "Access-Control-Allow-Origin": allowOrigin,
     "Vary": "Origin",
     /* ...rest unchanged... */
   };
   ```
2. Set the allowed origins (include the prod domain; add localhost only if the prod function is ever called from dev):
   ```bash
   supabase secrets set ALLOWED_ORIGINS="https://YOUR-DOMAIN.com,https://nimbus.vercel.app"
   ```
3. Redeploy: `supabase functions deploy ai`

**Caveat:** a single fixed origin will block Vercel **preview** deploys (`*-git-*.vercel.app`). If we want previews to hit the prod function, list them too — or just rely on dev mock mode for previews.

---

## Other deferred / nice-to-have

- [ ] **Decide email confirmation** in Supabase Auth (off = instant signups; on = needs SMTP + users confirm before the board opens). See [DEPLOY.md](DEPLOY.md).
- [ ] **Prune anonymous/demo users** periodically (or disable Anonymous sign-ins) — the "demo account" button creates real `auth.users` rows that accumulate.
- [ ] **Remove the dev error overlay** in [`index.html`](index.html) before final polish (it's harmless — only shows on uncaught errors — but it's a dev aid).
- [ ] **Code-split the bundle** — the JS chunk is ~520 kB; lazy-loading the modals would trim it. (Build warns about >500 kB; cosmetic.)
- [ ] **Add unit tests** for the pure domain logic in `src/domain/` (deps, quickAdd parsing, brief, reports).
- [ ] **Smoke-test against a live Supabase project** — the app is type-checked + builds + runs in mock mode, but the real auth/RLS/AI path hasn't been exercised end-to-end yet.
