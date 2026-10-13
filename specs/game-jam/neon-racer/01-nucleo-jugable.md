# GAME JAM neon-racer · SPEC 01 — Núcleo jugable de Neon Racer en `/games/neon-racer/play`

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-13
> **Objetivo:** Crear un juego de carreras top-down sin fin, `neon-racer`, con motor propio en TypeScript, tráfico generado siempre con un hueco transitable, ficha en Supabase y guardado real de puntuación sobre el registro genérico de juegos.

## Por qué existe este spec

El usuario pidió **Neon Racer**: carreras top-down sin fin esquivando tráfico, con puntuación = distancia + adelantamientos y velocidad creciente. Es el primer juego de carreras de la plataforma.
No hay starter-game ni assets de coches en `references/`: el motor es original (precedente: SPEC 09, Snake) y todo el arte se dibuja proceduralmente con primitivas de canvas.
Adaptación a la plataforma: canvas lógico 800×600 con una autopista vertical de 5 carriles, solo teclado (girar y frenar), una única puntuación entera y 3 vidas para que una partida dure varios minutos.
El riesgo central es la **generación justa del tráfico**: este spec fija un algoritmo de "carril seguro" y una restricción numérica entre velocidad, separación de filas y velocidad lateral que garantiza que siempre existe un hueco alcanzable.
Esta fase deja el ciclo completo jugar → game over → guardar → ranking; niveles, combos y meta llegan en SPEC 02.

## Alcance

**Dentro:**

- Migración seed con la fila `neon-racer` en `games`; `scores` sin filas de `neon-racer`.
- Motor nuevo en `app/lib/games/neon-racer/` (TypeScript estricto, sin estado mutable de módulo).
- Canvas 800×600: barra de HUD de 40 px arriba; autopista de 5 carriles de 80 px (`x = 200…600`) que ocupa toda la altura; arcenes a ambos lados (`x = 0…200` y `600…800`).
- Coche del jugador 40×70 en `y = 470` (fija), empieza centrado en el carril 2 (el central, `x = 380`).
- Controles: `←`/`→` y `A`/`D` mueven el coche lateralmente a 480 px/s, sin salir de la calzada (`x ∈ [204, 556]`); `↓`/`S` mantenido frena.
- Velocidad automática del jugador: objetivo `min(900, 300 + 5 × t)` px/s (`t` = segundos jugados sin pausa); la velocidad real se acerca al objetivo a 200 px/s². Frenar fija el objetivo en `objetivo × 0.6` y desacelera a 600 px/s².
- Tráfico: coches 40×70 centrados en su carril, todos a 140 px/s hacia delante, por lo que bajan por la pantalla a `velocidad − 140` px/s. Colores al azar de `TRAFFIC_COLORS`.
- Generación por filas: la primera fila aparece a los 1500 ms; después, una fila nueva en `y = −70` cada vez que la última ha bajado 340 px. Cada fila bloquea de 1 a 3 carriles según el algoritmo de carril seguro (ver Modelo de datos).
- Puntuación: `floor(metros / 10)` por distancia (1 m = 10 px recorridos) + 50 por adelantamiento (un coche cuyo borde superior pasa por debajo del borde inferior del jugador). Puntuación limitada a 9.999.999.
- Choque (AABB con 4 px de margen interior en ambos coches): −1 vida, el coche golpeado desaparece, la velocidad cae a `max(300, velocidad × 0.5)` y el jugador es invulnerable 2000 ms (parpadeo cada 100 ms). Un coche tocado durante la invulnerabilidad no puntúa al adelantarlo.
- 3 vidas; con 0 vidas → game over.
- Aspecto procedural: fondo `#05050f`, calzada `#101024`, bordes de calzada cian `#00f5ff` de 4 px, líneas de carril discontinuas (40 px trazo / 40 px hueco) que se desplazan con la distancia, arcenes con rejilla magenta de 40 px que también se desplaza; coches como rectángulos redondeados con parabrisas y pilotos.
- HUD del canvas: `Score: <n>` (izquierda), `Distancia: <n> m` (centro), vidas como 3 coches cian de 12×20 (derecha), `bold 18px monospace` blanco sobre barra `#0a0a18`.
- Overlay de canvas `GAME OVER` (0 vidas o `FIN`), sin texto de reinicio.
- `player-hud`: puntuación y vidas; sin nivel ni `extra` en esta fase.
- Pausa con overlay React `EN PAUSA` (`P`/`Escape`), autopausa al ocultar la pestaña, `FIN`, `JUGAR DE NUEVO`, guardado real y `VER RANKING`, igual que los demás juegos.
- Actualizar `CLAUDE.md` (juegos jugables y origen de Neon Racer).

