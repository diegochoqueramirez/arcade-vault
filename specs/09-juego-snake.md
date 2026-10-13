# SPEC 09 — Juego Snake jugable con leaderboard en `/games/snake/play`

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-13
> **Objetivo:** Crear un Snake clásico en TypeScript como juego `snake`, con frutas de `references/source-assets/snake-assets/fruits.png`, ficha en Supabase y guardado real de puntuación sobre el registro genérico de juegos.

## Por qué existe este spec

Es el cuarto juego real y el primero **sin original jugable**: `references/starter-games/` no tiene Snake.
La única referencia es `references/source-assets/snake-assets/` (`fruits.png` + `sprites.js`, un atlas de frutas).
El flujo `/nuevo-juego` solo porta juegos de `starter-games/`; aquí se hace una excepción explícita (decisión del usuario): el gameplay se diseña en este spec y el motor sigue el patrón de SPEC 05.
El registro genérico ya existe (SPEC 07): añadirlo = motor + entrada en `GAME_ENGINES` + id en `PLAYABLE_GAMES` + seed.

## Alcance

**Dentro:**

- Migración seed con la fila `snake` en `games`; `scores` sin filas de `snake`.
- Copia de `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
- Motor nuevo en `app/lib/games/snake/` (TypeScript estricto, sin estado mutable de módulo).
- Canvas 800×600: barra de HUD de 40 px arriba y tablero de 20×14 celdas de 40 px debajo (origen `(0, 40)`).
- Serpiente inicial de 3 segmentos en las celdas `(5,7)`, `(4,7)`, `(3,7)`, avanzando a la derecha desde el primer frame.
- Movimiento por ticks: 150 ms por paso en nivel 1, −10 ms por nivel, mínimo 60 ms.
- Controles: flechas y `W`/`A`/`S`/`D`; cola de hasta 2 giros pendientes; se ignora el giro de 180°.
- Comer fruta: +10 puntos, la serpiente crece 1 segmento, aparece otra fruta en una celda libre al azar.
- Nivel: sube 1 cada 5 frutas (nivel = `1 + floor(frutas / 5)`).
- Muerte: chocar con un muro o con el propio cuerpo → game over. Entrar en la celda que deja la cola en ese mismo paso no es choque.
- Victoria: si no queda celda libre para la fruta → fin de partida.
- Frutas: fila pixel de `fruits.png` (22 sprites, al azar), dibujadas con su proporción dentro de la celda.
- Aspecto: fondo `#0a0a18` con tablero ajedrezado sutil; serpiente verde (`#00ff88` cabeza, `#00c46a` cuerpo) con ojos en la cabeza.
- HUD del canvas: `Score: <n>` (izquierda), `Nivel: <n>` (centro), `Longitud: <n>` (derecha), `bold 18px monospace` blanco.
- Overlays de canvas: `GAME OVER` (muerte o `FIN`) y `¡TABLERO COMPLETO!` (victoria), sin texto de reinicio.
- `player-hud`: puntuación, nivel y `extra` `LONGITUD`; sin vidas.
- Pausa con overlay React `EN PAUSA` (`P`/`Escape`), autopausa al ocultar la pestaña, `FIN`, `JUGAR DE NUEVO`, guardado real y `VER RANKING`, igual que los demás juegos.
- Actualizar `CLAUDE.md` (juegos jugables y origen de Snake).

**Fuera de alcance (para specs futuros):**

- Sonidos y música: no hay assets de audio.
- Muros que se atraviesan (wrap). Decisión del usuario.
- Filas cartoon y realista de `fruits.png`. Decisión del usuario.
- Frutas con valores distintos, power-ups, obstáculos, modos de juego.
- Reutilizar el placeholder `serpentina`; `app/data/games.ts` no cambia. Decisión del usuario.
- Portada nueva: se reutiliza `cover-snake`.
- Controles táctiles / móvil, control de volumen.
- Crear un starter-game en `references/starter-games/`.
- Cambios de schema en Supabase.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`.

`supabase/migrations/<YYYYMMDDHHMMSS>_seed_snake.sql` (timestamp del momento de aplicarla):

```sql
-- SPEC 09: fila de snake en games. scores empieza vacía.
insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'snake',
  'SNAKE',
  'Come frutas, crece y no choques con los muros ni contigo.',
  'Guía a la serpiente con las flechas o WASD por un tablero de 20×14. Cada fruta vale 10 puntos y te alarga un segmento. Cada 5 frutas subes de nivel y la serpiente acelera. Chocar con un muro o con tu propia cola termina la partida.',
  'ARCADE',
  'cover-snake',
  'green',
  '0'
);
```

### Registro

```ts
// app/lib/games/playable.ts
export const PLAYABLE_GAMES = [
  "asteroids",
  "tetris",
  "arkanoid",
  "snake",
] as const;

