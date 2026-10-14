# SPEC 10 — Rendimiento de Frogger: sin renders React innecesarios

> **Estado:** Implementado
> **Depende de:** SPEC 07, `specs/game-jam/frogger/01-frogger-core.md`
> **Fecha:** 2026-10-13
> **Objetivo:** Eliminar los tirones de Frogger haciendo que el motor solo notifique a React cuando cambian score, vidas, nivel o pausa, aislando el HUD React del resto del `GamePlayer` y cacheando el fondo estático y las formas con glow del canvas (sprites offscreen), verificado con medición en Playwright.

## Resumen de hallazgos (referencia rápida)

Dos causas independientes; la segunda solo aparecía en el skin `neon` y en hardware más modesto:

| #   | Causa                                                                                                                                               | Síntoma                                                      | Solución aplicada                                                                                                                                 | Dónde     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | El motor notificaba a React cada segundo (`TIEMPO` en `extra`) y cada notificación re-renderizaba `GamePlayer` entero (CRT, selector, `GameCanvas`) | Renders React constantes aunque no pase nada                 | Notificar solo si cambian score/vidas/nivel/pausa; snapshot en store externo + suscriptores pequeños (`PlayerHud`, `PauseButton`, `PauseOverlay`) | Pasos 3–4 |
| 2   | `shadowBlur` recalculado en cada frame: 24 llamadas con glow por frame en `neon` (`glow = 12`, `hudGlow = 6`), ×2,5–4 más caras que sin blur        | Tirones solo en `neon` (`classic`/`retro` tienen `glow = 0`) | Sprites offscreen: cada forma con glow se pinta una vez y se copia con `drawImage`; texto del HUD cacheado hasta que cambie score/nivel           | Paso 8    |
| —   | Fondo estático repintado cada frame (~78 llamadas)                                                                                                  | Sin impacto medible                                          | Canvas offscreen con el fondo, copiado con 1 `drawImage`                                                                                          | Paso 5    |

Lecciones:

- **Medir por skin.** La hipótesis inicial descartó `shadowBlur` porque "el problema era igual en todos los skins"; la prueba manual del usuario demostró lo contrario. Medir siempre los tres skins.
- **El hardware de medición oculta costes de GPU.** En la máquina de Playwright `neon` daba 50 fps igual que `classic`; contar llamadas con `shadowBlur > 0` por frame es la métrica objetiva, independiente del hardware.
- **Playwright Chromium aquí va a 50 Hz** (`about:blank` = 50 fps): el FPS no sirve para comparar por encima de 50; usar frames > 30 ms, notificaciones y llamadas de dibujo.
- **Patrón reutilizable para Asteroids, Arkanoid y Snake** (también tienen glow en `neon`) y para quitar notificaciones por frame (Arkanoid notifica ~5 veces en 3 s sin input).

## Por qué existe este spec

Frogger tiene FPS bajos / tirones, igual en los tres skins (descarta `shadowBlur` como causa principal: `classic` y `retro` tienen `glow: 0`).
Hipótesis principal (usuario): renders React de más.

- `emitStateIfChanged` (`app/lib/games/frogger/engine.ts`) notifica también cada vez que cambia `Math.ceil(timeLeft / 1000)` → un `onStateChange` por segundo con el `extra` `TIEMPO`, aunque no pase nada relevante.
- `GamePlayer` guarda el snapshot en su propio `useState`: cada notificación re-renderiza el componente entero (CRT, `SkinSelector`, botones, `GameCanvas`), no solo el HUD.
- `draw()` repinta cada frame las 14 filas de fondo y las líneas discontinuas de carretera, que nunca cambian.

**Hallazgo posterior (paso 8):** tras el paso 7, la prueba manual del usuario a 60 Hz mostró `classic` y `retro` fluidos pero `neon` con tirones. La premisa inicial ("igual en todos los skins") era incorrecta: el glow (`shadowBlur`) de `neon` sí era una causa. El usuario decidió ampliar este spec para resolverlo aquí.

