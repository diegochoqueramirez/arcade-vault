# GAME JAM neon-racer · SPEC 02 — Niveles, combos y meta de Neon Racer

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, GAME JAM neon-racer · SPEC 01
> **Fecha:** 2026-10-13
> **Objetivo:** Sustituir la rampa de velocidad continua de Neon Racer por 10 niveles por distancia con velocidad y densidad de tráfico concretas, añadir combos, adelantamientos al límite, bonus y una meta a 25 km, y reflejarlo en el `player-hud` y en los overlays de fin.

## Por qué existe este spec

SPEC 01 deja Neon Racer jugable, pero es una rampa infinita: no hay hitos, el score crece casi lineal y la partida no tiene final acotado.
Esta fase convierte la carrera en una progresión legible: niveles cada 2.500 m que suben velocidad y densidad, un sistema de riesgo/recompensa (combo y adelantamientos al límite) que separa a los buenos jugadores en el ranking, y una meta a 25.000 m que limita la partida a unos 8 min y acota la puntuación máxima.
La garantía de carril seguro de SPEC 01 se mantiene y se valida nivel a nivel.

## Alcance

**Dentro:**

- Niveles 1–10 por distancia: `nivel = min(10, 1 + floor(metros / 2500))`. Al subir: bonus `500 × nuevo nivel`, banner `NIVEL <n>` 1500 ms en el canvas.
- Tabla `LEVELS` (velocidad objetivo px/s, separación de filas px, coches por fila mín.–máx.):

  | Nivel | Velocidad | `rowGap` | Coches/fila |
  | ----- | --------- | -------- | ----------- |
  | 1     | 300       | 440      | 1–2         |
  | 2     | 360       | 420      | 1–2         |
  | 3     | 420       | 400      | 1–3         |
  | 4     | 480       | 380      | 1–3         |
  | 5     | 540       | 360      | 2–3         |
  | 6     | 600       | 340      | 2–3         |
  | 7     | 680       | 320      | 2–3         |
  | 8     | 760       | 300      | 2–3         |
  | 9     | 840       | 300      | 3–3         |
  | 10    | 900       | 300      | 3–3         |

- La velocidad objetivo deja de depender del tiempo: es `LEVELS[nivel − 1].speed` (aceleración 200 px/s², freno 0,6× y frenazo al chocar como en SPEC 01). La partida empieza a 300 px/s.
- Cada fila nueva usa `rowGap`, `minCars` y `maxCars` del nivel vigente al generarla; el algoritmo de carril seguro (`generateRow`) no cambia.
- Meta: al llegar a 25.000 m la partida termina en victoria con bonus `5000 × vidas restantes`.
- Adelantamiento al límite: si mientras el coche adelantado solapaba verticalmente al jugador la distancia horizontal mínima entre hitboxes fue ≤ 12 px y no hubo contacto → +100 × multiplicador extra y popup `¡AL LÍMITE!`.
- Combo: cada adelantamiento puntuable suma 1 al combo y reinicia una ventana de 4000 ms; el combo vuelve a 0 al chocar o si la ventana expira. Multiplicador `min(5, 1 + floor(combo / 10))`; se aplica a los 50 del adelantamiento y a los 100 del límite.
- Popups flotantes en el canvas: `+<n>` (blanco) o `+<n> ¡AL LÍMITE!` (amarillo `#f5ff00`), suben 40 px y se desvanecen en 800 ms desde el centro superior del jugador.
- HUD del canvas: `Score: <n>` (izquierda), `Nivel: <n> · <metros> m` (centro), vidas (derecha); velocímetro `<n> km/h` en el arcén izquierdo con barra de 160×8 px; indicador `x<mult>` y barra de ventana de combo en el arcén derecho; barra vertical de progreso hacia la meta con marcas cada 2.500 m.
- `player-hud`: puntuación, vidas, nivel y `extra` `DISTANCIA`, `VELOCIDAD`, `COMBO`.
- Overlays de fin en el canvas con estadísticas: `GAME OVER` (0 vidas o `FIN`) y `¡META ALCANZADA!` (victoria), cada uno con `Puntuación`, `Distancia`, `Adelantamientos`, `Al límite` y `Nivel`; sin texto de reinicio.
- Ambos finales pasan por el único `gameOver()` y abren el modal `FIN DEL JUEGO`.

**Fuera de alcance (para specs futuros):**

