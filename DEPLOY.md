# Deploying Nimbus to production

Nimbus has **two** deploy targets:

| Piece | Hosted on | What it is |
|---|---|---|
| Frontend (this Vite app) | **Vercel** | static SPA build (`dist/`) |
| Database + Auth + AI proxy | **Supabase** | Postgres + RLS, Auth, the `ai` Edge Function |

Vercel only serves static files — it does **not** run the database or the AI function. Those live on Supabase. You connect the two with environment variables.

---

## 1. Supabase (the backend) — do this first

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine). Pick a region near your users.

2. **Grab your API credentials** — Project Settings → API:
   - `Project URL` → becomes `VITE_SUPABASE_URL`
   - `anon` `public` key → becomes `VITE_SUPABASE_ANON_KEY`
   (The anon key is safe to expose in the browser; Row-Level Security is what protects data.)

3. **Apply the schema.** With the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push          # runs supabase/migrations/0001_init.sql
   ```
   (No CLI? Paste the contents of `supabase/migrations/0001_init.sql` into the dashboard SQL Editor and run it.)

4. **Enable auth providers** — Authentication → Providers / Sign In:
   - **Email** — for sign-up / sign-in.
     - For a smooth launch, you can turn **off** "Confirm email" (Authentication → Providers → Email) so accounts work immediately. If you leave it **on**, you must configure SMTP and users will need to confirm before the board opens.
   - **Anonymous sign-ins** — required for the "Continue with a demo account" button (Authentication → Sign In / Providers → enable Anonymous). Skip if you don't want a demo button.

5. **Set the Site URL** — Authentication → URL Configuration → set **Site URL** to your Vercel domain (e.g. `https://nimbus.vercel.app`) and add it to **Redirect URLs**.

6. **Deploy the AI proxy + its secret** (the Anthropic key lives only here, never in the browser):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # optional, to use a newer/cheaper model:
   # supabase secrets set AI_MODEL=claude-haiku-4-5
   supabase functions deploy ai
   ```
   The client calls this function with the logged-in user's JWT automatically (`verify_jwt = true` in `supabase/config.toml`).

---

## 2. Vercel (the frontend)

1. **Push the repo to GitHub** (or GitLab/Bitbucket).

2. **Import it in Vercel** → "Add New… → Project" → pick the repo.
   Vercel auto-detects Vite (`vercel.json` in the repo pins it: build `npm run build`, output `dist`, SPA rewrite).

3. **Add Environment Variables** (Project → Settings → Environment Variables) for **Production** *and* **Preview**:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon key |

   > Vite inlines `VITE_`-prefixed vars **at build time**, so after changing them you must **redeploy**.
   >
   > ⚠️ Never add `ANTHROPIC_API_KEY` here — anything `VITE_`/client-side is public. It belongs only in Supabase function secrets (step 1.6).

4. **Deploy.** Vercel builds and serves the SPA. Open the URL and sign up.

---

## 3. Verify

- The app should show the **login screen** (not the demo board). If you see seeded demo cards with no sign-in, your env vars didn't reach the build → re-check them and redeploy.
- Create an account → you should get a freshly seeded starter board.
- Open the **Brief** or a card's **Improve** → the AI should respond (confirms the Edge Function + secret are live). If AI says "isn't available", check `supabase functions logs ai` and that the secret is set.

---

## Notes & gotchas

- **Demo mode only exists in `npm run dev`.** A production build with missing env vars now fails loudly instead of silently using localStorage (see `src/lib/supabase.ts`).
- **CORS:** the `ai` function currently allows all origins (`Access-Control-Allow-Origin: *`). To lock it to your domain, edit the `CORS` headers in `supabase/functions/ai/index.ts` and redeploy.
- **Anonymous/demo users** accumulate in `auth.users`. If you keep the demo button, periodically prune them (or disable Anonymous sign-ins for a stricter prod).
- **Custom domain:** add it in Vercel → Domains, then update Supabase **Site URL / Redirect URLs** to match.
- **Costs:** Vercel Hobby + Supabase Free tiers cover a personal deployment; the only metered external cost is Anthropic API usage (tracked in the Reports → AI usage card).