Otros juegos pueden sufrir lo mismo; aquí solo se arregla Frogger. El refactor de `GamePlayer` sí es compartido y beneficia a todos sin tocar sus motores.

## Alcance

**Dentro:**

- Medición baseline y final de Frogger con Playwright MCP (FPS medio, frame time p95, nº de `onStateChange`).
- Contador de notificaciones solo en desarrollo: `window.__avStateChanges` incrementado en `GameCanvas` en cada `onStateChange`.
- Motor Frogger: `onStateChange` solo cuando cambia `score`, `lives`, `level` o `paused`. Se quita `TIEMPO` del snapshot (`extra` desaparece); el tiempo sigue visible en la barra del canvas.
- Motor Frogger: fondo estático (filas por zona + líneas de carretera) pintado una vez en un canvas offscreen al crear el motor y copiado con `drawImage` en cada frame.
- `GamePlayer`: el HUD React (`player-hud` stats) pasa a un componente propio `PlayerHud` suscrito al snapshot; un cambio de snapshot re-renderiza solo `PlayerHud`, no CRT, `SkinSelector` ni `GameCanvas`. La pausa (botón `PAUSA`/`REANUDAR` y overlay `EN PAUSA`) sigue funcionando igual, también como suscriptores del store.
- `GamePlayer`: `useState` al mínimo; todo valor que no deba re-renderizar `GamePlayer` vive en `useRef` (ver **Regla de estado**).
- Motor Frogger (paso 8, ampliación decidida por el usuario): coches, camiones, rana (incluidas las de las bocas) y texto del HUD se pintan con su glow una sola vez en sprites offscreen y se copian con `drawImage`; 0 llamadas con `shadowBlur` por frame durante la partida.

**Fuera de alcance (para specs futuros):**

- Optimizar los motores de Asteroids, Tetris, Arkanoid y Snake (incluido quitar notificaciones por frame/segundo que tengan). Decisión del usuario: solo Frogger.
- CSS compartido (scanlines `.crt-screen::after` con `mix-blend-mode`, grid animado `.av-bg`, `backdrop-filter` del nav).
- Redondeo de posiciones a píxel entero, no dibujar en pausa, eliminar asignaciones por frame en `draw()`. No elegidos.
- Cambiar los valores de `glow`/`hudGlow` de `neon` o su aspecto: el paso 8 conserva el mismo glow, solo cambia cuándo se calcula.
- Glow del overlay `GAME OVER`: solo se dibuja con la partida terminada; conserva `shadowBlur` directo.
- Glow de los skins `neon` de Asteroids, Arkanoid y Snake (mismo patrón, spec futuro).
- Cachear las bocas (`drawGoals`): cambian al ocuparse, se siguen pintando por frame.
- Nuevas dependencias (Playwright como paquete npm, librerías de stores).
- Cambios de gameplay, puntuación, skins o Supabase.

## Modelo de datos

Sin datos persistentes nuevos. Cambios de estructuras en memoria:

### Snapshot de Frogger

```ts
// antes
{ score, lives, level, paused, extra: [{ label: "TIEMPO", value: `${seconds}s` }] }
// después
{ score, lives, level, paused }
```

`last` en `emitStateIfChanged` pierde `seconds`: `{ score, lives, level, paused } | null`.

### Store del snapshot en `GamePlayer`

Mini store externo guardado en un `useRef` de `GamePlayer` (creado una vez, inicialización lazy), sin dependencias:

```ts
interface SnapshotStore {
  get(): GameSnapshot;
  set(s: GameSnapshot): void; // notifica a los suscriptores
  subscribe(fn: () => void): () => void;
}
```

- `GameCanvas` recibe `onStateChange={store.set}` (función estable; `GamePlayer` no re-renderiza).
- Suscriptores con `useSyncExternalStore(store.subscribe, store.get)` (o selector de un campo): `PlayerHud` (stats), `PauseButton` (texto `PAUSA`/`REANUDAR`) y `PauseOverlay` (`EN PAUSA`). Componentes pequeños en `app/components/`.
- `GamePlayer` **no** guarda snapshot ni `paused` en `useState`.
- Placeholder (juego sin motor): el store arranca con `PLACEHOLDER`; `togglePause` hace `store.set({ ...store.get(), paused: !paused })`. Desaparece el `useState` `placeholderPaused`.

