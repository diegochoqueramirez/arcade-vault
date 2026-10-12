# SPEC 04 — Integración base de Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-10-11
> **Objetivo:** Conectar la app Next.js al proyecto Supabase con clientes servidor/navegador tipados y un endpoint `GET /api/health/supabase`, sin crear tablas, como base para specs futuros.

## Por qué existe este spec

Las próximas funcionalidades (juegos, puntuaciones, auth) necesitan base de datos.
Hoy los datos viven en arrays de `app/data/` detrás de funciones async (SPEC 01/02).
Este spec solo fija la infraestructura: dependencias, variables de entorno, clientes, carpeta de migraciones y tipos.
Ningún dato existente se mueve aquí; cada migración va en su propio spec.
Depende de SPEC 03 porque reutiliza su patrón de Route Handler + variables de entorno + `.env.example`.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (no commiteado) y en `.env.example` (commiteado).
- `app/lib/supabase/env.ts`: lee y valida las dos variables; lanza error claro si falta alguna.
- `app/lib/supabase/server.ts`: `createClient()` async para Server Components y Route Handlers (`createServerClient` de `@supabase/ssr` + `cookies()` de `next/headers`).
- `app/lib/supabase/client.ts`: `createClient()` para Client Components (`createBrowserClient` de `@supabase/ssr`).
- `app/lib/supabase/database.types.ts`: tipos generados con el MCP (`generate_typescript_types`); ambos clientes tipados con `Database`.
- Carpeta `supabase/migrations/` versionada (con `.gitkeep`), vacía. Convención para specs futuros: archivos `YYYYMMDDHHMMSS_nombre.sql`, aplicados al proyecto remoto con el MCP (`apply_migration`).
- Route Handler `GET /api/health/supabase` (`app/api/health/supabase/route.ts`) que crea el cliente servidor y hace una petición real al proyecto.
- Actualizar `CLAUDE.md` (sección Stack) con: ubicación de clientes, variables de entorno, convención de migraciones y regeneración de tipos.

**Fuera de alcance (para specs futuros):**

- Tablas y migración de datos (`games`, `scores`, `activity`).
- Cambiar `getGames`, `getGameById`, `getLeaderboard`, `getRecentScores`, `getTopPlayersToday`: siguen leyendo de `app/data/`.
- Supabase Auth y conexión de `/login`.
- `proxy.ts` con refresco de sesión (`updateSession`).
- Políticas RLS (no hay tablas).
- `SUPABASE_SERVICE_ROLE_KEY` / cliente admin.
- Supabase CLI local, Docker y `supabase init`.
- Storage, Realtime y Edge Functions.
- Fallback a datos locales si Supabase falla.

## Modelo de datos

Este spec no introduce tablas. `public` sigue vacío.

Variables de entorno (`.env.local`; `.env.example` con placeholders):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

`app/lib/supabase/`:

```ts
// env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string }; // lanza si falta alguna

// server.ts — solo en servidor
export async function createClient(): Promise<SupabaseClient<Database>>;

// client.ts — "use client"
export function createClient(): SupabaseClient<Database>;

// database.types.ts — generado, no editar a mano
export type Database = {/* … */};
```

`app/api/health/supabase/route.ts`:

```ts
// 200 { ok: true }                          → el proyecto respondió
// 500 { ok: false, error: "unavailable" }   → falta env, red o Supabase falló
export type HealthResponse = { ok: true } | { ok: false; error: "unavailable" };

export async function GET(): Promise<Response>;
```

Convenciones:

- La publishable key es pública por diseño; puede usar `NEXT_PUBLIC_`.
- Ninguna clave secreta (service role) entra en este spec.
- El servidor importa `@/app/lib/supabase/server`; los componentes cliente importan `@/app/lib/supabase/client`. Nunca al revés.
- Si falta env o Supabase falla, la app lanza error visible. No hay fallback a datos locales.
- El health check loguea el detalle con `console.error` y responde 500 sin exponer el error.
- Cada spec que cambie el schema añade su `.sql` en `supabase/migrations/`, lo aplica vía MCP y regenera `database.types.ts`.

## Plan de implementación