**Fuera de alcance (para specs futuros):**

- Niveles por distancia, curva de velocidad por nivel, densidad de tráfico variable (SPEC 02).
- Combos, multiplicador, adelantamientos al límite, bonus de nivel, meta y victoria (SPEC 02).
- `extra` del `player-hud` (distancia, velocidad, combo) y overlays de fin con estadísticas (SPEC 02).
- Sonido, partículas, screen shake, flashes, brillo neón y portada `cover-neon-racer` (SPEC 03).
- Tráfico que cambia de carril, velocidades de tráfico distintas, obstáculos, power-ups (turbo, escudo).
- Acelerar con `↑`, modos de juego, coches seleccionables.
- Controles táctiles / móvil, control de volumen.
- Cambios de schema en Supabase.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`.

`supabase/migrations/<YYYYMMDDHHMMSS>_seed_neon_racer.sql` (timestamp del momento de aplicarla):

```sql
-- GAME JAM neon-racer · SPEC 01: fila de neon-racer en games. scores empieza vacía.
insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'neon-racer',
  'NEON RACER',
  'Esquiva el tráfico a toda velocidad y adelanta para sumar puntos.',
  'Conduce por una autopista neón de 5 carriles: muévete con las flechas o A/D y frena con ↓ o S. La velocidad no deja de subir; esquiva el tráfico, adelanta coches y suma metros recorridos. Tienes 3 vidas y cada choque te frena y te da 2 segundos de invulnerabilidad.',
  'ARCADE',
  'cover-rana',
  'magenta',
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
  "neon-racer",
] as const;

// app/lib/games/registry.ts
// "neon-racer": { create: createNeonRacerGame, width: 800, height: 600 }
```

### Motor Neon Racer

```ts
// app/lib/games/neon-racer/engine.ts
export function createNeonRacerGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
// Snapshot emitido: { score, lives, paused }

