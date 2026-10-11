# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar en Next.js App Router las cinco pantallas del prototipo `references/templates/` (Biblioteca, Detalle, Reproductor, Acceso, Salón de la Fama) como réplica visual fiel con datos ficticios, sin juegos reales.

## Por qué existe este spec

El prototipo en `references/templates/` es una SPA con React UMD + Babel y rutas en `location.hash`.
Los estilos ya se portaron a `app/globals.css` (PR #2), pero `app/page.tsx` sigue siendo el scaffold de Create Next App.
Este spec traslada el markup a rutas reales de Next 16 y centraliza los datos ficticios en `app/data/`, preparado para cambiar a base de datos más adelante sin tocar las páginas.

## Alcance

**Dentro:**

- Layout común: `Nav` (logo, links Biblioteca / Salón de la Fama, contador `CRÉDITOS · 03` fijo, botón `Iniciar Sesión`, menú hamburguesa móvil con panel lateral) y footer del template.
- Ruta `/` — Biblioteca: hero `ARCADE VAULT` con flicker, búsqueda por nombre, chips de categoría, grid de `GameCard` con tilt 3D al mover el mouse, estado vacío `NO HAY RESULTADOS`.
- Ruta `/games/[id]` — Detalle: portada, tags, descripción larga, stat-strip, botones `▶ JUGAR AHORA` y `VOLVER AL VAULT`, leaderboard lateral (10 filas).
- Ruta `/games/[id]/play` — Reproductor placeholder: HUD con valores fijos (jugador `INVITADO`, puntuación `0`, vidas `♥ ♥ ♥`, nivel `01`), pantalla CRT con arena y enemigos animados por CSS, barra inferior CRT.
  - `PAUSA` alterna el overlay `EN PAUSA` y el texto del botón a `REANUDAR`.
  - `FIN` abre el modal `FIN DEL JUEGO` con puntuación `0`. `GUARDAR PUNTUACIÓN` solo muestra `▸ PUNTUACIÓN GUARDADA_` (sin persistir). `JUGAR DE NUEVO` cierra el modal. `VOLVER AL VAULT` va a `/`.
  - `SALIR` vuelve a `/games/[id]`.
- Ruta `/login` — Acceso: pestañas `INICIAR SESIÓN` / `CREAR CUENTA` (la segunda añade campo correo con `slide-in`), botones invitado, Google, GitHub. Enviar el formulario o `JUGAR COMO INVITADO` redirige a `/` sin guardar nada.
- Ruta `/hall-of-fame` — Salón de la Fama: pestañas por juego, podio (oro/plata/bronce), tabla de 12 filas con animación escalonada, botón `VOLVER A LA BIBLIOTECA`.
- `app/not-found.tsx` con estilo arcade para juegos inexistentes (`/games/xyz`) y rutas desconocidas.
- Datos ficticios en `app/data/` expuestos mediante funciones async.
- Link activo en el Nav: `Biblioteca` activo en `/`, `/games/*`; `Salón de la Fama` activo en `/hall-of-fame`.

**Fuera de alcance (para specs futuros):**

- Cualquier juego real (lógica, canvas, input de teclado).
- Puntaje simulado que sube solo, vidas y niveles dinámicos.
- Autenticación real o mock (localStorage, contexto). El Nav siempre muestra `Iniciar Sesión`.
- Persistencia de puntuaciones.
- Fila `TU MEJOR MARCA` del Salón (requiere usuario).
- Base de datos / API real.
- Filtros o pestañas sincronizados con la URL (search params).
- Login social funcional (Google/GitHub).

## Modelo de datos

`app/data/games.ts`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug, p.ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // clase CSS, p.ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;       // "12.4K"
}

export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;

export async function getGames(): Promise<Game[]>;
export async function getGameById(id: string): Promise<Game | undefined>;
```

`app/data/scores.ts`:

```ts
export interface ScoreEntry {
  rank: number;
  name: string;   // "PX_KAI"
  score: number;
  date: string;   // "DD/MM/2026"
}

