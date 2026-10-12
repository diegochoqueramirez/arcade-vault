# SPEC 05 — Juego Asteroids jugable en `/games/asteroids/play`

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-12
> **Objetivo:** Portar a TypeScript el Asteroids de `references/starter-games/02-asteroids` como nueva entrada `asteroids` del catálogo, con un motor de canvas montado en `/games/asteroids/play` que notifica a React los cambios de puntaje, vidas, nivel, pausa y fin de partida.

## Por qué existe este spec

Es el primer juego real de la plataforma: hasta ahora `GamePlayer` (SPEC 01) es un placeholder con HUD fijo.
El juego original es un `game.js` con globals, listeners en `window` y un loop infinito; no se puede montar tal cual en React.
Este spec fija el patrón para los próximos juegos: motor TS aislado + canvas + callbacks hacia la UI de la plataforma.

## Alcance

**Dentro:**

- Nueva entrada `asteroids` al final del array `GAMES` de `app/data/games.ts` (ver Modelo de datos).
- Portar `references/starter-games/02-asteroids/game.js` a TypeScript estricto en `app/lib/games/asteroids/`, sin globals de módulo.
- Mismo gameplay y misma física que el original: rotación, propulsión, drag, envolvimiento toroidal, 3 tamaños de asteroide, partición, partículas, 3 vidas, invencibilidad con parpadeo, niveles (`3 + nivel` asteroides), power-up triple disparo `3x`.
- Mismo aspecto visual: vectores blancos, fuente monospace, HUD dibujado en el canvas (`SCORE`, `NIVEL`, iconos de vidas, contador `3x`).
- Resolución lógica fija 800×600; el canvas se escala con CSS para llenar el `.crt-screen` (ya 4:3).
- Componente cliente `AsteroidsCanvas` que crea el motor al montar y lo destruye al desmontar.
- Notificación a React (`onStateChange`) cuando cambia puntaje, vidas, nivel o pausa; nunca cada frame.
- Notificación a React (`onGameOver`) al terminar la partida, con la puntuación final.
- El `player-hud` de la plataforma muestra puntaje, vidas y nivel reales del motor.
- Conviven los dos HUD: el del canvas no se elimina ni se oculta; el `player-hud` es un reflejo del estado notificado.
- Pausa:
  - Botón `PAUSA` / `REANUDAR` del HUD.
  - Teclas `P` y `Escape` alternan la pausa.
  - Pausa automática al ocultar la pestaña (`visibilitychange`); se reanuda solo manualmente.
  - Pausado: simulación congelada y overlay `EN PAUSA` existente de React visible.
- Botón `FIN`: fuerza el game over y abre el modal `FIN DEL JUEGO` con la puntuación actual.
- Game over natural (vidas = 0): abre el mismo modal con la puntuación final.
- `JUGAR DE NUEVO`: reinicia el motor (puntaje 0, 3 vidas, nivel 1) y cierra el modal.
- `SALIR` / `VOLVER AL VAULT`: navegar desmonta el componente y detiene el motor.
- `GUARDAR PUNTUACIÓN` sigue siendo solo visual (estado `saved` local), como en SPEC 01.
- Solo `asteroids` monta el canvas real; el resto de juegos, incluido `rocas`, conserva el placeholder actual.

**Fuera de alcance (para specs futuros):**

- Persistir puntuaciones (Supabase, localStorage o cualquier otra).
- Controles táctiles / versión móvil jugable.
- Sonido.
- Modificar o eliminar la entrada `rocas` (sigue como placeholder).
- Leaderboard y actividad mock para `asteroids` en `app/data/scores.ts` / `app/data/activity.ts`.
- Portada propia `cover-asteroids`.
- Mostrar `asteroids` en la home.
- Recolorear el juego a la paleta neón de la plataforma.
- Portar Tetris, Arkanoid u otros juegos de `references/starter-games/`.
- Registro genérico de juegos (mapa `id → componente`) — se decide cuando exista el segundo juego.

## Modelo de datos

Nueva entrada en `GAMES` (`app/data/games.ts`), añadida al final del array:

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Destruye asteroides en el espacio toroidal.",
  long: "Pilota una nave triangular en un campo de asteroides donde los bordes se conectan. Los grandes se parten en medianos y los medianos en pequeños. Tienes 3 vidas y un power-up de triple disparo que aparece al destruir rocas.",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

