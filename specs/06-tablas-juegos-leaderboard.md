# SPEC 06 — Tablas `games` y `scores` en Supabase con leaderboard real de Asteroids

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-12
> **Objetivo:** Crear las tablas `games` (solo lectura) y `scores` en Supabase para Asteroids, leer su ficha y su leaderboard desde ahí y guardar de verdad la puntuación desde el modal de fin de partida.

## Por qué existe este spec

SPEC 04 dejó Supabase conectado sin tablas; SPEC 05 dejó Asteroids jugable con `GUARDAR PUNTUACIÓN` solo visual.
Este spec cierra el ciclo jugar → guardar → ver en el ranking, solo para Asteroids.
La app deja de depender de los mocks de juegos y puntuaciones: el catálogo y los leaderboards salen solo de Supabase (hoy solo Asteroids).
Los archivos `app/data/games.ts` y `app/data/scores.ts` se conservan como datos de referencia, sin importarse, para insertar los demás juegos en un spec futuro.
El cliente servidor actual usa `cookies()` y no puede vivir dentro de `"use cache"`; por eso se añade un cliente público sin cookies.

## Alcance

**Dentro:**

- Migración de schema: tablas `games` y `scores`, vista `game_stats`, índice de ranking y grants explícitos.
- Migración de seed: una sola fila en `games` (`asteroids`, con los valores actuales de SPEC 05). `scores` empieza vacía.
- Regenerar `app/lib/supabase/database.types.ts`.
- Nuevo cliente público sin cookies `app/lib/supabase/public.ts` para lecturas cacheables y para la Server Action.
- `app/data/catalog.ts` (nuevo, seguro para cliente): tipos `Game`, `GameCategory`, `GameColor`, `ScoreEntry` y `CATEGORIES`.
- `app/data/catalog.server.ts` (nuevo, `server-only`): `getGames`, `getGameById` y `getLeaderboard`, leyendo solo de Supabase con `"use cache"`. `ScoreEntry` gana el campo `id`.
- `app/data/games.ts` y `app/data/scores.ts`: quedan solo como datos de referencia (`PLACEHOLDER_GAMES`, `LEADERBOARDS`), sin funciones y sin que la app los importe. `asteroids` sale de `games.ts`.
- Todos los imports de la app pasan a `catalog.ts` / `catalog.server.ts` (`activity.ts` incluido, solo para el tipo `GameColor`).
- Los 8 placeholders dejan de mostrarse en la app (catálogo, home, detalle, Hall of Fame).
- `best` de Asteroids derivado como `max(score)` (0 si no hay puntuaciones).
- `plays` de Asteroids como columna de texto de display (`"0"`).
- Ranking: todas las entradas (un jugador puede aparecer varias veces), orden `score desc, created_at asc`.
- Límites: detalle `/games/[id]` muestra 10 filas; `/hall-of-fame` muestra 12 por juego.
- Server Action `saveScore` en `app/actions/scores.ts`: valida, inserta e invalida la caché con `updateTag("scores")`.
- `scores.user_id` nullable; en este spec siempre `null`.
- `GamePlayer`: en `asteroids`, `GUARDAR PUNTUACIÓN` llama a `saveScore` con estado pendiente, error inline, reintento y enlace al ranking.
- Claves de React en `Leaderboard` y `HallOfFame` pasan a usar `id` (con datos reales hay nombres repetidos).
- Actualizar `CLAUDE.md` (sección Supabase) con el cliente público, las tablas y los tags de caché.

**Fuera de alcance (para specs futuros):**

- Supabase Auth.
- Row Level Security (RLS).
- Panel de administración de juegos.
- Escrituras en la tabla `games`: es de solo lectura.
- Realtime.
- Paginación del leaderboard.
- Insertar los 8 juegos placeholder (y sus puntuaciones) en Supabase a partir de `games.ts` / `scores.ts`.
- `app/data/activity.ts` (actividad reciente y top del día de la home): sigue mock sin cambios.

## Modelo de datos

`supabase/migrations/<YYYYMMDDHHMMSS>_create_games_scores.sql` (timestamp del momento de aplicarla):