// app/lib/games/registry.ts
// snake: { create: createSnakeGame, width: 800, height: 600 }
```

### Motor Snake

```ts
// app/lib/games/snake/engine.ts
export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
// Snapshot emitido: { score, level, paused, extra: [{ label: "LONGITUD", value: "<n>" }] }

// Estado interno (closure): snake (Cell[], cabeza en [0]), dir, dirQueue (Dir[], máx. 2),
// fruit { cell, sprite }, fruitsEaten, score, level, status ("playing" | "gameover" | "win"),
// paused, stepAcc (ms acumulados), sheet (HTMLImageElement), sheetReady, rafId, lastTime
type Cell = { col: number; row: number };
type Dir = "up" | "down" | "left" | "right";
```

Archivos:

- `app/lib/games/snake/constants.ts` — `W = 800`, `H = 600`, `HUD_H = 40`, `CELL = 40`, `COLS = 20`, `ROWS = 14`, `START_CELLS`, `BASE_STEP_MS = 150`, `STEP_MS_PER_LEVEL = 10`, `MIN_STEP_MS = 60`, `FRUITS_PER_LEVEL = 5`, `POINTS_PER_FRUIT = 10`, `MAX_QUEUED_TURNS = 2`, `FRUIT_SPRITES` (22 recortes `{ sx, sy, sw, sh }`), `ASSETS.fruits = "/games/snake/fruits.png"`, colores.
- `app/lib/games/snake/entities.ts` — clases `Snake` (segmentos, `step(grow)`, `hits(cell)`, `draw(ctx)`) y `Fruit` (`draw(ctx, sheet)`); `drawSprite` con ajuste de proporción.
- `app/lib/games/snake/engine.ts` — estado, carga del sprite, input, loop por ticks, colisiones, niveles, HUD del canvas, overlays de fin, `createSnakeGame`.

`FRUIT_SPRITES` (fila pixel, `sy = 136`, `sh = 160`; `sx`/`sw` de `sprites.js`, verificados por píxeles). Los nombres de `sprites.js` están desplazados respecto a la imagen; se usan los reales:

```ts
// apple 34/110, banana 186/150, pineapple 378/110, grape 540/130, pumpkin 712/130,
// turnip 894/110, eggplant 1066/110, strawberry 1228/130, cherry 1400/130, carrot 1582/110,
// mushroom 1734/150, broccoli 1906/150, watermelon 2068/170, pepper 2250/140, kiwi 2432/130,
// lemon 2604/130, orange 2786/110, peach 2948/130, peanut 3110/150, raspberry 3302/110,
// tomato 3454/150, bowl 3637/130
```

Convenciones:

- `dt` en segundos limitado a 0.05; `stepAcc += dt * 1000` y se da un paso por cada `stepMs(level)` acumulado.
- Hasta que `fruits.png` carga, el loop pinta solo el fondo y no llama a `update`.
- Un giro de la cola se aplica por paso; un giro igual a la dirección actual o a su opuesta se descarta al encolar.
- Teclado en `window`: `preventDefault` solo en flechas; `W`/`A`/`S`/`D` por `e.code` (`KeyW`…).
- Fruta: `drawImage` escalado para caber en `CELL − 8` manteniendo proporción, centrado en la celda.

## Plan de implementación

1. **Registro genérico.** No aplica: existe desde SPEC 07.
2. **Ficha en Supabase.** Escribir y aplicar `<ts>_seed_snake.sql` con `apply_migration` (`seed_snake`). Verificar con `execute_sql`: fila en `games`, `best = 0`, 0 filas en `scores` para `snake`; `get_advisors` solo con los avisos conocidos. Reiniciar `npm run dev`. Verificar: `/games` lista SNAKE; `/games/snake` con "Mejor global" 0 y ranking vacío; `/games/snake/play` muestra el placeholder.
3. **Assets.** `cp references/source-assets/snake-assets/fruits.png public/games/snake/fruits.png` (sin `sprites.js`). Verificar: `references/` sin cambios en `git status`.
4. **Motor.** Crear `constants.ts`, `entities.ts`, `engine.ts` en `app/lib/games/snake/`. Verificar: `npm run build`.
5. **Alta en la plataforma.** Añadir `snake` a `GAME_ENGINES` y a `PLAYABLE_GAMES`. Verificar: `/games/snake/play` se juega según este spec; guardar crea una fila en `scores`.
6. **UI nueva.** No aplica: portada `cover-snake` existente; el HUD usa puntuación, nivel y `extra`, ya soportados.
7. **`CLAUDE.md`.** Añadir Snake (SPEC 09) a los juegos jugables e indicar que su motor es propio, con assets de `references/source-assets/snake-assets/`.

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `supabase/migrations/` tiene un único `.sql` nuevo: `<ts>_seed_snake.sql`. _`20261013063016_seed_snake.sql`._
- [x] `execute_sql`: `games` tiene la fila `snake`; `game_stats.best` de `snake` = 0 antes de jugar.
- [x] `public/games/snake/fruits.png` existe y es idéntico al de `references/source-assets/snake-assets/`. _Verificado con `cmp`._
- [x] `/games` lista SNAKE, también con el filtro `ARCADE`. _No aparece con `PUZZLE`._
- [x] `/games/snake` muestra "Mejor global" 0 y ranking vacío sin errores. _"Mejor global 0" visto por HTTP antes de jugar; ranking vacío solo verificado por SQL (0 filas)._
- [x] `/games/snake/play` muestra un `<canvas>` 800×600 lógico dentro del `.crt-screen`, sin errores ni warnings de `key` en consola.
- [x] La partida empieza con una serpiente de 3 segmentos moviéndose a la derecha y una fruta pixel visible en una celda libre. _Cabeza en `(5,7)`, HUD `0 / 01 / 3`._
- [x] Flechas y `WASD` giran la serpiente; un giro de 180° se ignora; las flechas no hacen scroll. _`S` giró abajo, `W` (180°) ignorado; `preventDefault` en flechas revisado en código._
- [x] Comer una fruta suma exactamente 10, alarga la serpiente 1 segmento y aparece otra fruta fuera del cuerpo. _Longitud 3→9 y puntuación 0→60 en 6 frutas._
- [x] A las 5 frutas el nivel pasa a 2 y la serpiente avanza más rápido (140 ms por paso). _Nivel 2 verificado; los 140 ms salen de `stepMs()` en código, sin medir._
- [x] Chocar con un muro o con el cuerpo muestra `GAME OVER` en el canvas y abre el modal `FIN DEL JUEGO` con la puntuación final. _Muro verificado; choque con el cuerpo solo revisado en código._
- [x] El `player-hud` muestra puntuación, nivel y `LONGITUD` iguales al HUD del canvas; no muestra vidas.
- [x] `P` → overlay `EN PAUSA` y botón `REANUDAR`; `Escape` reanuda; en pausa la serpiente no se mueve y las teclas de dirección no encolan giros.
- [x] Ocultar la pestaña pausa; al volver sigue pausado. _Simulado con `document.hidden` + `visibilitychange`._
- [x] `FIN` abre el modal con la puntuación actual; ninguna tecla reinicia en game over.
- [x] En el input, `ace_01` se ve `ACE_01`; espacio, `P` y `WASD` no afectan al juego. _Tecleado real con la partida terminada; `isEditable()` revisado en código._
- [x] Guardar `ACE_01` crea una fila en `scores` con `game_id = 'snake'`, `player_name = 'ACE_01'`, `user_id` null. _Dos filas reales: 60 y 30._
- [x] `VER RANKING` lleva a `/games/snake` con la fila (fecha `dd/mm/aaaa`) sin reiniciar el servidor; si la puntuación > 0, "Mejor global" se actualiza.
- [x] `/hall-of-fame` tiene pestaña Snake con la fila.
- [x] Nombre `JOSÉ!` → `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _` y ninguna fila nueva.
- [x] `JUGAR DE NUEVO` empieza partida con puntuación 0, nivel 1 y longitud 3; se puede volver a guardar.
- [x] Un solo loop en Strict Mode (la serpiente va a velocidad normal: ~6–7 pasos/s en nivel 1). _Playwright corría a ~14 fps: 5 pasos en 1,2 s (más lento por el límite de `dt`, no el doble). Con un loop duplicado iría al doble._
- [ ] `onStateChange` no se dispara en frames sin cambios. _Solo revisado en código (`emitStateIfChanged`); sin medir con contador._
- [ ] `SALIR` y `VOLVER AL VAULT` no dejan loop ni listeners activos. _Solo revisado en código (`destroy()` cancela rAF y quita `keydown` y `visibilitychange`)._
- [ ] `saveScore` con `gameId: "serpentina"`, `score: -1`, `score: 1.5` o `score: 10000000` → `{ ok: false, error: "invalid" }` sin insertar. _Solo revisado en código (`isPlayable` + validaciones); no ejecutado._
- [x] Varias filas con el mismo nombre no producen warnings de `key`.
- [x] Regresión: `/games/asteroids/play`, `/games/tetris/play` y `/games/arkanoid/play` se juegan y pausan como antes. _Canvas animado, `P` pausa y `Escape` reanuda en los tres._
- [x] Ningún archivo de `references/` cambia.
- [x] `CLAUDE.md` lista Asteroids, Tetris, Arkanoid y Snake como juegos jugables.

## Decisiones

- **Sí:** Snake clásico de diseño propio, sin original en `starter-games/`. Decisión del usuario; excepción a la regla de `/nuevo-juego`, que solo porta juegos existentes.
- **No:** crear antes un starter-game vanilla en `references/starter-games/`. Descartado por el usuario.
- **Sí:** id `snake`, título `SNAKE`, `cat = ARCADE`, `cover = cover-snake`, `color = green`. Decisión del usuario; la portada existente ya dibuja una serpiente.
- **No:** reutilizar el placeholder `serpentina`. Descartado por el usuario; sigue en `app/data/games.ts` como referencia.
- **Sí:** muros que matan, +10 por fruta, nivel cada 5 frutas con aceleración. Decisión del usuario.
- **No:** muros atravesables ni reglas tipo Google Snake (+1, sin niveles). Descartado por el usuario.
- **Sí:** fila pixel de `fruits.png`. Decisión del usuario; es la que mapea `sprites.js` y encaja con la estética CRT.
- **Sí:** nombres de fruta corregidos en `FRUIT_SPRITES`. Los de `sprites.js` no coinciden con la imagen (p. ej. `banana` en `x = 34` es una manzana); las coordenadas sí son correctas.
- **Sí:** canvas 800×600 (4:3) con tablero 20×14 de 40 px y barra de HUD de 40 px. Mismo tamaño que Asteroids y Arkanoid: sin letterbox y celdas cuadradas.
- **Sí:** movimiento por ticks acumulando `dt`. Mantiene la regla de `dt ≤ 0.05`; la velocidad no depende de los FPS por encima de 20 fps (por debajo, el recorte la frena, como en los demás juegos).
- **Sí:** cola de 2 giros. Permite giros rápidos (p. ej. arriba + izquierda en un mismo tick) sin perder pulsaciones.
- **Sí:** `player-hud` con puntuación, nivel y `extra` `LONGITUD`; sin vidas. Snake tiene una sola vida.
- **Sí:** tablero lleno = fin de partida con `¡TABLERO COMPLETO!`. Evita un estado sin celda libre para la fruta.
- **No:** sonido. No hay assets de audio en la referencia.
- **No:** cambios de schema ni regenerar tipos. La puntuación máxima (277 frutas × 10 = 2770) cabe en el CHECK de `scores`.
- **Sí (durante implementación):** la migración se aplicó como `20261013063016_seed_snake.sql`. `get_advisors` solo mostró los avisos conocidos (RLS desactivada y `public.rls_auto_enable()`).
- **Sí (durante implementación):** quedan dos filas reales `ACE_01` (60 y 30 puntos) de la verificación en el ranking de Snake.
- **Sí (durante implementación):** las coordenadas de la fila pixel se verificaron por píxeles con `sharp`; coinciden con `sprites.js` (bandas `y = 136–295`).
- **No (durante implementación):** guardar partidas de prueba en Asteroids, Tetris y Arkanoid. Evita filas falsas en sus rankings.
- **No:** puntuaciones demo. El ranking se llena con partidas reales.

## Riesgos

| Riesgo                                                       | Mitigación                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Seed aplicado por MCP no invalida la caché `"use cache"`     | Reiniciar `npm run dev` tras el paso 2.                                   |
| `npm run build` prerenderiza `/games/snake` y falla sin seed | El seed (paso 2) va antes del motor y del alta.                           |
| `fruits.png` (3790×442) tarda en cargar                      | El loop no simula hasta `sheetReady`; la serpiente no se mueve sin verse. |
| Sin original, "jugable" es subjetivo                         | Reglas y números concretos en este spec; criterios booleanos.             |
| Giros rápidos que se pierden o permiten morder el cuello     | Cola de 2 giros validada contra la última dirección encolada.             |

## Lo que **no** entra en este spec

- Sonidos y música.
- Muros atravesables, power-ups, obstáculos, frutas con valores distintos.
- Filas cartoon/realista de frutas.
- Placeholder `serpentina` y portada nueva.
- Controles táctiles, volumen/mute.
- Starter-game de Snake en `references/`.
- Cambios de schema.

Cada uno, si llega, va en su propio spec.
