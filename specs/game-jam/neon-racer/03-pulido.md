# GAME JAM neon-racer · SPEC 03 — Pulido visual, sonido procedural y portada de Neon Racer

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, GAME JAM neon-racer · SPEC 02
> **Fecha:** 2026-10-13
> **Objetivo:** Dar a Neon Racer estética neón completa (brillo, estelas, partículas, screen shake, flashes), sonido sintetizado con Web Audio y una portada propia `cover-neon-racer`, sin cambiar gameplay ni puntuación.

## Por qué existe este spec

SPEC 01–02 dejan Neon Racer completo en reglas, pero con arte plano: rectángulos sin brillo, choques sin respuesta visual y silencio total.
No hay sprites de coches ni sonidos en `references/`, así que todo se genera en código: coches pre-renderizados en canvas offscreen con `shadowBlur`, efectos con partículas y sonido sintetizado con Web Audio API (osciladores y ruido).
La portada provisional `cover-rana` (SPEC 01) se sustituye por una propia diseñada con `/frontend-design`.

## Alcance

**Dentro:**

- Coches pre-renderizados una vez por color en canvas offscreen de 56×86 px (coche 40×70 + 8 px de margen para el brillo), creados en la fábrica: cuerpo con `shadowBlur = 12` del color del coche, parabrisas, 2 faros blancos (jugador) o 2 pilotos `#ff2244` (tráfico).
- Conos de faros del jugador: degradado lineal blanco `rgba(255,255,255,0.18) → 0` de 120 px por delante del coche.
- Estela del jugador: rectángulo de 24×60 px bajo el coche con degradado cian `rgba(0,245,255,0.35) → 0`, longitud proporcional a `velocidad / 900`.
- Bordes de calzada con brillo (`shadowBlur = 16`, `#00f5ff`) que pulsan a magenta `#ff006e` durante 300 ms al subir de nivel.
- Líneas de velocidad en los arcenes a partir de 600 px/s: 12 líneas blancas de 2 px de ancho y 40–120 px de largo, opacidad `0.5 × (velocidad − 600) / 300`.
- Partículas: choque → 24 chispas (color del coche golpeado y `#ffffff`) a 120–360 px/s, vida 500 ms; adelantamiento al límite → 6 chispas `#f5ff00` entre ambos coches, vida 300 ms; meta → 60 partículas de colores de `TRAFFIC_COLORS`, vida 1200 ms. Rozamiento 0,9 por cada 100 ms. Máximo 200 partículas vivas.
- Screen shake al chocar: 300 ms, amplitud 8 px con caída lineal; desactivado si `prefers-reduced-motion: reduce`.
- Flashes a pantalla completa: choque blanco α 0,6 → 0 en 150 ms; subida de nivel magenta α 0,25 → 0 en 300 ms; meta verde `#00ff88` α 0,4 → 0 en 500 ms.
- Sonido sintetizado (Web Audio API, sin archivos):
  - Motor: oscilador `sawtooth` → filtro `lowpass` 800 Hz → ganancia 0,04; frecuencia `60 + velocidad × 0.15` Hz (105–195 Hz).
  - Adelantamiento: `square` 880 Hz, 60 ms, ganancia 0,08.
  - Al límite: `square` 880 → 1320 Hz, 120 ms, ganancia 0,1.
  - Choque: ruido blanco 300 ms con `lowpass` de 2000 → 200 Hz, ganancia 0,3.
  - Subida de nivel: arpegio `triangle` 523 / 659 / 784 / 1047 Hz, 80 ms por nota, ganancia 0,1.
  - Meta: el mismo arpegio dos veces + 1568 Hz final de 300 ms.
  - Game over: `sawtooth` 440 → 110 Hz en 600 ms, ganancia 0,12.
- Portada `.cover-neon-racer` en `app/globals.css`, solo CSS como las demás `cover-*`, diseñada con `/frontend-design`: fondo `#05050f`, calzada central con bordes magenta y líneas discontinuas cian, coche cian con brillo y 2 coches de tráfico.
- Migración de datos que cambia `cover` de `neon-racer` a `cover-neon-racer`.

**Fuera de alcance (para specs futuros):**

- Música de fondo, control de volumen o tecla de mute.
- Sprites de archivo (`public/games/neon-racer/`): todo sigue siendo procedural.
- Perspectiva pseudo-3D, curvas, día/noche, clima.
- Cambios de gameplay, puntuación, niveles o snapshot.
- Controles táctiles / móvil.
- Cambios de schema.

## Modelo de datos

### Supabase

Sin cambios de schema; no se regenera `database.types.ts`.

`supabase/migrations/<YYYYMMDDHHMMSS>_cover_neon_racer.sql` (timestamp del momento de aplicarla):

```sql
-- GAME JAM neon-racer · SPEC 03: portada propia de neon-racer.
update public.games set cover = 'cover-neon-racer' where id = 'neon-racer';
```

