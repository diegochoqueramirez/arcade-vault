# SPEC 02 — Página de inicio (landing)

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar la landing de `references/templates/home-about/home.jsx` en `/` como primer tab `Inicio` del Nav, moviendo la Biblioteca a `/games`.

## Por qué existe este spec

El nuevo template `references/templates/home-about/` añade una landing (Inicio) y un tab Acerca de.
Hoy `/` es la Biblioteca (SPEC 01), así que la landing necesita la raíz y la Biblioteca se reubica en `/games`, coherente con `/games/[id]`.
Los estilos de la landing no están en `app/globals.css` y hay que portarlos.

## Alcance

**Dentro:**

- Ruta `/` — Inicio, réplica fiel de `home.jsx`:
  - Hero con `FloatingSilhouettes` (8 SVG pixel), eyebrow `▸ INSERTA UNA MONEDA_`, título en 3 líneas, subtítulo, CTAs `▶ EXPLORAR JUEGOS` (→ `/games`) y `✦ CREAR CUENTA` (→ `/login`), indicador `DESLIZA ▼`.
  - `// 01 ¿POR QUÉ ARCADE VAULT?`: 4 `feature-card` con `FeatureIcon` (GAMEPAD, FREE, TROPHY, ROCKET).
  - `// 02 JUEGOS DISPONIBLES AHORA`: `mini-rail` con los 6 primeros juegos de `getGames()`; clic → `/games/<id>`; botón `VER TODOS LOS JUEGOS →` → `/games`.
  - Stats: `12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING` (texto fijo en el componente).
  - `// 03 ACTIVIDAD EN VIVO`: ticker `ÚLTIMAS PUNTUACIONES` (7 filas) y `TOP JUGADORES · HOY` (5 filas con barra) con link `VER SALÓN →` → `/hall-of-fame`.
  - `// 04 PRECIOS`: tarjeta `JUGADOR VAULT $0`, botón `EMPEZAR GRATIS →` → `/login`, sello `FREE PLAY`, 3 FAQ (texto fijo).
  - CTA final `¿LISTO PARA JUGAR?` con `INSERTAR MONEDA →` → `/games`.
  - Animación `.reveal` → `.in` por `IntersectionObserver` al hacer scroll.
- Ruta `/games` — Biblioteca: mismo contenido que el `/` actual (se mueve, no cambia).
- Nav: nuevo link `Inicio` como **primer** tab en barra de escritorio y panel móvil. `Inicio` activo solo en `/`; `Biblioteca` activa en `/games` y `/games/*`.
- Actualizar destinos de links existentes:
  - Logo → `/` (sin cambio de destino, ahora es Inicio).
  - `app/not-found.tsx` → `/` (sin cambio).
  - `VOLVER AL VAULT` (detalle y modal del reproductor), `VOLVER A LA BIBLIOTECA` (Salón), redirecciones de `AuthForm` (submit y `JUGAR COMO INVITADO`) → `/games`.
- Portar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css` (incluye `.kicker`, `@keyframes float` y lo que esos bloques definan).
- Datos ficticios del ticker y top jugadores en `app/data/activity.ts` detrás de funciones async.

**Fuera de alcance (para specs futuros):**

- Tab y página `Acerca de` (`about.jsx`, formulario de contacto).
- Bloques CSS `ABOUT PAGE`, `GAMEPAD`, `Theme variants`.
- Actividad real/en vivo (polling, websockets) y timestamps relativos calculados.
- Stats reales (conteo de juegos/partidas).
- Abrir `/login` directamente en la pestaña `CREAR CUENTA` (search params).
- Estado de usuario en el Nav (sigue mostrando `Iniciar Sesión`).

## Modelo de datos

`app/data/activity.ts`:

```ts
import type { GameColor } from "./games";