### Regla de estado en `GamePlayer`

`useState` solo para valores que cambian lo que pinta el propio `GamePlayer`; el resto en `useRef`.

| Valor                             | Hoy            | Después                             | Motivo                                                               |
| --------------------------------- | -------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `snapshot`                        | `useState`     | store (`useState` lazy, sin setter) | solo lo pintan los suscriptores                                      |
| `placeholderPaused`               | `useState`     | store                               | idem                                                                 |
| `over` + `finalScore`             | 2 × `useState` | 1 × `useState` (número o `null`)    | ver **Decisiones** (`react-hooks/refs` impide leer el ref en render) |
| `saved`, `saveError`, `errorTick` | `useState`     | `useState`                          | cambian el modal                                                     |
| `name`                            | `useState`     | `useState`                          | input controlado + "Jugador" en HUD                                  |
| `selectedSkin`                    | `useState`     | `useState`                          | `key` de `GameCanvas` (remonta el motor)                             |
| `gameRef`                         | `useRef`       | `useRef`                            | sin cambio                                                           |

Si durante la implementación algún `useState` restante puede pasar a `useRef` sin perder comportamiento, se cambia y se documenta en **Decisiones**.

### Contador de debug

```ts
declare global {
  interface Window {
    __avStateChanges?: number;
  }
}
```

Solo si `process.env.NODE_ENV !== "production"`; en build de producción no existe.

### Fondo offscreen (motor Frogger)

`const bg = document.createElement("canvas")` de `W × H` (640×560), pintado en la factory con la paleta del skin (lo que hoy hace `drawBackground`). `drawBackground()` pasa a `ctx.drawImage(bg, 0, 0)`.

### Sprites con glow (motor Frogger, paso 8)

Todo vive en el closure del motor (se descarta con él al cambiar de skin):

```ts
const PAD = Math.ceil(Math.max(palette.glow, palette.hudGlow) * 1.5) + 2; // margen para que el glow no se recorte
const sprites = new Map<string, HTMLCanvasElement>(); // caché por clave
function sprite(
  key,
  w,
  h,
  paint: (c: CanvasRenderingContext2D) => void,
): HTMLCanvasElement;
```

| Clave                               | Contenido                                                      | Variantes                                             |
| ----------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `car:<color>:<anchoPx>`             | ruedas + carrocería con glow                                   | color por fila × ancho                                |
| `truck:<dir>:<anchoPx>`             | caja con glow + cabina al frente                               | sentido × ancho                                       |
| `frog:<facing>:<saltando>:<escala>` | patas, cuerpo con glow, ojos; caja 48×48 centrada (`FROG_BOX`) | 4 direcciones × salto × escala (1 y 0,6 en bocas)     |
| HUD (fuera del `Map`)               | `SCORE n` + `NIVEL n` con `hudGlow`                            | 1 canvas, se repinta solo si cambia `score` o `level` |

- Cada sprite mide la forma + `PAD` por lado y se dibuja en `(x − PAD, y − PAD)`.
- `setGlow`/`clearGlow` reciben el contexto destino (`c`) en lugar de usar siempre el de pantalla.
- Troncos, tortugas, bocas, vidas y barra de tiempo no tienen glow: se siguen dibujando directo.

## Plan de implementación

