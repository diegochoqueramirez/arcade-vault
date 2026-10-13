# SPEC 07 — Juego Tetris jugable con leaderboard en `/games/tetris/play`

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-13
> **Objetivo:** Portar a TypeScript el Tetris de `references/starter-games/03-tetris` como juego `tetris` con ficha en Supabase y guardado real de puntuación, creando el registro genérico de juegos que sustituye el caso especial de Asteroids.

## Por qué existe este spec

Es el segundo juego real: hasta ahora `GamePlayer` y `saveScore` tienen `asteroids` cableado (`if (game.id === "asteroids")`, `SAVEABLE_GAMES`).
SPEC 05 aplazó el registro genérico "hasta que exista el segundo juego"; este spec lo crea.
Con el registro, añadir un juego futuro = motor + entrada en `GAME_ENGINES` + id en `PLAYABLE_GAMES` + seed.
El original es un `game.js` con globals, listener en `document`, panel lateral DOM y overlay DOM; no se monta tal cual en React.

## Alcance

**Dentro:**

- Registro genérico: `app/lib/games/types.ts`, `app/lib/games/playable.ts`, `app/lib/games/registry.ts`, `app/components/GameCanvas.tsx`.
- Asteroids adaptado a los tipos genéricos sin cambiar su comportamiento; `app/components/AsteroidsCanvas.tsx` se elimina.
- `GamePlayer` monta el motor de `GAME_ENGINES[game.id]`; HUD oculta vidas/nivel si vienen `undefined` y pinta `extra`.
- `saveScore` valida `gameId` con `isPlayable` en lugar de `SAVEABLE_GAMES`.
- Migración seed con la fila `tetris` en `games`; `scores` sin filas de `tetris`.
- Portar `references/starter-games/03-tetris/game.js` a TypeScript estricto en `app/lib/games/tetris/`, sin estado mutable de módulo.
- Gameplay idéntico al original salvo la pieza extra: tablero 10×20, 7 piezas estándar (I, O, T, S, Z, J, L), rotación horaria con wall kicks `[0, -1, 1, -2, 2]`, soft drop, hard drop, ghost piece (α 0.2), vista previa de la siguiente pieza.
- Puntuación idéntica: `[0, 100, 300, 500, 800] × nivel`; soft drop +1 por fila; hard drop +2 por celda.
- Nivel `floor(lines / 10) + 1`; caída `max(100, 1000 − (level − 1) × 90)` ms.
- Canvas lógico 800×600 (4:3): tablero 300×600 + panel lateral original dibujado en el canvas (`SCORE`, `LINES`, `LEVEL`, `NEXT`, `CONTROLS`), con los colores del tema oscuro original.
- Game over en canvas: velo oscuro + `GAME OVER` + `Puntuación: <n>`, sin botón ni texto de reinicio.
- `player-hud`: puntuación, nivel y líneas (vía `extra`); sin vidas.
- Controles de teclado: `←`/`→` mover, `↑`/`X` rotar, `↓` soft drop, `Space` hard drop, `P`/`Escape` pausa.
- Pausa con overlay React `EN PAUSA`, autopausa al ocultar la pestaña, `FIN`, `JUGAR DE NUEVO`, guardado real y `VER RANKING`, igual que Asteroids.
- Actualizar `CLAUDE.md` (juegos jugables y registro).

**Fuera de alcance (para specs futuros):**

- La pieza extra `N` ("tuerca") del original. Decisión del usuario.
- Toggle de tema claro/oscuro del original y su `localStorage`.
- Sonido y sprites: el original no tiene `assets/`; no se crea `public/games/tetris/`.
- Controles táctiles / móvil.
- DAS/ARR propios: la repetición de movimiento la da la autorrepetición de teclado del sistema, como en el original.
- Hold piece, bolsa 7-bag, rotación antihoraria, SRS completo.
- Insertar el placeholder `caida` (u otros) en Supabase; `app/data/games.ts` no cambia.
- Portada nueva `cover-tetris`; se reutiliza `cover-tetro`.
- Arkanoid y demás juegos de `references/starter-games/`.
- Cambios de schema en Supabase.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`.

`supabase/migrations/<YYYYMMDDHHMMSS>_seed_tetris.sql` (timestamp del momento de aplicarla):

```sql
-- SPEC 07: fila de tetris en games. scores empieza vacía.
insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'tetris',
  'TETRIS',
  'Encaja las piezas y limpia líneas antes de llegar al techo.',
  'El clásico de bloques en un tablero de 10×20 con las 7 piezas estándar. Rota con wall kicks, baja rápido o suelta en caída instantánea y guíate por la pieza fantasma y la vista previa. Cada 10 líneas sube el nivel y la caída se acelera.',
  'PUZZLE',
  'cover-tetro',
  'magenta',
  '0'
);
```

### Registro genérico

```ts
// app/lib/games/types.ts
export interface GameSnapshot {
  score: number;
  paused: boolean;
  lives?: number;
  level?: number;
  extra?: { label: string; value: string }[];
}
export interface GameCallbacks {
  onStateChange(s: GameSnapshot): void; // solo si algún campo cambia
  onGameOver(finalScore: number): void; // una vez por partida
}
export interface GameEngine {
  pause(): void;
  resume(): void;
  togglePause(): void;
  end(): void;
  restart(): void;
  destroy(): void;
}
export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;

