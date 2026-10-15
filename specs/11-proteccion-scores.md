# SPEC 11 — Protección de la tabla `scores`: inserción solo desde el servidor y rate limit

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-10-15
> **Objetivo:** Impedir que se inserten puntuaciones directamente en Supabase con la clave pública y limitar `saveScore` a 10 envíos por minuto por IP.

## Por qué existe este spec

Revisión de seguridad (Security Guidance, 2026-10-15), hallazgo 1:

- La migración `create_games_scores` concede `insert (game_id, player_name, score)` en `scores` a `anon` y `authenticated`.
- La clave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` va en el bundle del cliente.
- Cualquiera puede insertar en `scores` vía REST de Supabase sin pasar por `saveScore` (sin la comprobación `isPlayable`). Los checks SQL (`player_name`, `score` 0–9.999.999) no impiden llenar el leaderboard de 9.999.999.
- `saveScore` tampoco limita la frecuencia: un script puede llamar a la Server Action en bucle.

## Alcance

**Dentro:**

- Nueva variable de entorno server-only `SUPABASE_SECRET_KEY` (formato `sb_secret_…`), documentada en `.env.example`.
- Nuevo cliente `app/lib/supabase/admin.ts` (`server-only`, `createAdminClient()`, sin cookies, con la secret key). Solo lo importa `app/actions/*`.
- `saveScore` inserta con `createAdminClient()` en vez de `createPublicClient()`.
- Migración que revoca `insert` en `scores` a `anon` y `authenticated`. El `select` se mantiene.
- Migración con tabla `rate_limits` y función SQL atómica `check_rate_limit`, ejecutable solo por `service_role`.
- Rate limit en `saveScore`: 10 envíos por minuto por IP, ventana fija de 60 s.
- Nuevo error `"rate_limited"` en `SaveScoreResult`; `GamePlayer` muestra `DEMASIADOS ENVÍOS, ESPERA UN MINUTO`.
- Regenerar `app/lib/supabase/database.types.ts`.
- Actualizar `CLAUDE.md` (sección Supabase: cliente admin, grants, env, migraciones).

**Fuera de alcance (para specs futuros):**

- Rate limit de `/api/contact` (hallazgo 2). Decisión ya tomada para ese spec: misma tabla `rate_limits` de Supabase.
- Cabeceras de seguridad (hallazgo 3). Decisión ya tomada para ese spec: CSP estática en `next.config.ts` `headers()`, sin nonce.
- Aviso de login visual en `AuthForm` y saneo de CR/LF en el asunto del correo de contacto (hallazgos 4–5).
- Anti-trampa real: validar plausibilidad del score, token de partida firmado, duración mínima, máximos por juego.
- Limpieza periódica de filas antiguas de `rate_limits`.
- Autenticación real / `user_id` en `scores`.

## Modelo de datos

### Variables de entorno

```bash
# .env.example (nueva línea; solo servidor, nunca NEXT_PUBLIC_)
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxx
```

Lectura en `app/lib/supabase/env.ts` con una función nueva `getSupabaseSecretKey()` que lanza si falta (mismo patrón que `getSupabaseEnv()`).

### Tabla `rate_limits`

```sql
create table public.rate_limits (
  key          text primary key,          -- p.ej. 'score:<sha256 de la IP>'
  window_start timestamptz not null,
  count        integer not null
);
alter table public.rate_limits disable row level security;
revoke all on public.rate_limits from anon, authenticated;
```

### Función `check_rate_limit`

```sql
-- true = permitido (y cuenta el intento); false = límite superado.
check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
```

- Un único `insert … on conflict (key) do update`: si la ventana expiró reinicia `window_start = now()`, `count = 1`; si no, `count = count + 1`.
- Devuelve `count <= p_limit`.
- `revoke execute … from public, anon, authenticated`; `grant execute … to service_role`.

### `SaveScoreResult`

```ts
// antes
{ ok: true } | { ok: false; error: "invalid" | "unavailable" }
// después
{ ok: true } | { ok: false; error: "invalid" | "unavailable" | "rate_limited" }
```

### Clave del rate limit

- IP: primer valor de la cabecera `x-forwarded-for` (vía `headers()` de `next/headers`); si falta, `x-real-ip`; si falta, `"unknown"`.
- Clave: `score:` + SHA-256 hex de la IP (`node:crypto`). No se guarda la IP en claro.
- Constantes en `app/actions/scores.ts`: `RATE_LIMIT = 10`, `RATE_WINDOW_SECONDS = 60`.

## Plan de implementación

1. Añadir `SUPABASE_SECRET_KEY` a `.env.example` y a `.env.local` (valor desde el dashboard: Project Settings → API Keys → Secret keys). Añadir `getSupabaseSecretKey()` en `env.ts`.
2. Crear `app/lib/supabase/admin.ts` con `createAdminClient()` (`server-only`, `persistSession: false`, `autoRefreshToken: false`). Cambiar `saveScore` para usarlo. Prueba manual: guardar un score en `/games/snake/play` sigue funcionando.
3. Migración `supabase/migrations/<timestamp>_revoke_scores_insert.sql`: `revoke insert on public.scores from anon, authenticated;`. Aplicar con MCP `apply_migration`. Comprobar con `execute_sql` que `service_role` conserva `insert` en `scores`. Prueba manual: guardar un score sigue funcionando.
4. Migración `supabase/migrations/<timestamp>_create_rate_limits.sql`: tabla `rate_limits`, función `check_rate_limit` y grants del modelo de datos. Aplicar con MCP. Regenerar `database.types.ts` con `generate_typescript_types`.
5. `saveScore`: tras validar la entrada y antes del insert, obtener la clave de IP y llamar `rpc("check_rate_limit", …)` con el cliente admin. `false` → `{ ok: false, error: "rate_limited" }`. Error del RPC → `{ ok: false, error: "unavailable" }` (falla cerrado).
6. `GamePlayer`: para `saveError === "rate_limited"` mostrar `DEMASIADOS ENVÍOS, ESPERA UN MINUTO` en `#save-error`, con la misma animación que los demás errores. El campo de nombre no se marca `is-invalid`.
7. Actualizar `CLAUDE.md`: cliente `admin.ts`, grants (`anon`/`authenticated` sin `insert`), tabla `rate_limits`, env `SUPABASE_SECRET_KEY`, migraciones nuevas. Pasar `npm run lint` y `npm run build`.

## Criterios de aceptación

- [x] `grep -r "SUPABASE_SECRET_KEY" app` solo aparece en `app/lib/supabase/env.ts`.
- [x] `app/lib/supabase/admin.ts` empieza con `import "server-only"` y solo lo importa `app/actions/scores.ts`.
- [x] Un `POST {NEXT_PUBLIC_SUPABASE_URL}/rest/v1/scores` con la clave publishable devuelve error de permisos (401/403) y no crea fila.
- [x] Un `GET {NEXT_PUBLIC_SUPABASE_URL}/rest/v1/scores?select=*` con la clave publishable sigue devolviendo filas.
- [x] Un `POST …/rest/v1/rpc/check_rate_limit` con la clave publishable devuelve error de permisos.
- [x] `select` desde la clave publishable sobre `rate_limits` devuelve error de permisos.
- [x] Guardar un score válido desde `/games/<id>/play` lo inserta y aparece en el leaderboard.
- [x] El 11.º guardado desde la misma IP en menos de 60 s devuelve `rate_limited` y no inserta fila.
- [x] Tras 60 s sin envíos, el siguiente guardado vuelve a funcionar.
- [x] Con `rate_limited`, el formulario muestra `DEMASIADOS ENVÍOS, ESPERA UN MINUTO` y el input de nombre no tiene `aria-invalid="true"`.
- [x] La columna `key` de `rate_limits` no contiene ninguna IP en claro (solo `score:` + 64 caracteres hex).
- [x] Sin `SUPABASE_SECRET_KEY`, `saveScore` devuelve `unavailable` y escribe un `console.error` (no expone la causa al cliente).
- [x] `database.types.ts` incluye `rate_limits` y `check_rate_limit`.
- [x] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** revocar `insert` a `anon`/`authenticated` e insertar con la secret key en el servidor. Cierra la inserción directa por REST.
- **No:** función RPC `SECURITY DEFINER` con `execute` para `anon`. Se podría seguir llamando directamente con la clave pública.
- **No:** solo rate limit manteniendo el grant. La inserción directa seguiría abierta.
- **Sí:** secret key nueva (`sb_secret_…`) en vez del JWT `service_role` legacy. Es el formato actual de Supabase y se puede rotar sin cambiar el JWT secret.
- **Sí:** rate limit en tabla de Supabase. Sin dependencias nuevas, funciona en serverless y multi-instancia.
- **No:** Upstash Redis. Dependencia, cuenta y env vars nuevas para un único contador.
- **No:** `Map` en memoria. No sirve con varias instancias ni sobrevive a reinicios.
- **Sí:** 10 envíos/min por IP, ventana fija. Una partida dura más de 6 s; un humano no llega a 10/min.
- **Sí:** la IP se guarda hasheada (SHA-256). Evita almacenar datos personales en claro.
- **Sí:** si falla el RPC del rate limit, `saveScore` falla cerrado (`unavailable`). Si la base no responde, el insert tampoco funcionaría.
- **Sí:** mensaje propio para `rate_limited`. El jugador sabe que debe esperar, no que el servicio está caído.
- **No:** validar la plausibilidad del score en este spec. El anti-trampa real es un dominio propio.
- **No:** sin RLS en `rate_limits`, igual que `games`/`scores` (convención de SPEC 06: protección por grants).

## Riesgos

| Riesgo                                                               | Mitigación                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fuga de `SUPABASE_SECRET_KEY` al bundle cliente                      | Sin prefijo `NEXT_PUBLIC_`; `admin.ts` con `server-only` (el build falla si se importa desde cliente).    |
| `x-forwarded-for` falsificable si no hay proxy delante               | En Vercel la cabecera la pone la plataforma. En local todos comparten `unknown`; aceptable en desarrollo. |
| Varios jugadores tras la misma IP (NAT, oficina) comparten el límite | 10/min es holgado para varias personas jugando partidas reales.                                           |
| `rate_limits` crece con una fila por IP distinta                     | Una fila por IP (upsert), tamaño acotado. Limpieza periódica en spec futuro si hace falta.                |
| `rls_auto_enable` activa RLS al crear `rate_limits`                  | La migración hace `disable row level security` explícito, como SPEC 06.                                   |
| El build necesita la nueva env                                       | `getSupabaseSecretKey()` solo se llama dentro de `saveScore`, no en prerender; el build no la requiere.   |

## Lo que **no** entra en este spec

- Rate limit de `/api/contact`.
- Cabeceras de seguridad / CSP.
- Cambios en `AuthForm` y en el asunto del correo de contacto.
- Anti-trampa (plausibilidad del score, token de partida).
- Limpieza programada de `rate_limits`.
- Autenticación real.

Cada uno, si llega, va en su propio spec.