`app/lib/games/asteroids/engine.ts` (API pública del motor):

```ts
export interface AsteroidsSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // >= 1
  paused: boolean;
}

export interface AsteroidsCallbacks {
  onStateChange: (snapshot: AsteroidsSnapshot) => void; // solo cuando algún campo cambia
  onGameOver: (finalScore: number) => void; // una vez por partida
}

export interface AsteroidsGame {
  pause(): void;
  resume(): void;
  togglePause(): void;
  end(): void; // fuerza game over → dispara onGameOver
  restart(): void; // nueva partida → dispara onStateChange
  destroy(): void; // cancela rAF y quita todos los listeners
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

Estado interno (privado al motor, mismo modelo que el original):

```ts
type Status = "playing" | "dead" | "gameover";
// ship, bullets, asteroids, particles, powerUps, score, lives, level,
// status, deadTimer, powerUpSpawned, killsSinceSpawn, paused, keys, justPressed
```

Archivos:

- `app/data/games.ts` — se añade la entrada `asteroids`.
- `app/lib/games/asteroids/constants.ts` — `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, constantes de power-up.
- `app/lib/games/asteroids/entities.ts` — clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`; `draw(ctx)` recibe el contexto como parámetro.
- `app/lib/games/asteroids/engine.ts` — estado, input, loop, colisiones, HUD del canvas, `createAsteroidsGame`.
- `app/components/AsteroidsCanvas.tsx` — `"use client"`; `<canvas width={800} height={600}>` + `useEffect` que crea y destruye el motor; recibe callbacks y expone el controlador vía `ref`.
- `app/components/GamePlayer.tsx` — monta `AsteroidsCanvas` y conecta HUD, pausa, `FIN` y modal cuando `game.id === "asteroids"`.

Convenciones:

- Coordenadas con origen arriba-izquierda; velocidades en px/s; `dt` en segundos limitado a 0.05.
- El motor es la única fuente de verdad del estado del juego; React solo refleja el `AsteroidsSnapshot`.
- Ningún símbolo del motor vive en el scope del módulo salvo constantes y clases; todo el estado mutable vive en el closure de `createAsteroidsGame`.
- Teclado escuchado en `window`; `preventDefault` solo para `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space` (evita scroll).
- Se ignoran eventos de teclado cuyo `target` sea `input`, `textarea` o `contenteditable` (permite escribir el nombre en el modal).
- En `gameover` el motor ignora `P`/`Escape` y `Space` no reinicia; el reinicio solo llega por `restart()`.
- El overlay del canvas en `gameover` muestra `GAME OVER` y `PUNTAJE: <n>`, sin el texto `ESPACIO PARA REINICIAR`.
- La pausa no se dibuja en el canvas; la muestra el overlay React `EN PAUSA`.

## Plan de implementación

1. Añadir la entrada `asteroids` al final de `GAMES` en `app/data/games.ts`. Verificar: aparece en `/games` (también con filtro `SHOOTER`); `/games/asteroids` muestra el detalle con leaderboard vacío sin errores; `/games/asteroids/play` abre el placeholder.
2. Crear `app/lib/games/asteroids/constants.ts` y `entities.ts` portando las clases a TS con `ctx` inyectado en `draw`. Verificar: `npm run build` compila.
3. Crear `engine.ts` con `createAsteroidsGame`: estado en closure, input con listeners propios, loop `requestAnimationFrame`, update/draw y HUD del canvas igual al original. `destroy()` cancela el rAF y quita listeners. Verificar: `npm run build` compila.
4. Crear `app/components/AsteroidsCanvas.tsx` y montarlo en `GamePlayer` dentro de `.crt-screen` solo cuando `game.id === "asteroids"`; el resto sigue con `.game-arena`. Canvas con `position: absolute; inset: 0; width: 100%; height: 100%`. Verificar: `/games/asteroids/play` se juega igual que el original abriendo `references/starter-games/02-asteroids/index.html`; `/games/rocas/play` sigue con el placeholder.
5. Implementar `onStateChange` (comparando con el último snapshot emitido) y conectar el `player-hud` de `GamePlayer` a puntaje, vidas y nivel reales cuando el juego es `asteroids`. Verificar: destruir un asteroide grande suma 20 en ambos HUD; perder una vida baja el contador en ambos.
6. Implementar pausa: `pause/resume/togglePause`, teclas `P`/`Escape` y `visibilitychange` en el motor; el botón `PAUSA` llama al controlador y el overlay `EN PAUSA` se muestra según `snapshot.paused`. Verificar: pausado, los asteroides no se mueven; cambiar de pestaña y volver deja el juego en pausa.
7. Implementar `end()`, `onGameOver` y `restart()`: `FIN` y vidas = 0 abren el modal con la puntuación final; `JUGAR DE NUEVO` reinicia el motor y resetea `over`/`saved`. Quitar el reinicio con `Space`. Verificar: escribir en el input del modal (incluido espacio y `P`) no afecta al juego.
8. `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/data/games.ts` incluye la entrada `asteroids` con los valores del Modelo de datos, al final del array.
- [ ] `/games` lista `ASTEROIDS` (también con el filtro `SHOOTER`) y `ROCAS` sigue en el catálogo.
- [ ] `/games/asteroids` renderiza el detalle sin errores aunque el leaderboard esté vacío.
- [ ] `/games/asteroids/play` muestra el juego en un `<canvas>` de 800×600 lógicos escalado dentro del `.crt-screen`, sin errores en consola.
- [ ] Nave, asteroides, balas, partículas, power-up `3x` y HUD del canvas se ven igual que en `references/starter-games/02-asteroids/index.html`.
- [ ] `←` `→` rotan, `↑` propulsa, `Espacio` dispara; ninguna de esas teclas hace scroll en la página.
- [ ] Destruir asteroides suma 20 / 50 / 100 según tamaño grande / mediano / pequeño.
- [ ] El HUD del canvas (`SCORE`, `NIVEL`, iconos de vidas, `3x`) sigue visible durante la partida.
- [ ] El `player-hud` muestra el mismo puntaje, vidas y nivel que el HUD del canvas en todo momento.
- [ ] `onStateChange` no se dispara en frames sin cambios (comprobable con un `console.count` temporal).
- [ ] Botón `PAUSA`, tecla `P` y tecla `Escape` alternan la pausa; pausado, nada se mueve y se ve el overlay `EN PAUSA`.
- [ ] El botón muestra `REANUDAR` mientras está pausado y `PAUSA` en otro caso, también cuando la pausa vino por teclado.
- [ ] Ocultar la pestaña pausa el juego; al volver sigue pausado hasta reanudar.
- [ ] Perder las 3 vidas abre el modal `FIN DEL JUEGO` con la puntuación final correcta.
- [ ] `FIN` abre el modal con la puntuación actual y el juego deja de aceptar input de nave.
- [ ] `JUGAR DE NUEVO` cierra el modal y empieza una partida con puntaje 0, 3 vidas y nivel 1.
- [ ] En game over, `Espacio` no reinicia la partida.
- [ ] Escribir en el input del modal (incluidos espacio y `P`) funciona y no afecta al juego.
- [ ] `SALIR` y `VOLVER AL VAULT` navegan y no quedan listeners ni loop activos (sin errores ni CPU al 100% tras salir).
- [ ] En desarrollo (React Strict Mode) solo corre un loop: la nave no se mueve al doble de velocidad.
- [ ] Otros juegos, incluido `/games/rocas/play`, siguen mostrando el placeholder de SPEC 01.
- [ ] Ningún archivo de `references/` cambia; en `app/data/` solo cambia `games.ts` (una entrada añadida).

## Decisiones

- **Sí:** nueva entrada `asteroids` en el catálogo. Decisión del usuario (cambio respecto al primer borrador).
- **No:** reusar `rocas`. Planteado primero; descartado por el usuario.
- **Sí:** `rocas` se queda como placeholder. No se eliminan entradas del catálogo en este spec.
- **Sí:** reusar la clase `cover-rocas`. Sin cambios en `globals.css`.
- **No:** portada propia `cover-asteroids`. Va en otro spec si hace falta.
- **Sí:** `color: "cyan"`, `best: 0`, `plays: "0"`. Juego nuevo sin récords inventados; cyan lo distingue de `rocas` (yellow).
- **Sí:** textos `short` / `long` basados en el README del juego original.
- **Sí:** entrada al final del array. No altera el orden actual del catálogo.
- **Sí:** portar a TypeScript como motor modular. Permite ciclo de vida React y comunicación con la UI.
- **No:** iframe con el juego estático en `public/`. No comunica puntaje ni fin de partida con la plataforma.
- **Sí:** el juego vive completo en el canvas, HUD incluido, como el original. Decisión del usuario.
- **Sí:** además el motor notifica a React puntaje, vidas, nivel y pausa. Decisión del usuario; alimenta el `player-hud` y el modal.
- **No:** quitar el HUD del canvas. El usuario quiere el juego intacto dentro del canvas.
- **No:** React como única capa de UI visible. Propuesta descartada por el usuario: conviven los dos HUD; el del canvas es del juego y el `player-hud` refleja lo que el motor notifica.
- **Sí:** notificar solo en cambios. Evita re-renders de React a 60 fps.
- **Sí:** motor como fuente de verdad de la pausa. Teclado, `visibilitychange` y botón convergen en el mismo estado.
- **Sí:** pausa con botón + `P`/`Escape` + autopausa al ocultar pestaña.
- **Sí:** `FIN` fuerza game over; `JUGAR DE NUEVO` reinicia vía `restart()`.
- **No:** reiniciar con `Espacio`. Chocaría con escribir en el input del modal.
- **Sí:** modal existente sin persistencia. Guardar puntuaciones va en su propio spec.
- **No:** Supabase o localStorage en este spec.
- **Sí:** visual idéntico al original. El marco `crt` ya aporta la estética de la plataforma.
- **No:** recolorear a neón con `/frontend-design`. No hay UI nueva que diseñar en este spec.
- **Sí:** resolución lógica 800×600 escalada por CSS. La física no cambia y encaja en el `.crt-screen` 4:3.
- **Sí:** motor en `app/lib/games/asteroids/`. Coherente con `app/lib/supabase/`; evita confundirlo con rutas bajo `app/games/`.
- **Sí:** `if (game.id === "asteroids")` en `GamePlayer`. Con un solo juego real, un registro genérico es prematuro.
- **No (sin respuesta del usuario, queda fuera):** controles táctiles y sonido.

## Riesgos

| Riesgo                                                                             | Mitigación                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta/desmonta dos veces y deja dos loops o listeners duplicados | `destroy()` cancela el rAF y quita todos los listeners; el `useEffect` lo llama en su cleanup. Criterio de aceptación dedicado.                                    |
| `preventDefault` en `Space` bloquea escribir en el input del modal                 | Ignorar eventos con `target` editable (paso 7).                                                                                                                    |
| `onStateChange` dispara `setState` durante el loop y provoca renders cada frame    | Comparar con el último snapshot emitido antes de notificar.                                                                                                        |
| Callbacks de React cambian de identidad y recrean el motor en cada render          | `AsteroidsCanvas` guarda los callbacks en un `ref`; el motor se crea una sola vez por montaje.                                                                     |
| `GamePlayer` se renderiza bajo `cacheComponents` / Suspense                        | El motor solo se crea en `useEffect` (cliente); nada del canvas se ejecuta en servidor. Consultar `node_modules/next/dist/docs/` si aparece un error de prerender. |
| El escalado CSS desalinea el canvas en pantallas pequeñas                          | `.crt-screen` ya fija 4:3; el canvas ocupa `100%` del contenedor con la misma proporción.                                                                          |
| Teclas pulsadas al pausar quedan "pegadas" al reanudar                             | Limpiar `keys` y `justPressed` al pausar y al reiniciar.                                                                                                           |
| `getLeaderboard("asteroids")` devuelve `[]`                                        | Verificar en el paso 1 que el detalle renderiza con lista vacía.                                                                                                   |
| `asteroids` al final del array no aparece en la home (`games.slice(0, 6)`)         | Aceptado: la home no cambia en este spec; el juego es accesible desde `/games`.                                                                                    |
| Dos juegos de asteroides en el catálogo (`ROCAS` y `ASTEROIDS`) pueden confundir   | Aceptado por el usuario; `rocas` sigue como placeholder hasta que otro spec lo resuelva.                                                                           |

## Lo que **no** entra en este spec

- Persistencia de puntuaciones.
- Controles táctiles y sonido.
- Cambios en la entrada `rocas` y portada propia para `asteroids`.
- Leaderboard / actividad mock de `asteroids` y presencia en la home.
- Recolor neón del juego.
- Otros juegos de `references/starter-games/`.
- Registro genérico de juegos.

Cada uno, si llega, va en su propio spec.