// app/lib/games/playable.ts — sin dependencias; lo importan cliente y Server Action
export const PLAYABLE_GAMES = ["asteroids", "tetris"] as const;
export function isPlayable(id: unknown): id is (typeof PLAYABLE_GAMES)[number];

// app/lib/games/registry.ts — cliente
export const GAME_ENGINES: Record<
  string,
  { create: GameFactory; width: number; height: number }
>;
// { asteroids: { create: createAsteroidsGame, width: 800, height: 600 },
//   tetris:    { create: createTetrisGame,    width: 800, height: 600 } }
```

### Motor Tetris

```ts
// app/lib/games/tetris/engine.ts
export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
// Snapshot emitido: { score, level, paused, extra: [{ label: "Líneas", value: String(lines) }] }

// Estado interno (closure): board (ROWS×COLS, 0 = vacío, 1–7 = color), current, next,
// score, lines, level, dropInterval, dropAccum, status ("playing" | "gameover"), paused, rafId, lastTs
```

Archivos:

- `app/lib/games/tetris/constants.ts` — `W = 800`, `H = 600`, `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `COLORS` (7), `PIECES` (7), `LINE_SCORES`, offsets del tablero y del panel, colores del tema oscuro (`#0f0f17`, `#1a1a25`, `#2a2a3a`, `#22222e`, `#555570`, `#7aa2f7`, `#e57373`…).
- `app/lib/games/tetris/entities.ts` — clase `Piece` (`type`, `shape`, `x`, `y`; `rotated()`), `randomPiece()`, `rotateCW`, `drawBlock(ctx, …)`.
- `app/lib/games/tetris/engine.ts` — estado, colisiones, line clear, input, loop, dibujo de tablero/panel/game over, `createTetrisGame`.

Convenciones:

- Layout del canvas: fondo `#0f0f17`; tablero en `x = 160, y = 0` (300×600, fondo `#1a1a25`, borde `#2a2a3a`); panel en `x = 480`, 160 px de ancho, gap 20 px como el original; preview `NEXT` 120×120.
- Grid del tablero con `#22222e` fijo (el original lo leía de la variable CSS del tema).
- `dt` en segundos limitado a 0.05; `dropAccum` en ms (`dt × 1000`); al superar `dropInterval` se pone a 0, como el original.
- Input por `keydown` en `window`, una acción por evento (incluye autorrepetición). No hay mapa de teclas pulsadas, así que `clearInput()` no tiene estado que limpiar; pausado o en `gameover` se ignoran las teclas de juego.
- `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`.
- Puntuación en el canvas con `toLocaleString("es-ES")`, igual que el `player-hud`.

## Plan de implementación

