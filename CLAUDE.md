# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for highest score. Catalog and leaderboards come from Supabase; playable games: Asteroids (SPEC 05), Tetris (SPEC 07), Arkanoid (SPEC 08) and Snake (SPEC 09).

Workflow is Spec Driven Design via `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install: `npx skills@latest add Klerith/fernando-skills`). Follow those skills' conventions when planning/implementing features.

Specs in `specs/NN-name.md` (Spanish, header `> **Estado:**`), all `Implementado`: 01 MVP visual screens, 02 landing, 03 about + contact, 04 Supabase base, 05 Asteroids, 06 `games`/`scores` tables + leaderboard, 07 Tetris (+ generic registry), 08 Arkanoid, 09 Snake. One branch `spec-NN-<slug>` + PR per spec.

UI language is Spanish (`<html lang="es">`); code/identifiers in English.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- No test runner configured yet.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

## Agents

Subagents in `.claude/agents/` (one `.md` each, Spanish prompt).

- `game-planner` — plans/decides which new game fits the platform. Reads `references/implemented-games.md`, starter games, source assets, game contract (`app/lib/games/types.ts`), `CATEGORIES`; scores candidates 1–5 on 6 criteria (/30): retro aesthetic, keyboard + canvas, single numeric score for leaderboard, category diversity, effort, competitive replayability. Outputs 1–3 candidates + recommendation + `implemented-games.md`-style row + next step (`/spec` → `/spec-impl`). No code/specs. Tools: Read, Glob, Grep, Write, Edit; model opus.
- Memory: `references/game-suggestions-todo.md` (git-versioned, shared by team) — read before suggesting (no repeats), updated after every run. Sections: Pendientes (`- [ ]`, sorted by score), Aceptados, Descartados (with reason + date), Implementados (`- [x]`). Only file the agent may modify. When a game ships, its id moves to Implementados.
- `game-jam` — user provides the game to implement (agent never picks it); validates input (missing game, already in `specs/game-jam/`, fails keyboard/canvas/score filter → stops without writing); creates `specs/game-jam/<game-id>/` with ≥2 complete phase specs (`01-nucleo-jugable.md`, `02-progresion.md`, optional `03-pulido.md`; state `Borrador`, same format as SPEC 07–09). Only knows existing games via `specs/game-jam/` (no repeated id or game); ignores platform games; doesn't read/write `game-planner`'s todo; only writes inside its folder. Tools: Read, Glob, Grep, Write; model opus.

## Stack / architecture

- Next.js 16.4 (App Router, `app/`), React 19.3, TypeScript strict. Path alias `@/*` → repo root.
- **Next 16 differs from training data** — check `node_modules/next/dist/docs/` before using any Next API.
- `next.config.ts` enables `cacheComponents` (Cache Components / PPR model — data fetching must respect `"use cache"` / Suspense boundaries), `partialPrefetching`, and `experimental.agentFeedback`.
- Tailwind CSS v4 loaded through a Turbopack rule (`@tailwindcss/turbopack` loader on `*.css`), not PostCSS. Theme tokens defined in `app/globals.css` via `@theme inline` (CSS variables, dark mode via `prefers-color-scheme`).
- Layouts use generated global types like `LayoutProps<"/">` / `PageProps<"/games/[id]/play">` (from `.next/types`, produced by `next dev`/`build`).
- Root layout: fonts `Press_Start_2P`, `JetBrains_Mono`, `Courier_Prime` (`next/font/google`, CSS vars `--font-*`), background layers `.av-bg`/`.av-noise`, `Nav` + `main.av-main` + `Footer`. Retro styles mostly in `app/globals.css` classes (ported from `references/templates/styles.css`).
- Deps beyond Next/React: `@supabase/ssr`, `@supabase/supabase-js`, `resend`.

## Routes

- Valid `[id]` values = games listed in `references/implemented-games.md` (read it instead of the DB).
- `/` — landing (`Home` + `RevealObserver` scroll reveals): featured games from Supabase + activity (recent scores / top players) still mock from `app/data/activity.ts`.
- `/games` — library (`Library`: search, category chips, `GameCard` grid with 3D tilt). To know which games it lists (id, title, category, short description, color), read `references/implemented-games.md` — don't query the DB.
- `/games/[id]` — game detail + `Leaderboard`; `/games/[id]/play` — `GamePlayer` (canvas + HUD + save-score form). Both use `generateStaticParams` from `getGames()` and read `params` inside `<Suspense fallback={<ScreenLoading />}>` (keeps App Shell URL-agnostic for Partial Prefetching); unknown id → `notFound()`.
- `/hall-of-fame` — `HallOfFame`, top 12 per game (`getLeaderboard(id, 12)`).
- `/about` — `About` + `ContactForm` → `POST /api/contact`.
- `/login` — `AuthForm`, visual only (no real auth; submit redirects to `/games`).
- `app/not-found.tsx` — custom 404.
- UI components live flat in `app/components/` (Server by default; `"use client"` only where needed). Design reference: `references/templates/` (original JSX/HTML mockups, never modified).

## Contact (SPEC 03)

- `app/api/contact/route.ts`: validates `name` ≤60, `email` ≤254 + regex, `msg` ≤2000; honeypot `website` (filled → fake `{ ok: true }`). Responses: `{ ok: true }` / 400 `{ ok:false, error:"invalid", fields }` / 500 `{ ok:false, error:"send_failed" }`.
- Sends via Resend; env `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (missing → 500 + `console.error`).

## Games

- **Implemented games list: read `references/implemented-games.md`** (id, name, category, short description, color) — don't query Supabase to find out which games exist. Update that file whenever a game is added.
- Engines in `app/lib/games/<id>/` (`constants.ts`, `entities.ts`, `engine.ts`), ported from `references/starter-games/` (never modified); exception: Snake is an original engine (no starter game) using sprites from `references/source-assets/snake-assets/`. Factory `create<Game>Game(canvas, callbacks): GameEngine`; all mutable state in the closure, rAF loop, keyboard on `window`, `destroy()` removes everything.
- Assets (sprites, sounds) copied to `public/games/<id>/` and loaded by the factory from `/games/<id>/...` (Arkanoid: sprites + sounds; Snake: `fruits.png` only).
- Contract in `app/lib/games/types.ts` (`GameSnapshot`, `GameCallbacks`, `GameEngine`, `GameFactory`). Snapshot: `score`, `paused`, optional `lives`/`level` (HUD hides them when undefined), `extra` label/value pairs.
- `app/lib/games/registry.ts` (client): `GAME_ENGINES` id → `{ create, width, height }`; `GamePlayer` mounts `GameCanvas` when the id is registered, placeholder otherwise.
- `app/lib/games/playable.ts` (no deps): `PLAYABLE_GAMES` + `isPlayable()`, used by `saveScore`.
- Adding a game = engine + `GAME_ENGINES` entry + id in `PLAYABLE_GAMES` + seed migration in `games` + row in `references/implemented-games.md` (see `/nuevo-juego` skill in `.claude/skills/nuevo-juego/SKILL.md`).
- Choosing the next game: subagent `game-planner` (see Agents).

## Supabase

- Clients in `app/lib/supabase/` (`@supabase/ssr` + `@supabase/supabase-js`): `server.ts` (`server-only`, async `createClient()` with `cookies()` — not inside `"use cache"`; wrap in `<Suspense>`) for Server Components/Route Handlers; `client.ts` (`"use client"`) for Client Components; `public.ts` (`server-only`, `createPublicClient()`, no cookies, anon role) for cacheable reads and Server Actions — only imported by `app/data/catalog.server.ts` and `app/actions/*`. Never import server from client or vice versa.
- Tables (SPEC 06): `games` (read-only; rows only via seed migration: `asteroids`, `tetris`, `arkanoid`, `snake`), `scores` (`game_id`, `player_name` `^[A-Z0-9_]{1,12}$`, `score` 0–9,999,999, `user_id` nullable, always null for now), view `game_stats` (`games` + `best = max(score)`, `security_invoker`).
- No RLS (explicitly disabled; the project has an event trigger `rls_auto_enable` that turns it on for new tables). Protection is grants: `anon`/`authenticated` get `SELECT` on `games`/`scores`/`game_stats` and column-level `INSERT (game_id, player_name, score)` on `scores`. New tables must `revoke all` + explicit grants in their migration.
- Data access: `app/data/catalog.ts` (types `Game`, `ScoreEntry`, `CATEGORIES`; client-safe) and `app/data/catalog.server.ts` (`getGames`, `getGameById`, `getLeaderboard(gameId, limit)`; `"use cache"`). Cache tags: `games`, `scores` (game reads also tag `scores` because `best` derives from it). `app/data/games.ts` / `scores.ts` are reference-only mock data (not imported); `activity.ts` is still mock.
- Writes: Server Action `saveScore` in `app/actions/scores.ts` (validates, inserts, `updateTag("scores")`; only ids in `PLAYABLE_GAMES`). SQL changes made outside the action (MCP, dashboard) don't invalidate the cache — restart `next dev`.
- `npm run build` needs Supabase reachable (prerender + `generateStaticParams` read `games`).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (template `.env.example`), read via `getSupabaseEnv()` in `env.ts` (throws if missing). No service role key yet.
- Health check: `GET /api/health/supabase` → 200 `{ ok: true }` / 500 `{ ok: false, error: "unavailable" }`.
- Migrations: SQL files in `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, applied to the remote project via Supabase MCP `apply_migration` (server configured in `.mcp.json`, HTTP, project ref `vmlrpblibrhjgljrkiqb`). No local CLI/Docker. Current: `create_games_scores`, `seed_games` (asteroids), `seed_tetris`, `seed_arkanoid`, `seed_snake`.
- Types: `app/lib/supabase/database.types.ts` is generated (MCP `generate_typescript_types`) — never edit by hand; regenerate after every schema change.
- Failures are explicit (throw / 500); no fallback to `app/data/` mock data.