// Estado interno (closure): player (PlayerCar), traffic (TrafficCar[]), safeLane (0–4),
// lastRowY (y de la última fila generada, null si no hay), graceMs, speed, targetSpeed,
// elapsed (s jugados), distancePx, overtakePoints, score, lives, invulnMs,
// status ("playing" | "gameover"), paused, keys { left, right, brake }, rafId, lastTime
type Status = "playing" | "gameover";
type Keys = { left: boolean; right: boolean; brake: boolean };
type Row = { lanes: number[]; safe: number }; // carriles bloqueados + nuevo carril seguro
```

Archivos:

- `app/lib/games/neon-racer/constants.ts` — `W = 800`, `H = 600`, `HUD_H = 40`, `LANES = 5`, `LANE_W = 80`, `ROAD_X = 200`, `ROAD_W = 400`, `PLAYER_W = 40`, `PLAYER_H = 70`, `PLAYER_Y = 470`, `PLAYER_START_LANE = 2`, `PLAYER_MIN_X = 204`, `PLAYER_MAX_X = 556`, `STEER_SPEED = 480`, `CAR_W = 40`, `CAR_H = 70`, `HITBOX_INSET = 4`, `BASE_SPEED = 300`, `MAX_SPEED = 900`, `SPEED_RAMP = 5` (px/s por segundo), `ACCEL = 200`, `BRAKE_DECEL = 600`, `BRAKE_FACTOR = 0.6`, `TRAFFIC_SPEED = 140`, `ROW_GAP = 340`, `MIN_CARS_PER_ROW = 1`, `MAX_CARS_PER_ROW = 3`, `START_GRACE_MS = 1500`, `LIVES = 3`, `INVULN_MS = 2000`, `BLINK_MS = 100`, `CRASH_SPEED_FACTOR = 0.5`, `PX_PER_METER = 10`, `METERS_PER_POINT = 10`, `POINTS_PER_OVERTAKE = 50`, `MAX_SCORE = 9_999_999`, `DASH_LEN = 40`, `DASH_GAP = 40`, `GRID_SIZE = 40`, `COLORS` (`background #05050f`, `road #101024`, `edge #00f5ff`, `dash #3a3a5a`, `grid #ff006e33`, `hudBar #0a0a18`, `hudLine #ff006e`, `player #00f5ff`, `windshield #0a0a18`, `tailLight #ff2244`), `TRAFFIC_COLORS = ["#ff006e", "#f5ff00", "#00ff88", "#ff7700", "#aa00ff"]`.
- `app/lib/games/neon-racer/entities.ts` — clases `PlayerCar` (`x`, `y`; `hitbox()`, `draw(ctx, visible)`) y `TrafficCar` (`lane`, `y`, `color`, `counted`, `touched`; `x` derivada del carril, `hitbox()`, `draw(ctx)`); funciones puras `laneX(lane)`, `overlaps(a, b)` y `generateRow(prevSafe, minCars, maxCars, rand = Math.random): Row`; `drawCar(ctx, x, y, w, h, body)` compartida.
- `app/lib/games/neon-racer/engine.ts` — estado, input, loop, velocidad, generación de filas, colisiones, puntuación, HUD del canvas, overlay de fin, `createNeonRacerGame`.

Algoritmo de carril seguro (`generateRow`):

1. `safe = clamp(prevSafe + randInt(−1, 1), 0, 4)`.
2. Reservados (siempre libres en esta fila): `prevSafe` y `safe`.
3. Candidatos = los otros 3 o 4 carriles, barajados (Fisher–Yates con `rand`).
4. `count = randInt(minCars, min(maxCars, candidatos.length))`; bloqueados = los `count` primeros candidatos.
5. Devuelve `{ lanes: bloqueados, safe }`; el motor guarda `safe` como nuevo `safeLane`. `safeLane` empieza en `PLAYER_START_LANE` en cada partida.

Así, en cada fila N quedan libres `S(N−1)` y `S(N)`: el jugador cruza la fila N por `S(N−1)` y cambia a `S(N)` en el hueco entre las filas N y N+1, donde `S(N)` sigue libre.
Garantía numérica (comprobada con los valores de `constants.ts`): `ROW_GAP ≥ CAR_H + PLAYER_H + (MAX_SPEED − TRAFFIC_SPEED) × LANE_W / STEER_SPEED` → `340 ≥ 70 + 70 + 760 × 80 / 480 = 266,7`. Además `BASE_SPEED × BRAKE_FACTOR = 180 > TRAFFIC_SPEED = 140`: el tráfico nunca sube por la pantalla, ni frenando.

Puntuación máxima: con velocidad máxima constante el ritmo teórico es 9 pts/s por distancia + `(760 / 340) × 3 × 50 ≈ 335` pts/s por adelantamientos ≈ 344 pts/s; llegar a 9.999.999 exigiría más de 8 h sin chocar. Aun así el motor limita `score` a `MAX_SCORE`. SPEC 02 añade una meta que acota la partida.

Convenciones:

