# SPEC 08 — Juego Arkanoid jugable con leaderboard en `/games/arkanoid/play`

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-13
> **Objetivo:** Portar a TypeScript el Arkanoid de `references/starter-games/04-arkanoid` como juego `arkanoid` con ficha en Supabase, sprites, sonidos y guardado real de puntuación sobre el registro genérico de juegos.

## Por qué existe este spec

Es el tercer juego real y el primero con assets (spritesheet + sonidos): estrena `public/games/<id>/`.
El registro genérico ya existe (SPEC 07): añadirlo = motor + entrada en `GAME_ENGINES` + id en `PLAYABLE_GAMES` + seed.
El original es un `game.js` con globals, listeners en `document`, un spritesheet con estado de módulo y un overlay de pausa con selector de nivel dibujado en el canvas.

## Alcance

**Dentro:**

- Migración seed con la fila `arkanoid` en `games`; `scores` sin filas de `arkanoid`.
- Copia de `references/starter-games/04-arkanoid/assets/` a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`.
- Portar `game.js`, `levels.js` y `assets/spritesheet.js` a TypeScript estricto en `app/lib/games/arkanoid/`, sin estado mutable de módulo.
- Gameplay idéntico al original: canvas 800×600 fondo `#000`; paleta 81×14 en `y = 560`; pelota 16×16 con velocidad base `vx = 200`, `vy = −300` px/s; bloques 64×24 en una rejilla de 10×6 con origen `(80, 80)`.
- Movimiento de la paleta con ratón (`mousemove` sobre el canvas) y con `←`/`→` a 400 px/s, sin salir del canvas.
- Rebotes en las paredes izquierda/derecha/techo y en la paleta (invertir `vy`); colisión AABB con un bloque por frame (invertir `vy`).
- Explosión de 4 frames en 150 ms con `EXPLOSION_FRAMES[color]`.
- Puntuación: +10 por bloque, acumulada entre niveles.
- 3 vidas: al caer la pelota se pierde una y la pelota se recoloca sobre la paleta con la velocidad del nivel.
- 5 niveles de `levels.js` (parrilla, pirámide, ajedrez, filas con huecos, marco + cruz) con multiplicadores de velocidad `1.00 / 1.10 / 1.21 / 1.33 / 1.46`; se avanza al siguiente nivel automáticamente.
- Sonidos: `ball-bounce.mp3` en paredes y paleta, `break-sound.mp3` al romper un bloque, solapables (`cloneNode()`).
- HUD del canvas original mientras se juega: `Score: <n>` (izquierda), `Nivel: <n>` (centro), vidas como pelotas (derecha).
- Fin de partida: 0 vidas → overlay de canvas `GAME OVER`; nivel 5 completado → overlay de canvas `¡Completaste el juego!`. Ambos llaman a `gameOver()` (modal `FIN DEL JUEGO`) y no muestran texto de reinicio.
- `player-hud`: puntuación, vidas y nivel; sin `extra`.
- Pausa con overlay React `EN PAUSA` (`P`/`Escape`), autopausa al ocultar la pestaña, `FIN`, `JUGAR DE NUEVO`, guardado real y `VER RANKING`, igual que Asteroids y Tetris.
- Actualizar `CLAUDE.md` (juegos jugables).

**Fuera de alcance (para specs futuros):**

- Selector de nivel (botones 1–5) del overlay de pausa original y su listener `click`. Decisión del usuario.
- Reutilizar el placeholder `bloque-buster`; `app/data/games.ts` no cambia. Decisión del usuario.
- Portada nueva: se reutiliza `cover-bricks`.
- Controles táctiles / móvil.
- Control de volumen o mute.
- Power-ups, ángulo de rebote según el punto de impacto en la paleta, más niveles, música.
- Otros juegos de `references/starter-games/`.
- Cambios de schema en Supabase.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`.

`supabase/migrations/<YYYYMMDDHHMMSS>_seed_arkanoid.sql` (timestamp del momento de aplicarla):

```sql
-- SPEC 08: fila de arkanoid en games. scores empieza vacía.
insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'arkanoid',
  'ARKANOID',
  'Rebota la pelota y rompe los muros de bloques en 5 niveles.',
  'Mueve la paleta con el ratón o las flechas y rebota la pelota para destruir cada bloque. Cinco niveles con patrones distintos: parrilla completa, pirámide, ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota un 10 %. Tienes 3 vidas y cada bloque vale 10 puntos.',
  'ARCADE',
  'cover-bricks',
  'cyan',
  '0'
);
```

### Registro

```ts
// app/lib/games/playable.ts
export const PLAYABLE_GAMES = ["asteroids", "tetris", "arkanoid"] as const;