1. **Contador de debug.** En `GameCanvas`, el wrapper de `onStateChange` incrementa `window.__avStateChanges` (solo en dev). Sistema funcional igual que antes.
2. **Baseline.** `npm run dev`, Playwright MCP en `/games/frogger/play` (Chromium, viewport 1280×800, skin `classic`). Con `browser_evaluate`: resetear contador, medir durante 10 s sin input los intervalos entre `requestAnimationFrame` → FPS medio, p95 de frame time y `__avStateChanges`. Repetir con 10 s pulsando `ArrowUp` cada 500 ms. Anotar resultados en la sección **Mediciones** de este spec. Cerrar el navegador de Playwright al terminar.
3. **Notificaciones de Frogger.** Quitar `seconds`/`TIEMPO` de `emitStateIfChanged` y del snapshot. Medir (paso 2) y anotar.
4. **`PlayerHud` aislado + estado mínimo.** Crear store de snapshot (en `useRef`), `app/components/PlayerHud.tsx`, `PauseButton.tsx` y `PauseOverlay.tsx` (`"use client"`, suscritos al store). `GamePlayer` aplica la **Regla de estado** (`snapshot`, `placeholderPaused` → store; `finalScore` → `useRef`). `SkinSelector`, botones `FIN`/`SALIR` y modal siguen en `GamePlayer`. Verificar manualmente que Asteroids, Tetris, Arkanoid y Snake siguen mostrando su HUD y pausan. Medir y anotar.
5. **Fondo offscreen.** Canvas offscreen en la factory de Frogger; `drawBackground` = `drawImage`. Medir y anotar.
6. **Conservar solo lo que mejora.** Si un paso 3–5 no mejora ninguna métrica respecto al anterior, se revierte y se documenta en **Mediciones**. (Paso 3 se mantiene siempre: es requisito funcional del usuario.)
7. **Cierre.** `npm run lint` y `npm run build` sin errores; medición final; actualizar `CLAUDE.md` (componente `PlayerHud`, snapshot de Frogger sin `TIEMPO`, contador `__avStateChanges`) y estado del spec.
8. **Glow de `neon` (ampliación tras la prueba manual del usuario).** Diagnóstico por skin (llamadas con `shadowBlur > 0` por frame + coste aislado de `shadowBlur`), captura `neon` antes; sprites offscreen para coches, camiones, rana y texto del HUD; medir los tres skins, comparar capturas, `npm run lint` + `npm run build`, actualizar `CLAUDE.md` y este spec.

## Criterios de aceptación

- [x] En dev, 10 s de Frogger sin input → `window.__avStateChanges === 0`.
- [x] Saltar una fila nueva (+10 puntos) → exactamente 1 `onStateChange`.
- [x] Perder una vida, subir de nivel, pausar y reanudar → cada uno dispara 1 `onStateChange`.
- [x] El HUD React de Frogger muestra Jugador, Puntuación, Vidas y Nivel; ya no muestra `TIEMPO`.
- [x] La barra de tiempo del canvas sigue funcionando (verde → amarillo → rojo, muerte al llegar a 0).
- [x] Un `onStateChange` re-renderiza solo `PlayerHud` (y `PauseButton`/`PauseOverlay` si cambia `paused`); `GamePlayer` y `GameCanvas` 0 renders (React DevTools "Highlight updates" o `console.count` temporal).
- [x] `GamePlayer` sin `useState` para `snapshot` ni `placeholderPaused`; `over` + `finalScore` fusionados en un solo `useState<number | null>`; store en `useState` lazy sin setter (desviación de la tabla **Regla de estado** documentada en **Decisiones**).
- [x] Modal de game over muestra la puntuación final correcta (estado `finalScore`).
- [x] Pausa con botón, `P`, `Escape` y al ocultar pestaña sigue mostrando overlay `EN PAUSA` y alterna el texto del botón.
- [x] Asteroids, Tetris, Arkanoid y Snake siguen mostrando su HUD (incluido su `extra`) y pausando igual que antes.
- [x] Cambiar de skin sigue reiniciando la partida de Frogger con la paleta correcta (fondo offscreen incluido).
- [x] Medición final Frogger en Playwright (10 s, skin `classic`, límite 50 Hz del entorno): FPS medio ≥ 49,5, ningún frame > 30 ms y `__avStateChanges` = 0 sin input; con input FPS ≥ 49,5 y ningún frame > 30 ms.
- [x] Verificación manual del usuario a 60 Hz en `classic` y `retro`: fluidos, sin tirones (confirmado por el usuario).
- [x] Verificación manual del usuario a 60 Hz en `neon` tras el paso 8: fluido, sin tirones (confirmado por el usuario).
- [x] Paso 8: durante la partida, 0 llamadas de dibujo con `shadowBlur > 0` por frame en el canvas principal en los tres skins (antes 24 en `neon`).
- [x] Paso 8: `neon` conserva el mismo aspecto (glow en coches, camiones, rana y HUD; rana girada al saltar), comparado con captura previa.
- [x] `window.__avStateChanges` no existe en `npm run build` + `npm start`.
- [x] Sección **Mediciones** rellena: baseline + tras cada paso 3–5.
- [x] `npm run lint` y `npm run build` sin errores.