### Motor Neon Racer

```ts
// app/lib/games/neon-racer/engine.ts (misma firma y mismo snapshot que SPEC 02)
export function createNeonRacerGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;

// Estado interno (closure) añadido a SPEC 02: carSprites (Map<string, HTMLCanvasElement>),
// particles (Particle[]), shakeMs, flash { color, alpha0, ms, totalMs } | null, edgePulseMs,
// speedLines ({ x, y, len }[]), reducedMotion (boolean), audio (SoundBank | null)
type SoundBank = {
  ctx: AudioContext;
  engineOsc: OscillatorNode;
  engineGain: GainNode;
  noise: AudioBuffer; // 300 ms de ruido blanco generado una vez
};
```

Archivos (solo los creados en SPEC 01):

- `app/lib/games/neon-racer/constants.ts` — se añaden `SPRITE_PAD = 8`, `CAR_GLOW = 12`, `EDGE_GLOW = 16`, `HEADLIGHT_LEN = 120`, `TRAIL_W = 24`, `TRAIL_MAX_H = 60`, `SPEED_LINES = 12`, `SPEED_LINES_FROM = 600`, `MAX_PARTICLES = 200`, `CRASH_PARTICLES = 24`, `CLOSE_CALL_PARTICLES = 6`, `GOAL_PARTICLES = 60`, `PARTICLE_DRAG = 0.9` (por 100 ms), `SHAKE_MS = 300`, `SHAKE_PX = 8`, `FLASH_CRASH = { color: "#ffffff", alpha: 0.6, ms: 150 }`, `FLASH_LEVEL = { color: "#ff006e", alpha: 0.25, ms: 300 }`, `FLASH_GOAL = { color: "#00ff88", alpha: 0.4, ms: 500 }`, `EDGE_PULSE_MS = 300`, `SOUND` (frecuencias, duraciones y ganancias de Alcance), `ENGINE_BASE_HZ = 60`, `ENGINE_HZ_PER_PXS = 0.15`.
- `app/lib/games/neon-racer/entities.ts` — `renderCarSprite(color, isPlayer): HTMLCanvasElement`; clase `Particle` (`x`, `y`, `vx`, `vy`, `color`, `lifeMs`, `ageMs`; `update(dt)`, `done`, `draw(ctx)`); `PlayerCar.draw` y `TrafficCar.draw` usan el sprite pre-renderizado si existe.
- `app/lib/games/neon-racer/engine.ts` — creación de sprites, `createSoundBank()`, efectos (`spawnParticles`, `shake`, `flash`), dibujo de faros, estela, líneas de velocidad y brillo; ganchos en choque, adelantamiento al límite, subida de nivel, meta y game over.
- `app/globals.css` — clase `.cover-neon-racer` (+ `::before`/`::after`) junto a las demás `cover-*`.

Convenciones:

- `dt` en segundos limitado a 0.05; `shakeMs`, `flash.ms`, `edgePulseMs` y las partículas se congelan en pausa (no se llama a `update` ni `draw`).
- Shake: `ctx.translate(dx, dy)` con `dx, dy ∈ [−a, a]`, `a = SHAKE_PX × shakeMs / SHAKE_MS`; el HUD se dibuja sin shake.
- Los sprites se crean en la fábrica (no a nivel de módulo) con `document.createElement("canvas")`; 6 sprites (jugador + 5 colores de tráfico).
- `AudioContext` se crea en el primer `keydown` de juego (política de autoplay); si el navegador no lo soporta o falla, el juego sigue sin sonido. Cada efecto crea sus nodos y se desconecta en `onended`.
- `pause()` → `audio.ctx.suspend()`; `resume()` → `audio.ctx.resume()`; `gameOver()` para el oscilador del motor tras el efecto final; `restart()` lo vuelve a arrancar; `destroy()` llama a `audio.ctx.close()`.
- `reducedMotion` se lee una vez en la fábrica con `matchMedia("(prefers-reduced-motion: reduce)")`; solo desactiva shake y líneas de velocidad.
- Flashes y shake se dibujan también en el frame del overlay de fin, pero el overlay siempre queda encima y legible.

## Plan de implementación