- Sonido, partículas, screen shake, flashes, brillo neón y portada `cover-neon-racer` (SPEC 03).
- Niveles más allá del 10, modo infinito tras la meta, contrarreloj.
- Tráfico con cambios de carril, velocidades distintas por coche, obstáculos fijos, power-ups.
- Cambiar la ficha de Supabase (`short`/`long` siguen siendo válidos) o el schema.
- Guardar estadísticas (distancia, adelantamientos) fuera del score.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`. Sin migraciones nuevas: la fila `neon-racer` de SPEC 01 no cambia.

### Motor Neon Racer

```ts
// app/lib/games/neon-racer/engine.ts (misma firma que SPEC 01)
export function createNeonRacerGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
// Snapshot emitido:
// { score, lives, level, paused,
//   extra: [{ label: "DISTANCIA", value: "12,3 KM" },
//           { label: "VELOCIDAD", value: "320 KM/H" },
//           { label: "COMBO", value: "x3" }] }

// Estado interno (closure) añadido a SPEC 01: level (1–10), combo, comboMs (ventana restante),
// bonusPoints (sustituye a overtakePoints), overtakes, closeCalls, popups (Popup[]), bannerMs,
// status ("playing" | "gameover" | "win"). Se elimina elapsed (ya no hay rampa por tiempo).
type Status = "playing" | "gameover" | "win";
type LevelDef = {
  speed: number;
  rowGap: number;
  minCars: number;
  maxCars: number;
};
```

Archivos (solo los creados en SPEC 01):

- `app/lib/games/neon-racer/constants.ts` — se eliminan `SPEED_RAMP`, `ROW_GAP`, `MIN_CARS_PER_ROW`, `MAX_CARS_PER_ROW`; se añaden `LEVELS: LevelDef[]` (tabla de Alcance), `MAX_LEVEL = 10`, `METERS_PER_LEVEL = 2500`, `GOAL_METERS = 25000`, `LEVEL_BONUS = 500`, `GOAL_BONUS_PER_LIFE = 5000`, `CLOSE_CALL_PX = 12`, `CLOSE_CALL_POINTS = 100`, `COMBO_WINDOW_MS = 4000`, `COMBO_STEP = 10`, `MAX_MULT = 5`, `KMH_PER_PXS = 0.36`, `POPUP_MS = 800`, `POPUP_RISE = 40`, `LEVEL_BANNER_MS = 1500`, `SPEEDO_W = 160`, `SPEEDO_H = 8`, colores `COLORS.combo #f5ff00`, `COLORS.banner #ff006e`, `COLORS.win #00ff88`, `COLORS.progress #00f5ff`. El resto de constantes de SPEC 01 no cambia (`MAX_SPEED = 900` sigue siendo el máximo y coincide con el nivel 10).
- `app/lib/games/neon-racer/entities.ts` — `TrafficCar` añade `minGap` (px, `Infinity` al crearse); nueva clase `Popup` (`text`, `x`, `y`, `color`, `ageMs`; `update(dt)`, `done`, `draw(ctx)`); nueva función pura `horizontalGap(a, b)`.
- `app/lib/games/neon-racer/engine.ts` — niveles, meta, combo, al límite, popups, banner, HUD ampliado, velocímetro, barras de combo y progreso, overlays con estadísticas, snapshot con `level` y `extra`.

Puntuación:

- `score = min(MAX_SCORE, floor(metros / 10) + bonusPoints)`.
- Adelantamiento (coche no `touched`): `combo += 1`; `comboMs = 4000`; `mult = min(5, 1 + floor(combo / 10))`; `bonusPoints += 50 × mult`; si `minGap ≤ 12` → `bonusPoints += 100 × mult`, `closeCalls += 1`.
- Subida de nivel: `bonusPoints += 500 × nivel`. Meta: `bonusPoints += 5000 × vidas`, antes de `gameOver("win")`.

Puntuación máxima (cota superior, < 9.999.999):

- Distancia: 25.000 m / 10 = 2.500.
- Filas: la distancia relativa recorrida en pantalla en cada nivel es `250.000 px / 10 × (1 − 140 / velocidad)`; dividida por su `rowGap` da ≈ 30 + 36 + 42 + 47 + 51 + 56 + 62 + 68 + 69 + 70 ≈ 533 filas (frenar solo las reduce). Con 3 coches/fila: ≤ 1.600 adelantamientos.
- Máximo por adelantamiento: (50 + 100) × 5 = 750 → ≤ 1.200.000.
- Bonus de nivel: 500 × (2 + … + 10) = 27.000. Meta: 5000 × 3 = 15.000.
- Total ≤ 1.244.500. Realista para un buen jugador: 60.000–250.000.

Duración: a velocidad objetivo cada nivel dura 83 / 69 / 60 / 52 / 46 / 42 / 37 / 33 / 30 / 28 s ≈ 8 min hasta la meta sin choques.