// 12 filas fijas por juego, escritas a mano, ordenadas por score desc.
export async function getLeaderboard(gameId: string, limit?: number): Promise<ScoreEntry[]>;
```

Convenciones:

- Los 8 juegos y sus textos se copian tal cual de `references/templates/data.jsx`.
- Números con `toLocaleString("es-ES")`.
- Las funciones async son la única puerta de acceso a datos: las páginas nunca importan los arrays directamente.

## Plan de implementación

1. Crear `app/data/games.ts` y `app/data/scores.ts` con tipos, datos fijos y funciones async. Verificar: `npm run build` compila.
2. Crear `app/components/Nav.tsx` (cliente: menú móvil + link activo con `usePathname`) y `app/components/Footer.tsx`. Integrarlos en `app/layout.tsx` envolviendo `children` en `<main className="av-main">`. Verificar: nav y footer visibles en `/`.
3. Crear `app/components/GameCard.tsx` (cliente, tilt 3D) y `app/components/Library.tsx` (cliente, búsqueda + chips). Reemplazar `app/page.tsx` por la Biblioteca que obtiene juegos con `getGames()`. Verificar: grid, filtros y estado vacío funcionan.
4. Crear `app/components/Leaderboard.tsx` y `app/games/[id]/page.tsx` (usa `PageProps<"/games/[id]">`, `params` como Promise, `notFound()` si no existe, `generateStaticParams` con los 8 ids). Verificar: `/games/caida` muestra detalle y leaderboard.
5. Crear `app/not-found.tsx` con estilo arcade. Verificar: `/games/xyz` muestra la página.
6. Crear `app/games/[id]/play/page.tsx` (servidor) + `app/components/GamePlayer.tsx` (cliente: estados `paused`, `over`, `saved`). Verificar: PAUSA, FIN, modal y SALIR se comportan según alcance.
7. Crear `app/login/page.tsx` + `app/components/AuthForm.tsx` (cliente: pestañas, submit → `router.push("/")`). Verificar: ambas pestañas y redirección.
8. Crear `app/hall-of-fame/page.tsx` + `app/components/HallOfFame.tsx` (cliente: pestaña activa). La página pre-carga leaderboards de todos los juegos y los pasa como prop. Verificar: cambiar pestaña actualiza podio y tabla.
9. Ajustes visuales con `/frontend-design` solo donde la réplica deje huecos (p.ej. not-found). `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/page.tsx` ya no contiene el scaffold de Create Next App.
- [ ] Las rutas `/`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame` renderizan sin errores en consola.
- [ ] Cada pantalla usa las mismas clases CSS que su equivalente en `references/templates/` y se ve igual lado a lado con `Arcade Vault.html`.
- [ ] En `/`, escribir "ca" en la búsqueda muestra `CAÍDA` y `ROCAS`; elegir chip `SHOOTER` muestra solo `INVASORES` y `ROCAS`.
- [ ] Una búsqueda sin coincidencias muestra `NO HAY RESULTADOS`.
- [ ] Mover el mouse sobre una card la inclina; al salir vuelve a su posición.
- [ ] Clic en una card o en `JUGAR` navega a `/games/<id>`.
- [ ] `/games/<id>` muestra un leaderboard de 10 filas con top1/top2/top3 resaltados.
- [ ] `/games/xyz` muestra la página not-found arcade con botón de vuelta a `/`.
- [ ] En `/games/<id>/play` los enemigos de la arena están animados; el HUD muestra `0`, `♥ ♥ ♥`, `01`.
- [ ] `PAUSA` muestra overlay `EN PAUSA` y cambia a `REANUDAR`; al pulsar de nuevo desaparece.
- [ ] `FIN` abre el modal; `GUARDAR PUNTUACIÓN` muestra `▸ PUNTUACIÓN GUARDADA_` y no escribe en localStorage.
- [ ] `SALIR` lleva a `/games/<id>`.
- [ ] En `/login`, la pestaña `CREAR CUENTA` añade el campo correo; enviar el formulario redirige a `/`.
- [ ] En `/hall-of-fame`, cambiar de pestaña cambia podio y tabla (12 filas).
- [ ] El link del Nav correspondiente a la ruta actual tiene la clase `active`.
- [ ] Con ancho < 768px aparece el botón `≡` y abre el panel lateral; clic en el backdrop lo cierra.
- [ ] Ninguna página importa arrays de `app/data/` directamente; solo usa `getGames`, `getGameById`, `getLeaderboard`.

## Decisiones

- **Sí:** rutas reales de App Router en inglés (`/games/[id]`, `/games/[id]/play`, `/hall-of-fame`, `/login`). URLs compartibles e idiomáticas.
- **No:** SPA con hash como el template. Ignora el router de Next.
- **Sí:** réplica fiel del markup y clases del template, reutilizando `app/globals.css`. Los estilos ya están portados.
- **No:** reinterpretar el diseño con `/frontend-design`. Solo se usa para huecos (not-found).
- **Sí:** reproductor placeholder con HUD fijo, arena animada, overlay de pausa y modal visual.
- **No:** puntaje simulado incremental. No aporta al MVP visual y simula lógica de juego.
- **Sí:** auth solo visual con redirección a `/`. La sesión real es otro spec.
- **No:** mock en localStorage o contexto. Introduce estado que habrá que deshacer.
- **Sí:** datos en `app/data/` detrás de funciones async. Las páginas no cambian cuando llegue la BD.
- **Sí:** leaderboards como arrays fijos escritos a mano. Se parecen a filas de BD.
- **No:** portar `seededScores()`. Generador que no representa datos reales.
- **Sí:** componentes compartidos en `app/components/`. Coherente con `app/data/`.
- **Sí:** filtros y pestañas en estado cliente (`useState`). Simple.
- **No:** search params. Requieren Suspense con `cacheComponents` y no son necesarios todavía.
- **Sí:** `app/not-found.tsx` con estilo arcade.
- **Sí:** contador `CRÉDITOS · 03` estático.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents` rechaza acceso a datos fuera de `"use cache"`/Suspense en rutas dinámicas | Datos fijos + `generateStaticParams` en `/games/[id]` y `/games/[id]/play`. Consultar `node_modules/next/dist/docs/` antes de escribir cada página. |
| Hydration mismatch por `toLocaleString("es-ES")` en servidor vs cliente | Formatear con locale explícito `"es-ES"` siempre. |
| Clases de Tailwind del scaffold chocan con el tema | `app/page.tsx` se reescribe completo; no quedan clases `zinc`/`dark:`. |
| Tilt 3D manipula `style` directo vía ref | Aislado en `GameCard` cliente; no afecta SSR. |

## Lo que **no** entra en este spec

- Juegos reales.
- Puntaje dinámico.
- Autenticación (real o mock) y estado de usuario.
- Persistencia de puntuaciones y fila `TU MEJOR MARCA`.
- Base de datos / API.
- Filtros en URL.
- Login social.

Cada uno, si llega, va en su propio spec.