1. **Registro genérico.** No aplica: existe desde SPEC 07.
2. **Ficha en Supabase.** Tras el paso 6, escribir y aplicar `<ts>_cover_neon_racer.sql` con `apply_migration` (`cover_neon_racer`). Verificar con `execute_sql`: `cover = 'cover-neon-racer'` en `neon-racer`; `get_advisors` solo con los avisos conocidos. Reiniciar `npm run dev`.
3. **Assets.** No aplica: sprites y sonido procedurales; no se crea `public/games/neon-racer/`. Verificar: `references/` sin cambios en `git status`.
4. **Motor.** Modificar `constants.ts`, `entities.ts` y `engine.ts` en `app/lib/games/neon-racer/`. Verificar: `npm run build`; la puntuación de una partida no cambia respecto a SPEC 02 (mismas reglas).
5. **Alta en la plataforma.** No aplica: ya registrado.
6. **UI nueva.** Diseñar `.cover-neon-racer` con `/frontend-design` reutilizando tokens de `app/globals.css` (`--cyan`, `--magenta`). Verificar: la portada se ve en `/games`, `/games/neon-racer` y la home si aparece destacado.
7. **`CLAUDE.md`.** Indicar que Neon Racer usa sonido sintetizado con Web Audio (sin archivos de audio).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `supabase/migrations/` tiene un único `.sql` nuevo: `<ts>_cover_neon_racer.sql`; `execute_sql` muestra `cover = 'cover-neon-racer'`.
- [ ] `/games` y `/games/neon-racer` muestran la portada `cover-neon-racer` (calzada, coche cian y tráfico) sin imágenes externas.
- [ ] Los coches tienen brillo neón, faros (jugador) y pilotos rojos (tráfico); los bordes de la calzada brillan.
- [ ] Por encima de 600 px/s aparecen líneas de velocidad en los arcenes, más opacas cuanto más rápido.
- [ ] Al chocar: chispas, flash blanco y screen shake de ~300 ms; con `prefers-reduced-motion: reduce` no hay shake.
- [ ] Un adelantamiento al límite muestra chispas amarillas; subir de nivel da flash magenta y pulso de bordes; la meta lanza partículas de colores y flash verde.
- [ ] Nunca hay más de 200 partículas vivas.
- [ ] Tras la primera tecla de juego suena el motor y su tono sube con la velocidad; suenan adelantamiento, al límite, choque, nivel, meta y game over.
- [ ] Antes de la primera tecla no hay errores de autoplay en consola.
- [ ] En pausa no hay sonido y los efectos quedan congelados; al reanudar continúan.
- [ ] `SALIR` y `VOLVER AL VAULT` no dejan loop, listeners ni sonido activos (`AudioContext` cerrado).
- [ ] La puntuación, niveles, combo y snapshot se comportan igual que en SPEC 02.
- [ ] Un solo loop en Strict Mode y `onStateChange` sin frames vacíos.
- [ ] El juego mantiene ≥ 55 fps en un portátil medio con 200 partículas y shake activo.
- [ ] Regresión: `/games/asteroids/play`, `/games/tetris/play`, `/games/arkanoid/play` y `/games/snake/play` se juegan y pausan como antes; sus portadas no cambian.
- [ ] Solo cambian archivos de `app/lib/games/neon-racer/`, `app/globals.css`, `CLAUDE.md` y la nueva migración.
- [ ] Ningún archivo de `references/` cambia.

## Decisiones

- **Sí:** sonido sintetizado con Web Audio en lugar de archivos. Decisión del agente (revisar); no hay audio en `references/` y no se crean assets.
- **Sí:** `AudioContext` creado en el primer `keydown`. Evita los bloqueos de autoplay y errores en consola.
- **Sí:** coches pre-renderizados en canvas offscreen. Decisión del agente (revisar); `shadowBlur` por frame en 20+ coches es caro.
- **Sí:** portada propia `cover-neon-racer` solo CSS con `/frontend-design`. Regla del proyecto para UI; mismo formato que las `cover-*` existentes.
- **Sí:** migración de datos (`update`) para cambiar la portada. Decisión del agente (revisar); `games` solo cambia por migración (SPEC 06).
- **Sí:** shake desactivado con `prefers-reduced-motion`. Decisión del agente (revisar); accesibilidad sin opción de UI nueva.
- **No:** música de fondo ni mute. Requeriría UI nueva y no aporta al récord.
- **No:** cambios de gameplay. Esta fase solo es presentación; la puntuación sigue siendo comparable con partidas de SPEC 02.
- **No:** cambios de schema.

## Riesgos

| Riesgo                                                     | Mitigación                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `shadowBlur` baja los fps en equipos modestos              | Sprites pre-renderizados; brillo en vivo solo en los 2 bordes de la calzada.     |
| Autoplay bloqueado o `AudioContext` no disponible          | Creación en el primer `keydown` dentro de `try`; sin audio el juego sigue igual. |
| Sonido que sigue tras salir o en pausa                     | `suspend()` en pausa y `close()` en `destroy()`.                                 |
| Shake o flashes molestos o que tapan el tráfico            | Duraciones ≤ 500 ms, α ≤ 0,6 y shake desactivable vía `prefers-reduced-motion`.  |
| La portada se ve vacía entre migración y despliegue de CSS | La migración (paso 2) se aplica después de añadir `.cover-neon-racer` (paso 6).  |

## Lo que **no** entra en este spec

- Música, volumen/mute.
- Sprites de archivo, perspectiva pseudo-3D, curvas, clima.
- Cambios de gameplay o de puntuación.
- Controles táctiles.
- Cambios de schema.

Cada uno, si llega, va en su propio spec.