## Mediciones

_Rellenado durante `/spec-impl`._

Condiciones: `next dev` ya en marcha en `:3000` (mismo directorio), Playwright MCP Chromium 1280×800, skin `classic`, 10 s. Con input = `page.keyboard.press("ArrowUp")` cada 500 ms (un `KeyboardEvent` sintético despachado en `window` no movía la rana).
**Aviso:** `about:blank` en el mismo navegador también da 50,0 fps (máx 20,3 ms): el Chromium de Playwright en esta máquina está limitado a 50 Hz. El FPS no puede pasar de 50 aquí, ni antes ni después de los cambios.

| Paso               | FPS medio | p95 frame (ms)  | `__avStateChanges` 10 s sin input | Con input FPS / p95                      | ¿Se conserva?                                                                                          |
| ------------------ | --------- | --------------- | --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Baseline           | 50,0      | 20,2 (máx 20,3) | 10                                | 50,0 / 20,1 (12 notif.)                  | —                                                                                                      |
| 3. Notificaciones  | 50,0      | 20,2 (máx 20,6) | 0                                 | 50,0 / 20,2 (9 notif., 0 frames > 30 ms) | Sí (requisito)                                                                                         |
| 4. `PlayerHud`     | 50,0      | 20,2 (máx 20,7) | 0                                 | 50,0 / 20,2 (9 notif., 0 frames > 30 ms) | Sí: por notificación, renders de `GamePlayer`/`GameCanvas` 1 → 0 (solo `PlayerHud`); FPS limitado a 50 |
| 5. Fondo offscreen | 50,0      | 20,2 (máx 20,3) | 0                                 | 50,0 / 20,1 (9 notif., 0 frames > 30 ms) | Sí: excepción a la regla del paso 6 (decisión del usuario)                                             |
| Final (paso 7)     | 50,0      | 20,2 (máx 20,8) | 0                                 | 50,0 / 20,2 (9 notif., 0 frames > 30 ms) | —                                                                                                      |

Notas paso 4 (`console.count` temporal, ya retirado; StrictMode dev duplica cada render):

- Frogger: 5 s sin input → 0 renders. Salto → 1 notificación, solo `PlayerHud`. Pausa + reanudar → 2 notificaciones, solo `PlayerHud`/`PauseButton`/`PauseOverlay`. `FIN` → modal con la puntuación correcta (re-render de `GamePlayer` esperado: abre el modal).
- Asteroids, Tetris, Arkanoid, Snake: HUD con su `extra` y pausa/reanudar OK. Arkanoid notifica ~5 veces en 3 s sin input (motor fuera de alcance; candidato a spec futuro), ahora solo re-renderiza `PlayerHud`.
- Placeholder (juego sin motor): no verificable en navegador, todos los juegos del catálogo tienen motor; revisado solo por código.

Notas paso 5:

- ~78 llamadas de dibujo por frame (14 `fillRect` de filas + 64 líneas de carretera) → 1 `drawImage`. Fondo correcto en `classic`, `neon` y `retro` (píxeles de fila segura, río y carretera = paleta del skin; cambiar de skin regenera el offscreen).

Verificación de criterios restantes (Playwright, `completeRound` expuesto temporalmente en `window` y retirado después):