- `dt` en segundos limitado a 0.05; `graceMs` e `invulnMs` se descuentan con `dt × 1000`.
- Orden de `update(dt)`: velocidad → posición lateral → distancia → desplazamiento del tráfico (`y += (speed − TRAFFIC_SPEED) × dt`) → generación de fila → colisiones → adelantamientos → limpieza de coches con `y > H` → puntuación.
- Teclado en `window`: `keydown`/`keyup` alimentan `keys` por `e.code` (`ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`, `ArrowDown`/`KeyS`); `preventDefault` solo en flechas; con izquierda y derecha a la vez no hay movimiento lateral. Se ignoran eventos con `target` editable.
- `clearInput()` pone `keys` a `false` al pausar, reanudar, terminar y reiniciar (evita coche "pegado" a un lado tras la pausa).
- Sin assets: no se crea `public/games/neon-racer/` y el loop simula desde el primer frame.
- Desplazamiento visual de líneas de carril y rejilla = `distancePx mod (DASH_LEN + DASH_GAP)` y `distancePx mod GRID_SIZE`.
- `score = min(MAX_SCORE, floor(distancePx / PX_PER_METER / METERS_PER_POINT) + overtakePoints)`.
- `emitStateIfChanged()` compara `score`, `lives` y `paused`; la distancia solo cambia el score cada 10 m (≤ 9 emisiones/s).

## Plan de implementación

