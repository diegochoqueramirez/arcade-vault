# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Early stage — currently the Create Next App scaffold.

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

- Clients in `app/lib/supabase/` (`@supabase/ssr` + `@supabase/supabase-js`): `server.ts` (`server-only`, async `createClient()` with `cookies()` — not inside `"use cache"`; wrap in `<Suspense>`) for Server Components/Route Handlers; `client.ts` (`"use client"`) for Client Components. Never import server from client or vice versa.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`), read via `getSupabaseEnv()` in `env.ts` (throws if missing). No service role key yet.
- Health check: `GET /api/health/supabase` → 200 `{ ok: true }` / 500 `{ ok: false, error: "unavailable" }`.
- Migrations: SQL files in `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, applied to the remote project via Supabase MCP `apply_migration`. No local CLI/Docker.
- Types: `app/lib/supabase/database.types.ts` is generated (MCP `generate_typescript_types`) — never edit by hand; regenerate after every schema change.
- Failures are explicit (throw / 500); no fallback to `app/data/` mock data.