- Barra de tiempo 587 px verde `#39ff6a` (1 s) → 416 px verde (5 s) → 267 px amarilla `#ffd800` (8,5 s) → 96 px roja `#ff3b3b` (12,5 s); a los 15 s muerte por tiempo = 1 notificación (vidas 3 → 2) y barra reiniciada.
- Subir de nivel = 1 notificación (nivel 02, +200).
- `P`, `Escape` y botón: overlay y texto `PAUSA`/`REANUDAR` correctos, 6 notificaciones por 6 cambios. `visibilitychange` con `document.hidden` simulado → pausa y sigue pausado al volver.

### Paso 8 — glow del skin `neon`

Prueba manual del usuario a 60 Hz tras el paso 7: `classic` y `retro` fluidos; `neon` con tirones. En la máquina de Playwright `neon` también va a 50 fps (su GPU absorbe el coste), por eso no apareció en las mediciones anteriores.

Diagnóstico (Playwright, `CanvasRenderingContext2D.prototype` instrumentado temporalmente para contar llamadas de dibujo y cuántas llevan `shadowBlur > 0`, 5–10 s por skin):

| Medida                                          | `classic` | `neon` antes | `neon` después | `retro`   |
| ----------------------------------------------- | --------- | ------------ | -------------- | --------- |
| Llamadas de dibujo por frame (canvas principal) | 286 → 253 | 286          | 253            | 286 → 253 |
| Llamadas con `shadowBlur > 0` por frame         | 0         | **24**       | **0**          | 0         |
| FPS / máx frame (Playwright, 50 Hz)             | 50 / 20,3 | 50 / 20,4    | 50 / 20,3      | 50 / 20,4 |

- Coste aislado de `shadowBlur`: 2000 `fillRect` en un canvas 640×560 → 24 ms sin blur vs 82 ms con `shadowBlur = 12` (×2,5–4 según ejecución).
- Origen de las 24 llamadas: un `fillRect` con glow por coche, dos por camión (caja + cabina), la elipse de la rana (y las ranas en las bocas) y dos `fillText` del HUD (`hudGlow = 6`), recalculados en cada frame.
- Visual: capturas `neon` antes/después en `.playwright-mcp/spec10-neon-*.png` (no versionadas); glow de coches, camiones y rana idéntico; rana girada al saltar correcta.

## Decisiones