1. **Registro genérico.** No aplica: existe desde SPEC 07.
2. **Ficha en Supabase.** Escribir y aplicar `<ts>_seed_neon_racer.sql` con `apply_migration` (`seed_neon_racer`). Verificar con `execute_sql`: fila en `games`, `best = 0`, 0 filas en `scores` para `neon-racer`; `get_advisors` solo con los avisos conocidos. Reiniciar `npm run dev`. Verificar: `/games` lista NEON RACER; `/games/neon-racer` con "Mejor global" 0 y ranking vacío; `/games/neon-racer/play` muestra el placeholder.
3. **Assets.** No aplica: arte procedural; no se crea `public/games/neon-racer/`. Verificar: `references/` sin cambios en `git status`.
4. **Motor.** Crear `constants.ts`, `entities.ts`, `engine.ts` en `app/lib/games/neon-racer/`. Verificar: `npm run build`; `generateRow` con `rand` fijo devuelve 1–3 carriles bloqueados que nunca incluyen `prevSafe` ni `safe` (revisión de código o script temporal fuera del repo).
5. **Alta en la plataforma.** Añadir `"neon-racer"` a `GAME_ENGINES` y a `PLAYABLE_GAMES`. Verificar: `/games/neon-racer/play` se juega según este spec; guardar crea una fila en `scores`.
6. **UI nueva.** No aplica: portada provisional `cover-rana` existente; el HUD usa puntuación y vidas, ya soportados.
7. **`CLAUDE.md`.** Añadir Neon Racer (GAME JAM neon-racer · SPEC 01) a los juegos jugables e indicar que su motor es propio y sin assets (arte procedural).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `supabase/migrations/` tiene un único `.sql` nuevo: `<ts>_seed_neon_racer.sql`.
- [ ] `execute_sql`: `games` tiene la fila `neon-racer`; `game_stats.best` de `neon-racer` = 0 antes de jugar.
- [ ] `/games` lista NEON RACER, también con el filtro `ARCADE`; no aparece con `PUZZLE`.
- [ ] `/games/neon-racer` muestra "Mejor global" 0 y ranking vacío sin errores.
- [ ] `/games/neon-racer/play` muestra un `<canvas>` 800×600 lógico dentro del `.crt-screen`, sin errores ni warnings de `key` en consola.
- [ ] La partida empieza con el coche cian en el carril central, calzada de 5 carriles con líneas y rejilla desplazándose, y sin tráfico durante 1,5 s.
- [ ] `←`/`→` y `A`/`D` mueven el coche lateralmente sin salir de la calzada; `↓`/`S` frena visiblemente; las flechas no hacen scroll.
- [ ] La velocidad sube sola con el tiempo (las líneas de carril se desplazan cada vez más rápido) hasta un máximo de 900 px/s.
- [ ] Ninguna fila bloquea más de 3 carriles y en 3 minutos de partida observada nunca aparece una fila o combinación de filas consecutivas sin camino transitable.
- [ ] Las constantes cumplen `ROW_GAP ≥ CAR_H + PLAYER_H + (MAX_SPEED − TRAFFIC_SPEED) × LANE_W / STEER_SPEED` y `BASE_SPEED × BRAKE_FACTOR > TRAFFIC_SPEED`.
- [ ] Adelantar un coche suma exactamente 50; la distancia suma 1 punto cada 10 m y el HUD muestra `Distancia: <n> m`.
- [ ] Chocar resta 1 vida, elimina el coche golpeado, frena el coche y lo hace parpadear 2 s sin nuevos choques; un coche atravesado en ese tiempo no suma 50.
- [ ] Con 0 vidas el canvas muestra `GAME OVER` y se abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] El `player-hud` muestra puntuación y vidas iguales al HUD del canvas; no muestra nivel.
- [ ] `P` → overlay `EN PAUSA` y botón `REANUDAR`; `Escape` reanuda; en pausa ni el tráfico ni la distancia avanzan y las flechas no mueven el coche.
- [ ] Tras pausar con `→` mantenido y reanudar, el coche no sigue moviéndose solo.
- [ ] Ocultar la pestaña pausa; al volver sigue pausado.
- [ ] `FIN` abre el modal con la puntuación actual; ninguna tecla reinicia en game over.
- [ ] En el input, `ace_01` se ve `ACE_01`; espacio, `P`, `A`, `D` y `S` no afectan al juego.
- [ ] Guardar `ACE_01` crea una fila en `scores` con `game_id = 'neon-racer'`, `player_name = 'ACE_01'`, `user_id` null.
- [ ] `VER RANKING` lleva a `/games/neon-racer` con la fila (fecha `dd/mm/aaaa`) sin reiniciar el servidor; si la puntuación > 0, "Mejor global" se actualiza.
- [ ] `/hall-of-fame` tiene pestaña Neon Racer con la fila.
- [ ] Nombre `JOSÉ!` → `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _` y ninguna fila nueva.
- [ ] `JUGAR DE NUEVO` empieza partida con puntuación 0, 3 vidas, velocidad 300 px/s, carril central y sin tráfico; se puede volver a guardar.
- [ ] Un solo loop en Strict Mode (el tráfico baja a velocidad normal, no al doble).
- [ ] `onStateChange` no se dispara en frames sin cambios.
- [ ] `SALIR` y `VOLVER AL VAULT` no dejan loop ni listeners activos (`keydown`, `keyup`, `visibilitychange`).
- [ ] `saveScore` con `gameId: "neon"`, `score: -1`, `score: 1.5` o `score: 10000000` → `{ ok: false, error: "invalid" }` sin insertar.
- [ ] Varias filas con el mismo nombre no producen warnings de `key`.
- [ ] Regresión: `/games/asteroids/play`, `/games/tetris/play`, `/games/arkanoid/play` y `/games/snake/play` se juegan y pausan como antes.
- [ ] Ningún archivo de `references/` cambia.
- [ ] `CLAUDE.md` lista Neon Racer junto a los demás juegos jugables.

## Decisiones