Garantía de hueco por nivel (`rowGap ≥ 140 + (velocidad − 140) × 80 / 480`): nivel 1 `440 ≥ 167`, nivel 5 `360 ≥ 207`, nivel 8 `300 ≥ 243`, nivel 10 `300 ≥ 267`; se cumple en los 10.

Convenciones:

- `dt` en segundos limitado a 0.05; `comboMs`, `bannerMs` y `Popup.ageMs` se descuentan con `dt × 1000` y se congelan en pausa.
- `minGap` se actualiza en cada frame en que el coche y el jugador solapan en `y`: `minGap = min(minGap, horizontalGap(hitbox jugador, hitbox coche))`.
- Orden de `update(dt)`: el de SPEC 01 + comprobación de nivel y meta tras sumar distancia + combo/popups/banner al final.
- La meta se comprueba antes que las colisiones del mismo frame: llegar a 25.000 m gana aunque ese frame hubiera choque.
- `extra`: distancia `(metros / 1000).toFixed(1)` con coma decimal + ` KM`; velocidad `round(speed × 0.36 / 10) × 10` + ` KM/H`; combo `x<mult>`. Redondeos elegidos para que `onStateChange` no se dispare cada frame.
- `emitStateIfChanged()` compara `score`, `lives`, `level`, `paused` y los tres valores de `extra` ya formateados.
- Overlays de fin: velo `rgba(0, 0, 0, 0.6)`, título `bold 56px monospace` (blanco en `GAME OVER`, `#00ff88` en `¡META ALCANZADA!`) y 5 líneas `bold 20px monospace` debajo; métricas con `toLocaleString("es-ES")`.
- En `gameover`/`win` no se dibujan popups ni banner.

## Plan de implementación

1. **Registro genérico.** No aplica: existe desde SPEC 07.
2. **Ficha en Supabase.** No aplica: la fila de SPEC 01 sigue vigente. Verificar: `supabase/migrations/` sin archivos nuevos.
3. **Assets.** No aplica: arte procedural.
4. **Motor.** Modificar `constants.ts` (tabla `LEVELS` y constantes de scoring), `entities.ts` (`minGap`, `Popup`, `horizontalGap`) y `engine.ts` (niveles, meta, combo, al límite, HUD, overlays, snapshot). Verificar: `npm run build`; las 10 filas de `LEVELS` cumplen la garantía de hueco.
5. **Alta en la plataforma.** No aplica: `neon-racer` ya está en `GAME_ENGINES` y `PLAYABLE_GAMES`. Verificar: `/games/neon-racer/play` muestra nivel y `extra` en el `player-hud`; guardar sigue creando una fila en `scores`.
6. **UI nueva.** No aplica: el `player-hud` ya pinta `level` y `extra` con `hud-stat` (con `flex-wrap`).
7. **`CLAUDE.md`.** No aplica: no cambia la lista de juegos ni la arquitectura.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `supabase/migrations/` no tiene archivos nuevos respecto a SPEC 01.
- [ ] La partida empieza en nivel 1 a 300 px/s (`VELOCIDAD 110 KM/H` en el `player-hud`) con filas de 1–2 coches.
- [ ] Al pasar 2.500 m el nivel sube a 2, aparece el banner `NIVEL 2` y la puntuación sube 1.000 de golpe.
- [ ] La velocidad y la densidad del tráfico aumentan de nivel en nivel según la tabla `LEVELS`; desde el nivel 9 todas las filas bloquean 3 carriles.
- [ ] Las 10 filas de `LEVELS` cumplen `rowGap ≥ 140 + (velocidad − 140) × 80 / 480`.
- [ ] En ningún nivel aparece una fila o combinación de filas consecutivas sin camino transitable.
- [ ] Un adelantamiento normal suma 50 × multiplicador y muestra el popup `+<n>`.
- [ ] Pasar a ≤ 12 px de un coche sin tocarlo suma además 100 × multiplicador y muestra `¡AL LÍMITE!`.
- [ ] El multiplicador pasa a `x2` al 10.º adelantamiento seguido y nunca supera `x5`.
- [ ] El combo vuelve a `x1` tras chocar o tras 4 s sin adelantar.
- [ ] Un coche atravesado durante la invulnerabilidad no suma puntos ni combo.
- [ ] El `player-hud` muestra puntuación, vidas, nivel, `DISTANCIA`, `VELOCIDAD` y `COMBO` iguales al HUD del canvas.
- [ ] `onStateChange` no se dispara en frames sin cambios (la distancia solo emite cada 100 m y la velocidad cada 10 km/h).
- [ ] Al llegar a 25.000 m el canvas muestra `¡META ALCANZADA!` con las 5 estadísticas, la puntuación incluye `5000 × vidas` y se abre el modal `FIN DEL JUEGO` una sola vez.
- [ ] Con 0 vidas o `FIN` el canvas muestra `GAME OVER` con las 5 estadísticas y el modal se abre una sola vez; ningún overlay tiene texto de reinicio.
- [ ] En pausa no avanzan distancia, combo, popups ni banner; al reanudar la ventana de combo conserva el tiempo restante.
- [ ] `JUGAR DE NUEVO` empieza en nivel 1, combo `x1`, 0 m, 3 vidas y sin popups.
- [ ] Guardar sigue creando una fila en `scores` con `game_id = 'neon-racer'` y `VER RANKING` la muestra.
- [ ] Un solo loop en Strict Mode y `SALIR` no deja loop ni listeners activos.
- [ ] Regresión: `/games/asteroids/play`, `/games/tetris/play`, `/games/arkanoid/play` y `/games/snake/play` se juegan y pausan como antes.
- [ ] Solo cambian archivos de `app/lib/games/neon-racer/`.

