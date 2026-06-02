# Nimbus

A glassy, single-user Kanban task board — React + TypeScript + Vite, backed by Supabase (Postgres + Auth + Edge Functions). Rebuilt from the high-fidelity design handoff; the visual system is ported verbatim and the monolithic prototype is split into real components, a typed data layer, and pure domain logic.

## Stack

- **React 18 + TypeScript + Vite** (SWC)
- **Supabase** — Postgres (Row-Level Security), Auth, one Edge Function for the AI proxy
- **TanStack Query** — server state + optimistic updates
- **Zustand** — ephemeral UI/session state (open modal, drag, filters, background Pomodoro)
- CSS is a single global stylesheet (`src/styles/nimbus.css`) ported from the design — **the source of truth for the look.** No Tailwind.

## Project layout

```
src/
  domain/      pure, framework-free logic (dates, deps, quickAdd, brief, reports, themes, …)
  data/        TanStack Query hooks + Supabase repo (boards, board controller, prefs, aiUsage)
  services/    ai.ts — client wrapper for the Edge Function (no keys in the browser)
  state/       uiStore.ts (Zustand)
  hooks/       usePomodoro, useHotkeys
  components/  icons, common, auth, topbar, board, views, modals
  App.tsx      authed shell wiring everything together
supabase/
  migrations/0001_init.sql   tables + RLS + seed functions
  functions/ai/index.ts      AI proxy (server-side Anthropic key)
```

## Data model (Postgres)

`boards` → `columns`, `categories`, `tasks` → `subtasks`, `comments`, `task_dependencies`; plus `user_preferences` and `ai_events`. Every row is scoped to its owner via RLS (`owns_board` / `owns_task` helpers). The client works with a denormalised `Task` (subtasks/comments/deps embedded) assembled by `src/data/mapping.ts`.

## Setup

1. **Create a Supabase project**, then copy your credentials:
   ```bash
   cp .env.example .env.local
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

2. **Apply the schema** (Supabase CLI):
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```

3. **Enable auth providers** in the Supabase dashboard:
   - Email/password (for sign-up / sign-in)
   - Anonymous sign-ins (for the "Continue with a demo account" button)

4. **Deploy the AI proxy** and set its secret (the Anthropic key never reaches the client):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # optional: supabase secrets set AI_MODEL=claude-haiku-4-5
   supabase functions deploy ai
   ```

5. **Run it:**
   ```bash
   npm install
   npm run dev
   ```

On first login a starter board is seeded (3 core columns, default categories, sample tasks) via the `seed_starter_board` RPC.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run typecheck` — types only
- `npm run lint` — ESLint (if configured)

## Notes vs. the prototype

- **Auth** replaces the localStorage login gate with Supabase Auth.
- **Persistence** replaces all localStorage keys with Postgres tables + preferences.
- **AI** is server-side: every feature calls the `ai` Edge Function instead of shipping BYOK keys. Usage is logged to `ai_events` and surfaced in Reports.
- **Reports** metrics (velocity, cycle time, on-time rate) are computed from real `completed_at` / `started_at` / `due` data rather than the prototype's seeded `HISTORY` array.