1. `npm install @supabase/supabase-js @supabase/ssr`. Verificar: `npm run build` compila.
2. Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example`. Rellenar `.env.local` con los valores reales obtenidos vía MCP (`get_project_url`, `get_publishable_keys`). Verificar: `git status` muestra `.env.example` y no `.env.local`.
3. Generar `app/lib/supabase/database.types.ts` con el MCP. Crear `app/lib/supabase/env.ts`. Verificar: `npm run build` compila.
4. Crear `app/lib/supabase/server.ts` y `app/lib/supabase/client.ts` según la guía oficial de `@supabase/ssr` para App Router, tipados con `Database`. Consultar antes `node_modules/next/dist/docs/` sobre `cookies()` con `cacheComponents`. Verificar: `npm run build` compila.
5. Crear `app/api/health/supabase/route.ts` con `GET`: crea el cliente servidor, hace una petición real al proyecto y responde 200/500. Verificar con `curl localhost:3000/api/health/supabase`: con env válidas → 200; con URL inválida en `.env.local` → 500.
6. Crear `supabase/migrations/.gitkeep`. Actualizar `CLAUDE.md` (Stack) con clientes, env vars, convención de migraciones y regeneración de tipos.
7. `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.
- [x] `.env.example` está commiteado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como placeholders; `.env.local` no está commiteado.
- [x] `app/lib/supabase/server.ts`, `client.ts`, `env.ts` y `database.types.ts` existen.
- [x] Ambos `createClient()` devuelven `SupabaseClient<Database>`.
- [x] `client.ts` empieza con `"use client"` o solo se importa desde componentes cliente; `server.ts` importa `next/headers`.
- [x] Con env válidas, `GET /api/health/supabase` responde 200 `{ ok: true }`.
- [x] Con `NEXT_PUBLIC_SUPABASE_URL` ausente o inválida, `GET /api/health/supabase` responde 500 `{ ok: false, error: "unavailable" }` y loguea el detalle en servidor.
- [x] La respuesta 500 no incluye mensajes ni stack del error.
- [x] `POST /api/health/supabase` responde 405.
- [x] `supabase/migrations/` existe en el repo y no contiene `.sql`.
- [x] El schema `public` del proyecto Supabase sigue sin tablas (`list_tables` vacío).
- [x] `/`, `/games`, `/games/<id>`, `/hall-of-fame`, `/about` y `/login` se ven y funcionan igual que antes.
- [x] Ningún archivo de `app/data/` ni sus consumidores cambia.
- [x] `CLAUDE.md` documenta ubicación de clientes, env vars, convención de migraciones y regeneración de tipos.

## Decisiones

- **Sí:** solo integración, sin tablas. Decisión del usuario: base para specs futuros.
- **No:** migrar `games` en este spec. Cada dominio de datos va en su spec.
- **Sí:** `@supabase/supabase-js` + `@supabase/ssr`. Paquetes de la doc oficial; dejan listo el camino para auth con cookies.
- **No:** solo `supabase-js`. Obligaría a migrar clientes al añadir auth.
- **Sí:** clientes en `app/lib/supabase/`. Coherente con que todo vive bajo `app/`.
- **No:** `lib/` o `utils/` en la raíz.
- **Sí:** migraciones SQL en `supabase/migrations/` aplicadas vía MCP. Schema versionado sin instalar CLI ni Docker.
- **No:** Supabase CLI local. Más setup del que necesita el proyecto hoy.
- **No:** cambios solo desde el dashboard. El schema no quedaría versionado.
- **Sí:** error visible si Supabase falla. Una sola fuente de verdad.
- **No:** fallback a `app/data/`. Mantendría dos fuentes de verdad.
- **No:** `proxy.ts` con `updateSession`. Sin auth no hay sesión que refrescar; va con el spec de Auth.
- **Sí:** `GET /api/health/supabase`. Verificable con `curl`, mismo patrón que `/api/contact`.
- **No:** tabla `_health` de prueba. Ensucia el schema para una verificación.
- **Sí:** tipos generados en `database.types.ts`. Clientes tipados desde el primer día.
- **Sí:** nombres `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Convención actual de Supabase (publishable key en lugar de `anon`).
- **Sí (durante implementación):** `import "server-only"` en `server.ts`. Falla el build si un componente cliente lo importa; Next lo resuelve sin instalar paquete.
- **Sí (durante implementación):** health check con `supabase.storage.listBuckets()`. Sin tablas es la petición real más simple vía el cliente; con publishable key devuelve `[]`.
- **No:** `auth.getSession()` como ping. No hace petición de red.
- **Sí (durante implementación):** `await connection()` antes del `try` en el health check. Sin él, el prerender del build rechazaba `cookies()` y el `catch` lo logueaba como fallo falso.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookies()` en el cliente servidor es API dinámica y choca con `"use cache"` bajo `cacheComponents` | Consultar `node_modules/next/dist/docs/` en el paso 4. Specs futuros que cacheen lecturas públicas deben evaluar un cliente sin cookies; se decide en ese spec. |
| Sin tablas no hay consulta trivial para el health check                                             | El paso 5 usa una petición real al proyecto (no `getSession`, que no hace red). Verificar que con URL inválida responde 500.                                    |
| `database.types.ts` desactualizado tras cambios de schema                                           | Convención en `CLAUDE.md`: regenerar en cada spec que añada migraciones.                                                                                        |
| Health check público expone estado del backend                                                      | Solo devuelve `ok` true/false; el detalle va al log del servidor.                                                                                               |
| `.env.local` ya existe con variables de Resend                                                      | Añadir las de Supabase sin borrar las existentes.                                                                                                               |

## Lo que **no** entra en este spec

- Tablas, migraciones con contenido y RLS.
- Migración de `games`, `scores` o `activity`.
- Supabase Auth, `/login` y `proxy.ts`.
- Service role key / cliente admin.
- Supabase CLI local.
- Storage, Realtime, Edge Functions.
- Fallback a datos locales.

Cada uno, si llega, va en su propio spec.