export interface RecentScore {
  player: string;   // "NEONFOX"
  game: string;     // título visible, p.ej. "Caída"
  score: number;
  ago: string;      // texto fijo, p.ej. "hace 2 min"
  color: GameColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

// 7 filas fijas copiadas de home.jsx, en el mismo orden.
export async function getRecentScores(): Promise<RecentScore[]>;

// 5 filas fijas copiadas de home.jsx, ordenadas por rank.
export async function getTopPlayersToday(): Promise<TopPlayer[]>;
```

Convenciones (heredadas de SPEC 01):

- Números con `toLocaleString("es-ES")`.
- La página nunca importa arrays de `app/data/`; solo usa `getGames`, `getRecentScores`, `getTopPlayersToday`.
- Textos de features, stats, precios y FAQ son copy de marketing: quedan fijos en el componente, no en `app/data/`.

## Plan de implementación

1. Mover la Biblioteca: crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (`getGames()` + `<Library />`). Dejar `app/page.tsx` temporalmente igual. Verificar: `/games` muestra la Biblioteca y `/games/<id>` sigue funcionando.
2. Actualizar destinos a `/games` en `app/games/[id]/page.tsx`, `GamePlayer.tsx`, `HallOfFame.tsx` y `AuthForm.tsx`. Verificar: cada botón/redirección lleva a `/games`.
3. Portar bloques `HOME PAGE`, `ACTIVITY`, `PRICING` de `references/templates/home-about/styles.css` al final de `app/globals.css`. Verificar: `npm run build` compila y no cambia el aspecto de pantallas existentes.
4. Crear `app/data/activity.ts` con tipos, datos fijos y funciones async. Verificar: `npm run build` compila.
5. Crear componentes en `app/components/`:
   - `FloatingSilhouettes.tsx` y `FeatureIcon.tsx` (servidor, SVG puros).
   - `MiniCard.tsx` (servidor, `Link` a `/games/<id>`).
   - `RevealObserver.tsx` (cliente, sin markup: registra `IntersectionObserver` sobre `.reveal` y añade `in`; desconecta al desmontar).
   - `Home.tsx` (servidor) con todas las secciones; recibe `games`, `recentScores`, `topPlayers` por props.
6. Reemplazar `app/page.tsx` por la página Inicio que obtiene datos con `getGames()`, `getRecentScores()`, `getTopPlayersToday()` y renderiza `<Home />` + `<RevealObserver />`. Verificar: `/` muestra la landing y las secciones aparecen al hacer scroll.
7. Nav: añadir sección `"inicio"` a `sectionFor` (`pathname === "/"`), cambiar `Biblioteca` a `href="/games"` activa en `/games*`, y agregar `Inicio` como primer link en barra y panel móvil. Verificar: link activo correcto en `/`, `/games`, `/games/<id>`, `/hall-of-fame`.
8. Pulir con `/frontend-design` solo huecos que la réplica deje (si los hay). `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `/` renderiza la landing con las secciones Hero, `// 01`, `// 02`, stats, `// 03`, `// 04` y CTA final, sin errores en consola.
- [x] `/` usa las mismas clases CSS que `home.jsx` y se ve igual lado a lado con `references/templates/home-about/arcade-vault-standalone.html`.
- [x] Las 8 siluetas del hero flotan animadas.
- [x] Las secciones `.reveal` empiezan ocultas y reciben la clase `in` al entrar en viewport.
- [x] `// 02` muestra exactamente 6 mini-cards; clic en una lleva a `/games/<id>`.
- [x] El ticker muestra 7 filas y el top 5 filas, con números formateados `es-ES` (p.ej. `184.220`).
- [x] `EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →` e `INSERTAR MONEDA →` llevan a `/games`.
- [x] `CREAR CUENTA` y `EMPEZAR GRATIS →` llevan a `/login`.
- [x] `VER SALÓN →` lleva a `/hall-of-fame`.
- [x] `/games` muestra la Biblioteca con búsqueda, chips y estado vacío funcionando como en SPEC 01.
- [x] `Inicio` es el primer link del Nav en escritorio y en el panel móvil.
- [x] `Inicio` tiene clase `active` solo en `/`; `Biblioteca` en `/games` y `/games/<id>`; `Salón de la Fama` en `/hall-of-fame`.
- [x] El logo lleva a `/`.
- [x] `VOLVER AL VAULT` (detalle y modal de fin), `VOLVER A LA BIBLIOTECA` (Salón), submit de login y `JUGAR COMO INVITADO` llevan a `/games`.
- [x] `/games/xyz` y rutas desconocidas muestran not-found con botón a `/`.
- [x] La página de Inicio no importa arrays de `app/data/` directamente.
- [x] `app/globals.css` no incluye los bloques `ABOUT PAGE`, `GAMEPAD` ni `Theme variants`.

## Decisiones

- **Sí:** Inicio en `/`, Biblioteca en `/games`. La landing es lo primero que se ve y `/games` es coherente con `/games/[id]`.
- **No:** Inicio en `/home`. La raíz no mostraría la landing.
- **Sí:** solo tab `Inicio` en este spec.
- **No:** incluir `Acerca de`. Tiene formulario propio; va en su spec.
- **Sí:** réplica fiel de `home.jsx` + `/frontend-design` solo en huecos. Consistente con SPEC 01.
- **No:** reinterpretar el diseño.
- **Sí:** `app/data/activity.ts` con funciones async para ticker y top. Mismo patrón que SPEC 01, listo para BD.
- **No:** hardcodear filas en el componente ni derivarlas de `getLeaderboard()` (no tiene timestamps).
- **Sí:** stats, features, precios y FAQ como texto fijo en el componente. Es copy, no datos.
- **Sí:** portar solo bloques `HOME PAGE`, `ACTIVITY`, `PRICING`.
- **No:** reemplazar `globals.css` completo. Trae CSS sin usar y puede pisar ajustes de PRs previos.
- **Sí:** logo y not-found → `/`; botones "volver a biblioteca/vault" y redirecciones de login → `/games`. Los textos de esos botones nombran la Biblioteca.
- **Sí:** CTAs de cuenta → `/login` sin params.
- **No:** `/login?tab=signup`. Requiere Suspense con `cacheComponents`; se deja para un spec futuro.
- **Sí:** `Home` servidor + `RevealObserver` cliente mínimo. Evita convertir toda la landing en componente cliente.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Clases del bloque HOME dependen de reglas fuera de los 3 bloques portados (p.ej. `.kicker`, `float`, `.section-title`) | Al portar, buscar cada clase usada en `home.jsx` en `app/globals.css`; si falta, copiarla del template. |
| Reglas portadas chocan con selectores existentes (`.stat-*`, `.final`) | `.stat-strip` y `.modal .final` ya existen; verificar que los nuevos selectores (`.stat-block`, `.final-title`) no los pisen y revisar visualmente detalle y modal de fin. |
| Elementos `.reveal` quedan invisibles si el observer no corre (JS falla o hidratación tardía) | `RevealObserver` se monta en la misma página; verificar en navegador. Aceptado para el MVP. |
| `usePathname` en Nav con `cacheComponents` | Mantener el `Suspense` existente en `Nav.tsx`. |
| Links a `/` olvidados que deberían ir a `/games` | Grep de `href="/"` y `push("/")` en `app/` al cerrar el paso 2. |