```sql
create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  plays      text not null default '0',
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,12}$'),
  score       integer not null check (score between 0 and 9999999),
  user_id     uuid null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_ranking_idx on public.scores (game_id, score desc, created_at asc);

create view public.game_stats as
  select g.*, coalesce(max(s.score), 0)::integer as best
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

-- Sin RLS: la protección son los grants
revoke all on public.games, public.scores, public.game_stats from anon, authenticated;
grant select on public.games, public.scores, public.game_stats to anon, authenticated;
grant insert (game_id, player_name, score) on public.scores to anon, authenticated;
```

`supabase/migrations/<YYYYMMDDHHMMSS>_seed_games.sql`:

- Una fila en `games` con `id = 'asteroids'` y los valores de SPEC 05 (`title`, `short`, `long`, `cat`, `cover`, `color`, `plays = '0'`).
- Ninguna fila en `scores`.

TypeScript:

```ts
// app/lib/supabase/public.ts — server-only, sin cookies, apto para "use cache"
export function createPublicClient(): SupabaseClient<Database>; // persistSession: false, autoRefreshToken: false

// app/data/catalog.ts — sin dependencias de servidor
export type GameCategory; export type GameColor; export interface Game; // sin cambios de forma
export const CATEGORIES; // sin cambios
export interface ScoreEntry {
  id: number; // nuevo; clave de React
  rank: number; // índice + 1 en el orden del ranking
  name: string; // player_name
  score: number;
  date: string; // created_at → "dd/mm/aaaa" en UTC
}

// app/data/catalog.server.ts — server-only, solo Supabase, "use cache"
export async function getGames(): Promise<Game[]>; // game_stats; cacheTag("games", "scores")
export async function getGameById(id: string): Promise<Game | undefined>; // mismos tags
export async function getLeaderboard(gameId: string, limit: number): Promise<ScoreEntry[]>; // cacheTag("scores")

// app/data/games.ts y app/data/scores.ts — solo datos de referencia, no importados por la app
export const PLACEHOLDER_GAMES: Game[]; // los 8 placeholders, sin asteroids
export const LEADERBOARDS: Record<string, MockScore[]>; // mocks de los placeholders

// app/actions/scores.ts — "use server"
export type SaveScoreInput = {
  gameId: string;
  playerName: string;
  score: number;
};
export type SaveScoreResult =
  { ok: true } | { ok: false; error: "invalid" | "unavailable" };
export async function saveScore(
  input: SaveScoreInput,
): Promise<SaveScoreResult>;
```

Convenciones:

- `saveScore` normaliza `playerName` con `trim().toUpperCase()` y valida `^[A-Z0-9_]{1,12}$`; `score` entero entre 0 y 9.999.999; `gameId === "asteroids"`. Cualquier fallo → `{ ok: false, error: "invalid" }` sin tocar la BD.
- Error de Supabase en `saveScore` → `console.error` del detalle y `{ ok: false, error: "unavailable" }`.
- Éxito → `updateTag("scores")` y `{ ok: true }`. Invalida el leaderboard y el `best` de Asteroids.
- `saveScore` nunca envía `user_id`; el grant de insert tampoco lo permite.
- Lecturas: si Supabase devuelve error, la función lanza (sin fallback a mocks). `getGameById` devuelve `undefined` si el juego no existe en `games`.
- `getLeaderboard` ya no acepta `limit` opcional: el detalle pasa 10 y `/hall-of-fame` pasa 12.
- Fecha formateada en servidor con `Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })`.
- El cliente público lleva `import "server-only"` y solo lo importan `app/data/catalog.server.ts` y `app/actions/*`.
- Los Client Components solo importan de `catalog.ts`; nunca de `catalog.server.ts`.
- Orden del catálogo: `created_at` de `games`.

UX del modal en `asteroids` (`GamePlayer`):

- Input con `maxLength={12}`, convierte a mayúsculas al escribir; valor por defecto `INVITADO`.
- Pulsar `GUARDAR PUNTUACIÓN` → botón deshabilitado con texto `GUARDANDO...`.
- `ok: true` → toast existente `▸ PUNTUACIÓN GUARDADA_` + enlace `VER RANKING` a `/games/asteroids`. Un solo guardado por partida.
- `error: "invalid"` → mensaje inline `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _`; se puede corregir y reintentar.
- `error: "unavailable"` → mensaje inline `NO SE PUDO GUARDAR. REINTENTA.`; botón habilitado de nuevo.
- `JUGAR DE NUEVO` limpia `saved` y el error.
- Estilo de los mensajes nuevos diseñado con `/frontend-design`, reutilizando tokens de `app/globals.css`.