1. **Registro genérico.** Crear `types.ts`, `playable.ts`, `registry.ts` (solo `asteroids`) y `GameCanvas.tsx` (callbacks en `ref`, motor en `useEffect([])` destruido en cleanup, `useImperativeHandle`, canvas `position:absolute; inset:0; width:100%; height:100%; object-fit:contain`). Adaptar `createAsteroidsGame` a `GameFactory`. `GamePlayer` usa `GAME_ENGINES[game.id]`, HUD condicional y `extra`. `saveScore` usa `isPlayable`. Eliminar `AsteroidsCanvas.tsx`. Verificar: `npm run build`; Asteroids se juega, pausa y guarda igual que antes.
2. **Ficha en Supabase.** Escribir y aplicar `<ts>_seed_tetris.sql` con `apply_migration` (`seed_tetris`). Verificar con `execute_sql` fila en `games`, `best = 0`, 0 filas en `scores` para `tetris`; `get_advisors` solo avisa de RLS. Reiniciar `npm run dev`. Verificar: `/games` lista TETRIS; `/games/tetris` con "Mejor global" 0 y ranking vacío; `/games/tetris/play` muestra el placeholder.
3. **Assets.** No aplica: el original no tiene `assets/`.
4. **Motor.** Crear `constants.ts`, `entities.ts`, `engine.ts` en `app/lib/games/tetris/`. Verificar: `npm run build`.
5. **Alta en la plataforma.** Añadir `tetris` a `GAME_ENGINES` y a `PLAYABLE_GAMES`. Verificar: `/games/tetris/play` se juega igual que `references/starter-games/03-tetris/index.html` (sin tuerca ni toggle de tema); guardar crea fila en `scores`.
6. **UI nueva.** No aplica: portada `cover-tetro` existente; el HUD `extra` usa las clases `hud-stat` existentes.
7. **`CLAUDE.md`.** Sustituir "Asteroids is the only real game" por los juegos jugables y documentar el registro (`app/lib/games/`).

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `app/components/AsteroidsCanvas.tsx` no existe; `GamePlayer` no contiene `game.id === "asteroids"` y `saveScore` no contiene `SAVEABLE_GAMES`.
- [x] `supabase/migrations/` tiene un único `.sql` nuevo: `<ts>_seed_tetris.sql`.
- [x] `execute_sql`: `games` tiene la fila `tetris`; `game_stats.best` de `tetris` = 0 antes de jugar.
- [x] `/games` lista TETRIS, también con el filtro `PUZZLE`.
- [x] `/games/tetris` muestra "Mejor global" 0 y ranking vacío sin errores.
- [x] `/games/tetris/play` muestra un `<canvas>` 800×600 lógico dentro del `.crt-screen`, sin errores ni warnings de `key` en consola.
- [x] El canvas muestra tablero 10×20 con grid, ghost piece y panel `SCORE`, `LINES`, `LEVEL`, `NEXT`, `CONTROLS` con los colores del original.
- [x] Solo aparecen las 7 piezas estándar; nunca la tuerca.
- [x] `←` `→` mueven, `↑` y `X` rotan (con wall kick junto a la pared), `↓` baja 1 fila y suma 1, `Space` suelta la pieza y suma 2 por celda; ninguna de esas teclas hace scroll.
- [x] Limpiar 1/2/3/4 líneas suma 100/300/500/800 × nivel; cada 10 líneas sube el nivel y la caída se acelera.
- [x] El `player-hud` muestra puntuación, nivel y líneas iguales al panel del canvas en todo momento y no muestra vidas.
- [ ] `onStateChange` no se dispara en frames sin cambios. _Solo revisado en código (`emitStateIfChanged`); sin medir con contador._
- [x] `P` → overlay `EN PAUSA` y botón `REANUDAR`; `Escape` reanuda; pausado la pieza no cae.
- [x] Ocultar la pestaña pausa; al volver sigue pausado.
- [x] Una pieza que colisiona al aparecer abre el modal `FIN DEL JUEGO` con la puntuación final; el canvas muestra `GAME OVER` sin texto de reinicio.
- [x] `FIN` abre el modal con la puntuación actual; ninguna tecla reinicia en game over.
- [x] En el input, `ace_01` se ve `ACE_01`; espacio y `P` no afectan al juego.
- [x] Guardar `ACE_01` crea una fila en `scores` con `game_id = 'tetris'`, `player_name = 'ACE_01'`, `user_id` null.
- [x] `VER RANKING` lleva a `/games/tetris` con la fila (fecha `dd/mm/aaaa`) sin reiniciar el servidor; si la puntuación > 0, "Mejor global" se actualiza.
- [x] `/hall-of-fame` tiene pestaña Tetris con la fila.
- [x] Nombre `JOSÉ!` → `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _` y ninguna fila nueva.
- [x] `JUGAR DE NUEVO` empieza partida con puntuación 0, nivel 1, 0 líneas y tablero vacío; se puede volver a guardar.
- [x] Un solo loop en Strict Mode (la pieza cae a 1 fila/s en nivel 1).
- [x] `SALIR` y `VOLVER AL VAULT` no dejan loop ni listeners activos.
- [ ] `saveScore` con `gameId: "caida"`, `score: -1`, `score: 1.5` o `score: 10000000` → `{ ok: false, error: "invalid" }` sin insertar. _Solo revisado en código (`isPlayable`); no ejecutado._
- [ ] Varias filas con el mismo nombre no producen warnings de `key`. _No verificable aún: Tetris tiene una sola fila._
- [ ] Regresión: `/games/asteroids/play` se juega, pausa y guarda como antes (HUD con vidas y nivel). _Juega y pausa verificados; guardado no probado por decisión del usuario (no ensuciar el ranking de Asteroids)._
- [x] Ningún archivo de `references/` cambia.
- [x] `CLAUDE.md` lista Asteroids y Tetris como juegos jugables y describe el registro.

## Decisiones