- **Solo Frogger.** Los demás motores pueden tener el mismo problema; se tratan en otro spec si se confirma. Decisión del usuario.
- **Causa principal = renders React.** Indicación del usuario: el motor solo avisa al HUD cuando cambia algo relevante. Se descartan como foco este spec el CSS compartido y `shadowBlur` (el problema es igual en todos los skins). **Corregido en el paso 8:** la premisa era incorrecta; `neon` sí tenía un problema propio de `shadowBlur`.
- **`TIEMPO` fuera del snapshot.** Generaba 1 render/s; el tiempo ya se ve en la barra del canvas.
- **Aislar `PlayerHud` con `useSyncExternalStore`.** Cambio compartido aceptado por el usuario; evita re-renderizar CRT/canvas/selector sin tocar los otros motores ni el contrato `GameCallbacks`. Descartado: `React.memo` en cada hijo (frágil, dependencias de props), librería de estado (nueva dependencia).
- **`useState` al mínimo, `useRef` por defecto.** Indicación del usuario. Solo es estado lo que cambia el render del propio `GamePlayer`; snapshot y `paused` van al store (en `useRef`) y los consumen suscriptores pequeños. Descartado: `paused` en `useState` de `GamePlayer` (re-renderizaba todo el reproductor en cada pausa).
- **Desviación de la Regla de estado (decidida en el Paso 4).** `eslint-plugin-react-hooks` 7 (`react-hooks/refs`) prohíbe leer `ref.current` durante el render, así que: (a) el store se crea con `useState(() => createSnapshotStore(...))` sin setter: instancia estable, 0 renders, equivalente a un ref; (b) `over` + `finalScore` se fusionan en un solo `useState<number | null>` (`finalScore`, `null` = sin modal): un `useState` menos que antes y la puntuación llega al modal en el mismo render que lo abre. Descartado: `useRef` + `eslint-disable` (desactiva una regla de seguridad del React Compiler).
- **Store en `app/lib/games/snapshot-store.ts`.** `createSnapshotStore` + tipo `SnapshotStore`, sin dependencias, junto al contrato de juegos; los componentes suscritos viven en `app/components/`.
- **`name` sigue en `useState`.** Input controlado y visible en el HUD; pasarlo a input no controlado + ref complica la validación y el pre-relleno. Revisable en implementación.
- **Medir → lista cerrada.** Baseline, aplicar optimizaciones de esta lista una a una midiendo tras cada una; conservar solo las que mejoran. Descartado aplicar todo sin métricas intermedias.
- **Medición con Playwright MCP, sin dependencias.** `browser_evaluate` con rAF; no se añade `@playwright/test` ni script en el repo.
- **Contador `window.__avStateChanges` solo en dev.** Verificación objetiva de "0 notificaciones sin cambios"; no llega a producción.
- **Umbral adaptado al entorno (decidido en el Paso 2).** El Chromium de Playwright está limitado a 50 Hz (`about:blank` = 50 fps), así que ≥ 58 fps no es medible ahí. Criterio automático: ≥ 49,5 fps, ningún frame > 30 ms y 0 notificaciones sin input. El ≥ 58 fps a 60 Hz lo comprueba el usuario a mano con DevTools. Descartado: quitar el límite de Playwright con flags de Chromium (toca `.mcp.json`, fuera de alcance, resultado incierto).
- **Ampliar este spec con el glow de `neon` (paso 8).** Decisión del usuario tras su prueba manual: documentar aquí lo encontrado y resolverlo en la misma rama en lugar de abrir otro spec.
- **Sprites offscreen para el glow (paso 8).** Mismo aspecto, 0 `shadowBlur` por frame; mismo patrón que el fondo del paso 5. Descartados: halo con rectángulo semitransparente (más simple pero cambia el aspecto) y bajar `glow` de 12 a 4–6 (reduce el coste sin eliminarlo y cambia el skin).
- **Sprites para todos los skins, no solo `neon`.** Un solo camino de dibujo; en `classic`/`retro` (`glow = 0`) el resultado es idéntico y también bajan las llamadas por frame (286 → 253).
- **HUD cacheado fuera del `Map`.** Se repinta solo al cambiar score o nivel; guardarlo por clave acumularía un canvas por puntuación.
- **Overlay `GAME OVER` sin sprite.** Solo se dibuja con la partida terminada (simulación detenida); no afecta a la fluidez del juego.
- **Fondo offscreen sí; bocas no.** Las bocas cambian al ocuparse; cachearlas exigiría invalidación.
- **Fondo offscreen se conserva pese a no mejorar métricas (paso 6).** Con FPS limitado a 50 y sin frames lentos en esta máquina, ninguna métrica cambia; el usuario decide mantenerlo como excepción a la regla "conservar solo lo que mejora": reduce ~78 llamadas de dibujo por frame a 1 y puede ayudar en equipos más lentos.

## Riesgos

- **Se materializó en parte:** la hipótesis de renders React no explicaba los tirones de `neon`; se resolvió en el paso 8 (ver **Resumen de hallazgos**).
- **Memoria de sprites (paso 8).** El `Map` crece con las combinaciones de color, ancho y dirección (decenas de canvas pequeños por motor) y se libera al destruir el motor (cambio de skin o salida).
- **La hipótesis puede no ser la causa.** Si tras pasos 3–5 no se alcanza el umbral, el spec queda sin cumplir el criterio de FPS: se documenta en **Mediciones** y se abre spec nuevo para CSS compartido / dibujo del canvas, sin ampliar este.
- **Máquina de medición.** FPS en Playwright depende del hardware y de que la ventana esté visible; baseline y final deben medirse en la misma máquina y condiciones.
- **Regresión en otros juegos por `PlayerHud`.** Mitigado con verificación manual de los 4 juegos (criterio de aceptación).
- **Playwright + Fast Refresh.** Cerrar el navegador de Playwright al terminar para no provocar bucles con `next dev`.