- **Sí:** juego Neon Racer, carreras top-down sin fin esquivando tráfico, score = distancia + adelantamientos, velocidad creciente. Decisión del usuario.
- **Sí:** motor original y arte 100 % procedural. Decisión del usuario (no hay starter game ni assets); sigue el precedente de SPEC 09.
- **Sí:** id `neon-racer`, título `NEON RACER`. Decisión del agente (revisar); nombre genérico, sin marca registrada.
- **Sí:** `cat = ARCADE`. Decisión del agente (revisar); no existe categoría de carreras en `CATEGORIES` y añadirla sería cambio de schema (CHECK de `games.cat`).
- **Sí:** `color = magenta`. Decisión del agente (revisar); casa con la rejilla magenta de los arcenes.
- **Sí:** portada provisional `cover-rana` (franjas horizontales tipo carriles). Decisión del agente (revisar); la portada propia `cover-neon-racer` llega en SPEC 03.
- **Sí:** autopista vertical de 5 carriles de 80 px centrada en el canvas 800×600. Decisión del agente (revisar); 5 carriles dejan margen para bloquear hasta 3 sin cerrar el paso.
- **Sí:** movimiento lateral libre (480 px/s) en lugar de saltos de carril. Decisión del agente (revisar); se siente más a conducción y permite esquivas al límite (SPEC 02).
- **Sí:** freno con `↓`/`S` a 0,6× la velocidad objetivo; sin tecla de acelerar. Decisión del agente (revisar); da control sin romper la invariante de que el tráfico siempre baja.
- **Sí:** todo el tráfico a la misma velocidad (140 px/s). Decisión del agente (revisar); el patrón de filas es rígido y la garantía de carril seguro no se rompe por coches que se alcanzan entre sí.
- **Sí:** algoritmo de carril seguro con desplazamiento máximo de 1 carril por fila y restricción numérica `ROW_GAP ≥ 266,7`. Riesgo señalado por el usuario (siempre debe existir un hueco transitable).
- **Sí:** 3 vidas con 2 s de invulnerabilidad y frenazo al chocar. Decisión del agente (revisar); con un solo golpe las partidas de principiante durarían menos de 2 min.
- **Sí:** 1 m = 10 px; 1 punto cada 10 m; 50 por adelantamiento. Decisión del agente (revisar); los adelantamientos pesan más que la distancia para premiar el riesgo.
- **Sí:** `score` limitado a 9.999.999 en el motor. El CHECK de `scores` rechazaría un valor mayor.
- **No:** nivel ni `extra` en el `player-hud` en esta fase. Llegan en SPEC 02 con los niveles.
- **No:** sonido ni efectos. SPEC 03.
- **No:** cambios de schema ni regenerar tipos. La puntuación cabe en el CHECK de `scores`.
- **No:** puntuaciones demo. El ranking se llena con partidas reales.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Seed aplicado por MCP no invalida la caché `"use cache"`          | Reiniciar `npm run dev` tras el paso 2.                                                                          |
| `npm run build` prerenderiza `/games/neon-racer` y falla sin seed | El seed (paso 2) va antes del motor y del alta.                                                                  |
| Tráfico que cierra todos los carriles (partida injusta)           | Carril seguro reservado en cada fila, desplazamiento ≤ 1 carril y `ROW_GAP` validado contra la velocidad máxima. |
| Tras un choque el jugador queda lejos del carril seguro           | 2 s de invulnerabilidad (960 px de desplazamiento lateral posible) y frenazo a la mitad.                         |
| Arte procedural poco legible a alta velocidad                     | Coches de colores saturados sobre calzada oscura; brillo y estelas en SPEC 03.                                   |
| `keyup` perdido al cambiar de pestaña deja una tecla "pegada"     | `visibilitychange` pausa y `clearInput()` limpia `keys` al pausar y reanudar.                                    |
| `onStateChange` disparado cada frame por la distancia             | La distancia solo afecta al snapshot vía `score`, que cambia cada 10 m.                                          |

## Lo que **no** entra en este spec

- Niveles, combos, adelantamientos al límite, meta y `extra` del HUD.
- Sonido, partículas, screen shake, flashes y portada propia.
- Tráfico con cambios de carril o velocidades distintas, obstáculos, power-ups.
- Controles táctiles, volumen/mute.
- Cambios de schema.

Cada uno, si llega, va en su propio spec.
