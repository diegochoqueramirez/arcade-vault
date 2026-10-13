# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Catalog and leaderboards come from Supabase; Asteroids is the only real game.

Workflow is Spec Driven Design via `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install: `npx skills@latest add Klerith/fernando-skills`). Follow those skills' conventions when planning/implementing features.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- No test runner configured yet.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

## Stack / architecture

- Next.js 16.4 (App Router, `app/`), React 19.3, TypeScript strict. Path alias `@/*` → repo root.
- **Next 16 differs from training data** — check `node_modules/next/dist/docs/` before using any Next API.
- `next.config.ts` enables `cacheComponents` (Cache Components / PPR model — data fetching must respect `"use cache"` / Suspense boundaries), `partialPrefetching`, and `experimental.agentFeedback`.
- Tailwind CSS v4 loaded through a Turbopack rule (`@tailwindcss/turbopack` loader on `*.css`), not PostCSS. Theme tokens defined in `app/globals.css` via `@theme inline` (CSS variables, dark mode via `prefers-color-scheme`).
- Layouts use generated global types like `LayoutProps<"/">` (from `.next/types`, produced by `next dev`/`build`).

## Supabase

- Clients in `app/lib/supabase/` (`@supabase/ssr` + `@supabase/supabase-js`): `server.ts` (`server-only`, async `createClient()` with `cookies()` — not inside `"use cache"`; wrap in `<Suspense>`) for Server Components/Route Handlers; `client.ts` (`"use client"`) for Client Components; `public.ts` (`server-only`, `createPublicClient()`, no cookies, anon role) for cacheable reads and Server Actions — only imported by `app/data/catalog.server.ts` and `app/actions/*`. Never import server from client or vice versa.
- Tables (SPEC 06): `games` (read-only; today only `asteroids`), `scores` (`game_id`, `player_name` `^[A-Z0-9_]{1,12}$`, `score` 0–9,999,999, `user_id` nullable, always null for now), view `game_stats` (`games` + `best = max(score)`, `security_invoker`).
- No RLS (explicitly disabled; the project has an event trigger `rls_auto_enable` that turns it on for new tables). Protection is grants: `anon`/`authenticated` get `SELECT` on `games`/`scores`/`game_stats` and column-level `INSERT (game_id, player_name, score)` on `scores`. New tables must `revoke all` + explicit grants in their migration.
- Data access: `app/data/catalog.ts` (types `Game`, `ScoreEntry`, `CATEGORIES`; client-safe) and `app/data/catalog.server.ts` (`getGames`, `getGameById`, `getLeaderboard(gameId, limit)`; `"use cache"`). Cache tags: `games`, `scores` (game reads also tag `scores` because `best` derives from it). `app/data/games.ts` / `scores.ts` are reference-only mock data (not imported); `activity.ts` is still mock.
- Writes: Server Action `saveScore` in `app/actions/scores.ts` (validates, inserts, `updateTag("scores")`; only `asteroids`). SQL changes made outside the action (MCP, dashboard) don't invalidate the cache — restart `next dev`.
- `npm run build` needs Supabase reachable (prerender + `generateStaticParams` read `games`).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`), read via `getSupabaseEnv()` in `env.ts` (throws if missing). No service role key yet.
- Health check: `GET /api/health/supabase` → 200 `{ ok: true }` / 500 `{ ok: false, error: "unavailable" }`.
- Migrations: SQL files in `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, applied to the remote project via Supabase MCP `apply_migration`. No local CLI/Docker.
- Types: `app/lib/supabase/database.types.ts` is generated (MCP `generate_typescript_types`) — never edit by hand; regenerate after every schema change.
- Failures are explicit (throw / 500); no fallback to `app/data/` mock data.