// app/lib/games/registry.ts
// arkanoid: { create: createArkanoidGame, width: 800, height: 600 }
```

### Motor Arkanoid

```ts
// app/lib/games/arkanoid/engine.ts
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
// Snapshot emitido: { score, lives, level, paused }

// Estado interno (closure): paddle, ball, blocks[], explosions[], score, lives, level (1–5),
// status ("playing" | "gameover" | "win"), paused, keys { ArrowLeft, ArrowRight },
// sheet (HTMLImageElement), sheetReady, sounds { bounce, break }, activeSounds (Set<HTMLAudioElement>),
// rafId, lastTs
```

Archivos:

- `app/lib/games/arkanoid/constants.ts` — `W = 800`, `H = 600`, `PADDLE_SPEED = 400`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = 80`, `BLOCKS_ORIGIN_Y = 80`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, `LIVES = 3`, `POINTS_PER_BLOCK = 10`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION = 150`, `LEVELS` (5 × `{ speed, blocks: { col, row, color }[] }`), rutas `/games/arkanoid/...`.
- `app/lib/games/arkanoid/entities.ts` — clases `Paddle`, `Ball`, `Block`, `Explosion` con `draw(ctx, sheet)`; `drawSprite(ctx, sheet, sprite, x, y, w, h)`.
- `app/lib/games/arkanoid/engine.ts` — estado, carga de assets, input, loop, colisiones, niveles, HUD del canvas, overlays de fin, `createArkanoidGame`.

Convenciones:

- `dt` en segundos limitado a 0.05.
- Hasta que el spritesheet carga, el loop pinta solo el fondo y no llama a `update`. Así la pelota no se mueve sin verse; el original arrancaba el loop tras la carga.
- Ratón: `x * W / rect.width`; la paleta se centra en el cursor y se recorta a `[0, W − 81]`. Se ignora en pausa y fuera de `playing`.
- Teclado en `window`: `←`/`→` alimentan `keys`; `preventDefault` solo en flechas.
- Sonido: `Audio` base creado en la fábrica; cada efecto es `cloneNode()` añadido a `activeSounds` y quitado en `ended`. `play()` lleva `.catch(() => {})` para no ensuciar la consola si el navegador bloquea el autoplay. `pause()` y `destroy()` paran todos los clones activos.
- Fuente del HUD del canvas `bold 18px monospace`, blanco, como el original.

## Plan de implementación

1. **Registro genérico.** No aplica: existe desde SPEC 07.
2. **Ficha en Supabase.** Escribir y aplicar `<ts>_seed_arkanoid.sql` con `apply_migration` (`seed_arkanoid`). Verificar con `execute_sql`: fila en `games`, `best = 0`, 0 filas en `scores` para `arkanoid`; `get_advisors` solo con los avisos conocidos. Reiniciar `npm run dev`. Verificar: `/games` lista ARKANOID; `/games/arkanoid` con "Mejor global" 0 y ranking vacío; `/games/arkanoid/play` muestra el placeholder.
3. **Assets.** `cp` de `spritesheet-breakout.png` y `sounds/*.mp3` a `public/games/arkanoid/` (sin `.DS_Store` ni `spritesheet.js`). Verificar: `references/` sin cambios en `git status`.
4. **Motor.** Crear `constants.ts`, `entities.ts`, `engine.ts` en `app/lib/games/arkanoid/`. Verificar: `npm run build`.
5. **Alta en la plataforma.** Añadir `arkanoid` a `GAME_ENGINES` y a `PLAYABLE_GAMES`. Verificar: `/games/arkanoid/play` se juega igual que `references/starter-games/04-arkanoid/index.html` (sin selector de nivel); guardar crea una fila en `scores`.
6. **UI nueva.** No aplica: portada `cover-bricks` existente; el HUD usa puntuación, vidas y nivel ya soportados.
7. **`CLAUDE.md`.** Añadir Arkanoid (SPEC 08) a los juegos jugables y mencionar `public/games/<id>/` para assets.

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `supabase/migrations/` tiene un único `.sql` nuevo: `<ts>_seed_arkanoid.sql`.
- [x] `execute_sql`: `games` tiene la fila `arkanoid`; `game_stats.best` de `arkanoid` = 0 antes de jugar.
- [x] `public/games/arkanoid/` contiene `spritesheet-breakout.png`, `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3`.
- [x] `/games` lista ARKANOID, también con el filtro `ARCADE`.
- [x] `/games/arkanoid` muestra "Mejor global" 0 y ranking vacío sin errores. _`best = 0` verificado por SQL; la página se vio ya con la primera fila guardada._
- [x] `/games/arkanoid/play` muestra un `<canvas>` 800×600 lógico dentro del `.crt-screen`, sin errores ni warnings de `key` en consola.
- [x] El nivel 1 muestra 60 bloques con sprites (rojo, amarillo, cian, magenta, rosa, verde por fila), paleta y pelota del spritesheet.
- [x] La pelota arranca sola y rebota en paredes, techo y paleta, con sonido de rebote. _Sonido verificado por el usuario._
- [x] El ratón y `←`/`→` mueven la paleta sin salir del canvas; las flechas no hacen scroll.
- [x] Romper un bloque suma exactamente 10, suena `break-sound` y se ve la explosión de 4 frames. _Sonido y explosión verificados por el usuario._
- [x] Romper todos los bloques pasa al nivel siguiente con su patrón y una pelota más rápida. _Verificado por el usuario jugando._
- [x] Perder la pelota resta una vida y la recoloca sobre la paleta; con 0 vidas el canvas muestra `GAME OVER` y se abre el modal `FIN DEL JUEGO` con la puntuación final.
- [x] Completar el nivel 5 muestra `¡Completaste el juego!` en el canvas y abre el modal `FIN DEL JUEGO`. _Verificado por el usuario jugando._
- [x] El `player-hud` muestra puntuación, vidas y nivel iguales al HUD del canvas en todo momento.
- [x] `P` → overlay `EN PAUSA` y botón `REANUDAR`; `Escape` reanuda; en pausa la pelota no se mueve, no suena nada y el ratón no mueve la paleta.
- [x] El overlay de pausa no muestra botones de nivel.
- [x] Ocultar la pestaña pausa; al volver sigue pausado.
- [x] `FIN` abre el modal con la puntuación actual; ninguna tecla reinicia en game over.
- [x] En el input, `ace_01` se ve `ACE_01`; espacio y `P` no afectan al juego.
- [x] Guardar `ACE_01` crea una fila en `scores` con `game_id = 'arkanoid'`, `player_name = 'ACE_01'`, `user_id` null.
- [x] `VER RANKING` lleva a `/games/arkanoid` con la fila (fecha `dd/mm/aaaa`) sin reiniciar el servidor; si la puntuación > 0, "Mejor global" se actualiza.
- [x] `/hall-of-fame` tiene pestaña Arkanoid con la fila.
- [x] Nombre `JOSÉ!` → `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _` y ninguna fila nueva.
- [x] `JUGAR DE NUEVO` empieza partida con puntuación 0, 3 vidas, nivel 1 y 60 bloques; se puede volver a guardar.
- [x] Un solo loop en Strict Mode (la pelota va a velocidad normal).
- [ ] `onStateChange` no se dispara en frames sin cambios. _Solo revisado en código (`emitStateIfChanged`); sin medir con contador._
- [x] `SALIR` y `VOLVER AL VAULT` no dejan loop, listeners ni sonido activos. _`SALIR` probado; limpieza de `destroy()` revisada en código._
- [ ] `saveScore` con `gameId: "bloque-buster"`, `score: -1`, `score: 1.5` o `score: 10000000` → `{ ok: false, error: "invalid" }` sin insertar. _Solo revisado en código (`isPlayable` + validaciones); no ejecutado._
- [x] Varias filas con el mismo nombre no producen warnings de `key`.
- [ ] Regresión: `/games/asteroids/play` y `/games/tetris/play` se juegan, pausan y guardan como antes. _Juegan y pausan verificados; guardado no probado para no ensuciar sus rankings._
- [x] Ningún archivo de `references/` cambia.
- [x] `CLAUDE.md` lista Asteroids, Tetris y Arkanoid como juegos jugables.

## Decisiones

- **Sí:** id propio `arkanoid`, título `ARKANOID`, textos basados en el README. Decisión del usuario; mismo criterio que Tetris.
- **No:** reutilizar el placeholder `bloque-buster`. Descartado por el usuario; sigue en `app/data/games.ts` como referencia.
- **Sí:** `cat = ARCADE`, `cover = cover-bricks`, `color = cyan`. Decisión del usuario; la portada existente ya representa un muro de bloques.
- **No:** selector de nivel 1–5 en la pausa. Decisión del usuario; la pausa es el overlay React (SPEC 05) y saltar de nivel conservando el score permitiría inflar puntos repitiendo niveles.
- **Sí:** `player-hud` con puntuación, vidas y nivel, sin `extra`. Decisión del usuario; coincide con el HUD del canvas.
- **Sí:** victoria (nivel 5 completado) = fin de partida con overlay `¡Completaste el juego!` y modal de guardado. Decisión del usuario.
- **Sí:** paleta de 81 px. Es lo que usa `game.js`; la doc del original (162 px) está desfasada.
- **Sí:** sprites y sonidos en `public/games/arkanoid/`. Decisión por defecto del flujo `/nuevo-juego`.
- **Sí:** `HTMLImageElement` directo en lugar de la copia a canvas offscreen del original. Mismo resultado visual, sin estado de módulo.
- **Sí:** `play().catch(() => {})` y parada de clones activos en `pause()`/`destroy()`. Evita errores de autoplay en consola y sonido tras salir.
- **Sí:** el ratón no mueve la paleta en pausa ni fuera de `playing`. El original sí lo hacía; con la partida congelada no tiene efecto jugable y respeta "pausado = nada cambia".
- **Sí:** `Escape` también pausa. Ya lo hacía el original; además es convención de la plataforma.
- **Sí:** `dt` limitado a 0.05 s. Regla del patrón; evita que la pelota atraviese bloques tras un salto de frame.
- **No:** cambios de schema ni regenerar tipos. `scores`, `game_stats` y grants de SPEC 06 bastan; la puntuación máxima posible (208 bloques × 10 = 2080) cabe en el CHECK.
- **No:** puntuaciones demo. El ranking se llena con partidas reales.
- **Sí (durante implementación):** la migración se aplicó como `20261013060604_seed_arkanoid.sql`. `get_advisors` solo mostró los avisos conocidos (RLS desactivada y `public.rls_auto_enable()`).
- **Sí (durante implementación):** `/games` y `/hall-of-fame` no mostraron Arkanoid hasta reiniciar `npm run dev` tras el seed, aunque un `saveScore` ya había llamado a `updateTag("scores")`. Tras reiniciar, correcto; se mantiene la regla de reiniciar tras SQL por MCP.
- **Sí (durante implementación):** quedan dos filas reales `ACE_01` (10 puntos) de la verificación en el ranking de Arkanoid.
- **No (durante implementación):** guardar partidas de prueba en Asteroids y Tetris. Evita filas falsas en sus rankings.

## Riesgos

| Riesgo                                                             | Mitigación                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Seed aplicado por MCP no invalida la caché `"use cache"`           | Reiniciar `npm run dev` tras el paso 2.                                                |
| `npm run build` prerenderiza `/games/arkanoid` y falla sin seed    | El seed (paso 2) va antes del motor y del alta.                                        |
| El navegador bloquea el audio antes de una interacción             | `play().catch(() => {})`; el juego sigue sin sonido hasta el primer gesto del usuario. |
| Clones de `Audio` siguen sonando tras salir                        | `activeSounds` se para en `destroy()`.                                                 |
| La pelota puede atravesar un bloque o rebotar raro (física simple) | Idéntico al original; aceptado.                                                        |

## Lo que **no** entra en este spec

- Selector de nivel en la pausa.
- Placeholder `bloque-buster` y portada nueva.
- Controles táctiles, volumen/mute, música.
- Power-ups y física de ángulo en la paleta.
- Otros juegos de `references/starter-games/`.
- Cambios de schema.

Cada uno, si llega, va en su propio spec.