## Decisiones

- **Sí:** niveles por distancia (cada 2.500 m) en lugar de por tiempo. Decisión del agente (revisar); el usuario pidió score = distancia + adelantamientos y la distancia es la métrica visible.
- **Sí:** 10 niveles con la tabla `LEVELS`, velocidad 300 → 900 px/s. Decisión del agente (revisar); el máximo coincide con `MAX_SPEED` de SPEC 01 y respeta la garantía de hueco.
- **Sí:** densidad por separación de filas (440 → 300 px) y coches por fila (1–2 → 3). Decisión del agente (revisar); 300 px es el mínimo con margen sobre 266,7 px a 900 px/s.
- **Sí:** meta a 25.000 m con victoria. Decisión del agente (revisar); acota la partida a ~8 min (rango 2–10 min de la plataforma) y la puntuación máxima a ≤ 1.244.500.
- **No:** modo infinito tras la meta. Sin meta la puntuación no tiene techo práctico y las partidas de jugadores expertos superarían 10 min.
- **Sí:** combo con multiplicador hasta x5 cada 10 adelantamientos y ventana de 4 s. Decisión del agente (revisar); premia ir rápido sin frenar.
- **Sí:** adelantamiento al límite a ≤ 12 px entre hitboxes (≤ 20 px visual). Decisión del agente (revisar); riesgo/recompensa que diferencia el ranking.
- **Sí:** bonus de nivel `500 × nivel` y de meta `5000 × vidas`. Decisión del agente (revisar); premia no chocar sin dominar el score.
- **Sí:** `extra` con `DISTANCIA` en km con 1 decimal, `VELOCIDAD` redondeada a 10 km/h y `COMBO`. Decisión del agente (revisar); redondeos para no emitir cada frame.
- **Sí:** 1 px/s = 0,36 km/h (1 m = 10 px). Coherente con la escala de SPEC 01; 300 px/s ≈ 108 km/h, 900 px/s = 324 km/h.
- **No:** cambiar la ficha (`short`/`long`). El texto de SPEC 01 sigue siendo cierto; evita una migración.
- **No:** cambios de schema. La cota máxima cabe en el CHECK de `scores`.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Niveles altos injugables (3 coches/fila a 900 px/s)               | Garantía de hueco validada por nivel; si en pruebas resulta duro, subir `rowGap` de niveles 8–10. |
| Explotar el freno para farmear adelantamientos al límite          | Frenar reduce la distancia relativa y el ritmo de filas; el combo caduca a los 4 s.               |
| `extra` dispara `onStateChange` cada frame durante la aceleración | Velocidad redondeada a 10 km/h (≤ 8 emisiones/s a 200 px/s²) y distancia cada 100 m.              |
| Choque y meta en el mismo frame dan dos `onGameOver`              | Meta comprobada antes que colisiones y `gameOver()` único que ignora llamadas fuera de `playing`. |
| HUD del canvas saturado (velocímetro, combo, progreso)            | Cada indicador vive en un arcén (200 px libres a cada lado de la calzada).                        |

## Lo que **no** entra en este spec

- Sonido, partículas, screen shake, flashes y portada propia.
- Niveles extra, modo infinito, contrarreloj.
- Tráfico con cambios de carril o velocidades distintas, obstáculos, power-ups.
- Cambios en la ficha o en el schema de Supabase.

Cada uno, si llega, va en su propio spec.