- **Sí:** id propio `tetris`, título `TETRIS`, textos basados en el README. Decisión del usuario.
- **No:** reutilizar el placeholder `caida`. Descartado por el usuario; `caida` sigue en `app/data/games.ts` como referencia.
- **Sí:** `cat = PUZZLE`, `cover = cover-tetro`. La portada existente ya representa piezas cayendo; sin cambios en `globals.css`.
- **Sí:** `color = magenta`. Distingue a Tetris de Asteroids (cyan) y casa con el degradado violeta de `cover-tetro`.
- **Sí:** canvas 800×600 con tablero + panel original dibujados. Decisión del usuario; 4:3 exacto, sin letterbox.
- **No:** canvas 480×600 o 300×600 con letterbox. Descartado por el usuario; pantalla estrecha.
- **Sí:** `player-hud` con puntuación, nivel y líneas (`extra`). Decisión del usuario; Tetris no tiene vidas.
- **Sí:** solo 7 piezas; se quita la tuerca `N` del original. Decisión del usuario; Tetris clásico como describe el README.
- **No:** toggle de tema claro/oscuro. Decisión del usuario; se fija el tema oscuro original.
- **Sí:** overlay de pausa del original → overlay React `EN PAUSA`; game over → canvas sin reinicio + modal React; botón `Reiniciar` → `JUGAR DE NUEVO`. Patrón SPEC 05.
- **Sí:** `Escape` también pausa. Convención de la plataforma (SPEC 05), no está en el original.
- **Sí:** input por evento `keydown` con autorrepetición del sistema. Idéntico al original; no se inventa DAS/ARR.
- **Sí:** grid con color fijo `#22222e`. El original lo leía de una variable CSS del tema eliminado.
- **Sí:** `dt` limitado a 0.05 s. Regla del patrón; a 60 fps no altera la velocidad de caída.
- **Sí:** registro genérico en este spec. SPEC 05 lo aplazó hasta el segundo juego.
- **Sí:** `object-fit: contain` en `GameCanvas`. Letterbox gratis si un juego futuro no es 4:3; hoy ambos son 800×600.
- **Sí:** `PLAYABLE_GAMES` en un módulo sin dependencias. Lo importan la Server Action y el cliente sin arrastrar motores.
- **No:** cambios de schema ni regenerar tipos. `scores`, `game_stats` y grants de SPEC 06 bastan.
- **No:** puntuaciones demo. El ranking se llena con partidas reales.
- **No:** sonido ni `public/games/tetris/`. El original no tiene assets.
- **Sí (durante implementación):** en game over no se dibujan la pieza que no cabe ni su ghost. El original congelaba el frame previo; el resultado visual es equivalente.
- **Sí (durante implementación):** `P`/`Escape` nunca llegan al juego, ni siquiera en game over (allí se ignoran).
- **Sí (durante implementación):** game over con `ctx.filter = "blur(4px)"` sobre el propio canvas + velo `rgba(10,10,20,0.75)`. Replica el `backdrop-filter` del overlay original.
- **Sí (durante implementación):** sin función `clearInput()` en el motor de Tetris. No hay mapa de teclas pulsadas que limpiar.
- **Sí (durante implementación):** la migración se aplicó como `20261013054103_seed_tetris.sql`. `get_advisors` mostró, además de RLS, dos avisos previos sobre `public.rls_auto_enable()` (SECURITY DEFINER ejecutable por `anon`/`authenticated`); quedan para otro spec.
- **No (decisión del usuario):** guardar una partida de prueba en Asteroids durante la verificación. Evita una fila falsa en su ranking.

## Riesgos

| Riesgo                                                        | Mitigación                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| El refactor del registro rompe Asteroids                      | Paso 1 aislado con verificación de regresión antes de tocar Tetris.                           |
| Seed aplicado por MCP no invalida la caché `"use cache"`      | Reiniciar `npm run dev` tras el paso 2.                                                       |
| `npm run build` prerenderiza `/games/tetris` y falla sin seed | El seed (paso 2) va antes del motor y del alta.                                               |
| `ctx.letterSpacing` no soportado en algún navegador           | Solo afecta al espaciado de etiquetas; el texto se sigue dibujando.                           |
| Autorrepetición de `Space` encadena hard drops                | Comportamiento idéntico al original; aceptado.                                                |
| Soft drop suma puntos con `↓` mantenido rápidamente           | Idéntico al original (+1 por fila); el máximo de `scores` (9.999.999) acota valores absurdos. |

## Lo que **no** entra en este spec

- Pieza tuerca y toggle de tema del original.
- Sonido, sprites, controles táctiles.
- DAS/ARR, hold, 7-bag, SRS.
- Placeholder `caida` y portada nueva.
- Otros juegos de `references/starter-games/`.
- Cambios de schema.

Cada uno, si llega, va en su propio spec.