Archivos:

- `supabase/migrations/<ts>_create_games_scores.sql`, `supabase/migrations/<ts>_seed_games.sql` — nuevos.
- `app/lib/supabase/database.types.ts` — regenerado.
- `app/lib/supabase/public.ts` — nuevo.
- `app/data/catalog.ts`, `app/data/catalog.server.ts` — nuevos.
- `app/data/games.ts`, `app/data/scores.ts` — solo datos de referencia; `asteroids` sale de `games.ts`.
- `app/data/activity.ts` — solo cambia el import del tipo `GameColor`.
- `app/page.tsx`, `app/games/page.tsx`, `app/games/[id]/play/page.tsx` y componentes que importan tipos — imports a `catalog` / `catalog.server`.
- `app/actions/scores.ts` — nuevo.
- `app/games/[id]/page.tsx`, `app/hall-of-fame/page.tsx` — límite explícito en `getLeaderboard`.
- `app/components/Leaderboard.tsx`, `app/components/HallOfFame.tsx` — `key` por `id`.
- `app/components/GamePlayer.tsx` — guardado real en `asteroids`.
- `app/globals.css` — solo si los mensajes nuevos necesitan clases.
- `CLAUDE.md` — sección Supabase.

## Plan de implementación

1. Escribir y aplicar `<ts>_create_games_scores.sql` vía MCP `apply_migration`. Verificar: `list_tables` muestra `games` y `scores`; `get_advisors` (security) solo avisa de RLS desactivada.
2. Escribir y aplicar `<ts>_seed_games.sql`. Verificar con `execute_sql`: `games` tiene 1 fila (`asteroids`), `scores` 0, `game_stats.best` = 0.
3. Regenerar `database.types.ts` con `generate_typescript_types`. Verificar: `npm run build` compila.
4. Crear `app/lib/supabase/public.ts`. Consultar antes `node_modules/next/dist/docs/` (`use-cache.md`, `cacheTag.md`, `updateTag.md`). Verificar: `npm run build` compila.
5. Crear `catalog.ts` y `catalog.server.ts` con `getGames` / `getGameById` sobre `game_stats`; dejar `games.ts` solo con `PLACEHOLDER_GAMES` (sin `asteroids`); repuntar imports. Verificar: `/`, `/games`, `/games/asteroids` y `/games/asteroids/play` muestran solo Asteroids; `/games/rocas` da 404.
6. Mover `getLeaderboard` a `catalog.server.ts` (solo Supabase; `id`, `rank`, fecha UTC, `limit` obligatorio) y `ScoreEntry` a `catalog.ts`; dejar `scores.ts` solo con `LEADERBOARDS`; pasar 10 en el detalle y 12 en `/hall-of-fame`; `key` por `id` en `Leaderboard` y `HallOfFame`. Verificar: Asteroids con leaderboard vacío sin errores.
7. Crear `app/actions/scores.ts` con `saveScore`. Verificar: `npm run build` compila.
8. Conectar `GamePlayer` (solo `asteroids`) a `saveScore` con estados pendiente / éxito / error y diseño de mensajes vía `/frontend-design`. Verificar: guardar una partida → aparece en `/games/asteroids` y `/hall-of-fame` sin reiniciar el servidor; `best` se actualiza.
9. Actualizar `CLAUDE.md` (Supabase): cliente público, tablas, grants, tags `games`/`scores`, `saveScore`.
10. `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `supabase/migrations/` contiene exactamente dos `.sql` nuevos: schema y seed.
- [x] `list_tables` muestra `games` (1 fila, `asteroids`) y `scores` (0 filas tras el seed); `game_stats` existe.
- [x] `database.types.ts` incluye `games`, `scores` y `game_stats`.
- [x] `app/data/games.ts` y `app/data/scores.ts` existen, solo con datos (`PLACEHOLDER_GAMES`, `LEADERBOARDS`), y ningún archivo de la app los importa.
- [x] `app/data/games.ts` ya no contiene la entrada `asteroids`.
- [x] `/`, `/games` (con filtros) y `/hall-of-fame` muestran solo Asteroids.
- [x] `/games/rocas` (y cualquier otro placeholder) responde con la página 404.
- [x] `/games/asteroids` muestra "Mejor global" 0 y leaderboard vacío sin errores cuando `scores` está vacía.
- [x] El detalle muestra como máximo 10 filas y `/hall-of-fame` como máximo 12 por juego.
- [x] Guardar en Asteroids con nombre `ACE_01` y puntuación N crea una fila en `scores` con `player_name = 'ACE_01'`, `score = N`, `user_id` null.
- [x] Tras guardar, `/games/asteroids` y la pestaña Asteroids de `/hall-of-fame` muestran la nueva fila con fecha `dd/mm/aaaa`, sin reiniciar el servidor.
- [x] Tras guardar una puntuación mayor que el `best`, la "Mejor global" de `/games/asteroids` muestra la nueva puntuación.
- [x] Empates de puntuación se ordenan por antigüedad (el primero guardado queda arriba).
- [x] Escribir `ace` en el input muestra `ACE`; el input no acepta más de 12 caracteres.
- [x] Nombre con caracteres inválidos (p. ej. `JOSÉ!`) muestra el mensaje de nombre inválido y no inserta fila.
- [x] Durante el guardado el botón muestra `GUARDANDO...` y está deshabilitado.
- [x] Con Supabase caído (URL inválida en `.env.local`), guardar muestra `NO SE PUDO GUARDAR. REINTENTA.` y el botón vuelve a habilitarse.
- [x] Tras guardar con éxito se ve el toast y el enlace `VER RANKING`; no se puede guardar dos veces la misma partida.
- [x] `JUGAR DE NUEVO` permite guardar la nueva partida.
- [x] Llamar a `saveScore` con `gameId: "rocas"`, `score: -1`, `score: 1.5` o `score: 10000000` devuelve `{ ok: false, error: "invalid" }` sin insertar.
- [x] Con la publishable key vía `curl` a `/rest/v1/`: cualquier escritura en `games`, `UPDATE`/`DELETE` en `scores` e `INSERT` en `scores` con `user_id` son rechazados por permisos.
- [x] Varias filas con el mismo `player_name` en un ranking no producen warnings de `key` en consola.
- [x] `/api/health/supabase` sigue respondiendo 200.
- [x] `CLAUDE.md` documenta el cliente público, las tablas, los grants y los tags de caché.

## Decisiones

- **Sí:** solo Asteroids en Supabase. Decisión del usuario.
- **Sí (durante implementación, cambio de alcance):** la app deja de depender de `games.ts` y `scores.ts`; catálogo y leaderboards salen solo de Supabase. Decisión del usuario: la información viene de la BD. Sustituye a la decisión anterior de combinar mock + Supabase.
- **Sí (durante implementación):** `games.ts` y `scores.ts` se conservan como datos de referencia. Decisión del usuario: en un spec futuro se insertarán esos juegos en la BD a partir de ellos.
- **No:** sembrar los 8 placeholders en `games` en este spec. Va en el spec futuro.
- **Sí (durante implementación):** tipos y `CATEGORIES` en `catalog.ts`; lecturas en `catalog.server.ts`. `Library` (Client Component) importa `CATEGORIES` y no puede arrastrar `cacheTag` ni el cliente de Supabase; el build fallaba.
- **No:** pasar `CATEGORIES` como prop o duplicarlo en `Library`. Descartado por el usuario.
- **Sí:** `activity.ts` sin cambios (salvo el import de `GameColor`). Decisión del usuario; la home muestra la grilla real y la actividad mock.
- **Sí:** `scores` de Asteroids empieza vacía. Decisión del usuario; el ranking se llena con partidas reales.
- **No:** puntuaciones demo. Datos falsos en la BD real.
- **Sí:** RLS desactivada; protección con `revoke` + grants explícitos. Decisión del usuario (RLS fuera de alcance).
- **No:** grants por defecto. La publishable key podría modificar o borrar todo.
- **Sí:** `games` de solo lectura (solo `SELECT`). Decisión del usuario; sin panel de administración.
- **Sí:** grant de insert por columnas sin `user_id`. Sin RLS, nadie puede firmar una puntuación con un id ajeno.
- **Sí:** `user_id uuid null`. Decisión del usuario: no obligar a autenticarse; listo para el spec de Auth.
- **Sí:** `best` derivado (`max(score)`) vía vista `game_stats`. Se actualiza solo al guardar.
- **Sí:** `plays` como columna de texto. No hay tracking de partidas.
- **No:** `sort_order` en `games`. Con un solo juego en la tabla no aporta; el orden lo fija `getGames`.
- **Sí:** `CHECK` para `cat` y `color` en lugar de enums Postgres. Más fácil de ampliar.
- **Sí:** cliente público sin cookies + `"use cache"` + `cacheTag`. Compatible con `cacheComponents` y con `generateStaticParams`.
- **No:** cliente con cookies y lecturas dinámicas. `generateStaticParams` no tiene request.
- **Sí:** un solo tag `scores` para leaderboard y `best`. Una invalidación cubre todo lo que cambia al guardar.
- **Sí:** Server Action `saveScore` + `updateTag`. Valida, inserta e invalida en un sitio; read-your-own-writes inmediato.
- **No:** Route Handler `POST /api/scores`. `updateTag` solo funciona en Server Actions.
- **No:** insert directo desde el cliente. Sin validación de servidor ni invalidación de caché.
- **Sí:** ranking con todas las entradas, desempate por `created_at asc`. Estilo arcade clásico.
- **No:** mejor puntuación por jugador. Requiere vista/RPC extra.
- **Sí:** nombre `^[A-Z0-9_]{1,12}$`, normalizado a mayúsculas. Validado en action y en BD.
- **Sí:** `0 ≤ score ≤ 9.999.999`, entero. Frena valores absurdos.
- **Sí:** límites 10 (detalle) y 12 (Hall of Fame). Sin paginación (fuera de alcance).
- **Sí:** fecha en UTC. Determinista con caché.
- **Sí:** estados pendiente / error inline / reintento + enlace al ranking. Feedback claro sin perder la partida.
- **Sí (durante implementación):** `disable row level security` explícito en `games` y `scores`. El proyecto tiene un event trigger (`rls_auto_enable`) que activa RLS en tablas nuevas; sin políticas bloqueaba lecturas e inserts. Decisión del usuario (opción literal al spec).
- **Sí (durante implementación):** `game_stats` con `security_invoker = true`. Sin él, `get_advisors` marca ERROR `security_definer_view`.
- **Sí (durante implementación):** el arreglo se aplicó en remoto como migración `fix_games_scores_access`, pero en el repo se plegó en `_create_games_scores.sql`. El repo mantiene 2 `.sql`; el historial remoto tiene 3.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Insert anónimo permite puntuaciones falsas vía `curl` con la publishable key          | Aceptado: CHECKs de nombre y rango limitan el daño.                                                                            |
| Inserts directos a PostgREST pueden apuntar a cualquier `game_id` existente           | Solo existe `asteroids` en `games`; la FK rechaza el resto.                                                                    |
| Spam de filas sin rate limiting                                                       | Aceptado; el índice mantiene las consultas top-N rápidas.                                                                      |
| `get_advisors` marca RLS desactivada en `public`                                      | Aceptado por decisión del usuario; los grants explícitos son la protección. Se revisa en el spec de RLS.                       |
| Supabase reaplica grants por defecto a tablas nuevas de `public`                      | El `revoke` va en la misma migración; criterio de aceptación con `curl` lo verifica.                                           |
| `npm run build` ahora necesita Supabase accesible (`generateStaticParams`, prerender) | Error explícito si falla, según la convención de SPEC 04. Documentado en `CLAUDE.md`.                                          |
| Cambios por SQL directo (MCP, dashboard) no invalidan la caché                        | Solo la action invalida; tras cambios manuales reiniciar `npm run dev` o esperar la revalidación por defecto de `"use cache"`. |
| `"use cache"` serializa el resultado; `Date` o clases no son serializables            | Las funciones devuelven objetos planos (`date` ya formateado como string).                                                     |
| `key={r.name}` duplicado al haber nombres repetidos                                   | `key` por `id` (paso 6).                                                                                                       |

## Lo que **no** entra en este spec

- Supabase Auth.
- Row Level Security.
- Panel de administración de juegos.
- Escrituras en `games` (solo lectura).
- Realtime.
- Paginación del leaderboard.
- Insertar los 8 placeholders en Supabase (sus datos se conservan en `games.ts` / `scores.ts`).
- Cambios en `activity.ts`.

Cada uno, si llega, va en su propio spec.
