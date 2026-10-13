---
name: nuevo-juego
description: Porta un juego de references/starter-games/ a Arcade Vault y lo deja integrado de punta a punta (motor TS en canvas, ficha en Supabase, guardado de puntuación y leaderboard), siguiendo SPEC 05 y SPEC 06. Genera el spec, crea la rama, implementa por pasos y verifica con Playwright.
argument-hint: "<carpeta de references/starter-games, p. ej. 03-tetris>"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*), Bash(cp:*), Bash(mkdir:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git diff:*), Bash(npm run lint:*), Bash(npm run build:*), mcp__supabase__apply_migration, mcp__supabase__execute_sql, mcp__supabase__get_advisors, mcp__supabase__list_tables, mcp__playwright
---

# /nuevo-juego — Portar e integrar un juego con leaderboard

## Contexto de la sesión

Fecha de hoy: !`date +%F`

Argumento: `$ARGUMENTS`

Juegos de referencia (`references/starter-games/`):
!`ls references/starter-games/`

Motores ya integrados (`app/lib/games/`):
!`ls app/lib/games/`

Registro genérico:
!`ls app/lib/games/registry.ts 2>/dev/null || echo "NO EXISTE (este juego debe crearlo)"`

Specs:
!`ls specs/`

Migraciones:
!`ls supabase/migrations/`

Placeholders de referencia en `app/data/games.ts` (no importado por la app):
!`grep -n "id:\|cover:" app/data/games.ts`

Rama y estado:
!`git branch --show-current`
!`git status --short`

---

## Objetivo

Repetir para un juego nuevo el ciclo que hoy solo tiene Asteroids: **jugar → fin de partida → guardar puntuación → verla en `/games/<id>` y `/hall-of-fame`**.
Patrón obligatorio: `specs/05-juego-asteroides.md` (motor) y `specs/06-tablas-juegos-leaderboard.md` (Supabase). Léelos antes de empezar; sus decisiones siguen vigentes salvo que el usuario diga lo contrario.
Los juegos **solo** vienen de subcarpetas de `references/starter-games/`. No se diseñan juegos desde cero.

Sigue las fases en orden. No avances si la anterior no terminó bien.

## Fase 1 — Origen

- Si `$ARGUMENTS` está vacío o no es una subcarpeta de `references/starter-games/`: lista las disponibles (marca las ya integradas según `app/lib/games/`) y pide una con `AskUserQuestion`.
- Si el juego ya está integrado, detente y avisa.
- Lee completa la carpeta: `README.md`, `CLAUDE.md`, `index.html`, `style.css`, todos los `.js`, `specs/`, `assets/`.
- Extrae: controles (teclado/ratón), resolución del canvas, estados (playing/paused/gameover…), cómo se puntúa, vidas/nivel/líneas, globals y listeners a encapsular, loop, assets (sprites, sonidos), elementos DOM fuera del canvas (overlays, paneles, botones).
- Resume en 5–10 líneas y confírmalo con el usuario.

## Fase 2 — Preguntas de integración

`AskUserQuestion` (máx. 4 por tanda), siempre con opción recomendada. Solo lo que no puedas deducir:

- **Ficha:** si hay placeholder equivalente en `app/data/games.ts` (p. ej. `caida` ≈ Tetris, `bloque-buster` ≈ Arkanoid), ofrecer reutilizar su `id`/textos/portada o usar un id propio del original. Campos: `id` (`^[a-z0-9-]+$`), `title`, `short`, `long` (basados en el README), `cat` (`ARCADE|PUZZLE|SHOOTER|VERSUS`), `color` (`cyan|magenta|yellow|green`), `cover` (clase `cover-*` existente en `app/globals.css` o portada nueva con `/frontend-design`).
- **HUD de la plataforma:** qué campos refleja el `player-hud` (puntuación siempre; vidas, nivel, líneas… según el juego). El HUD del canvas original se conserva (conviven ambos, SPEC 05).
- **Puntuación:** debe ser entero, mayor = mejor, 0–9.999.999 (CHECK de `scores`). Si no encaja, es cambio de schema: decisión explícita y migración aparte.
- **DOM del original:** cada elemento fuera del canvas se dibuja en el canvas, pasa a React o se descarta.

Por defecto (decisiones ya tomadas): port idéntico al original en gameplay y aspecto; sprites **y** sonidos incluidos en `public/games/<id>/`; sin controles táctiles.

## Fase 3 — Spec

**Antes de escribir nada, lee completos `~/.claude/skills/spec/SKILL.md` y `~/.claude/skills/spec/template.md`.** Son la referencia obligatoria para crear el archivo de spec: aplica sus reglas de redacción (fase "Write the spec"), de guardado (fase "Save the spec") y sus errores a evitar.

Del skill `/spec` se aplican:

- Orden y contenido de las secciones del template (cabecera con objetivo en una frase, alcance con "fuera" explícito, modelo de datos, plan con pasos que dejan el sistema funcional, criterios booleanos verificables, decisiones tomadas y descartadas, riesgos si aplican).
- Si las fases 1–2 dejaron todo claro, escribir el spec completo de una vez; solo si falta información, ir sección por sección pidiendo confirmación.
- Numeración `NN` = mayor número de `specs/` + 1; fecha leída del contexto de sesión (nunca inventada); comprobar que las dependencias citadas existen en `specs/`.
- Crear `specs/.spec-config.yml` con el contenido por defecto si no existe; nunca sobrescribirlo.
- Idioma, nombres de estados y encabezados iguales a los specs existentes (SPEC 05/06: español, `Borrador` / `Aprobado` / `Implementado`).

Particularidades de este skill (prevalecen sobre `/spec`):

- Archivo `specs/NN-juego-<id>.md`. Cabecera: estado `Borrador`, `Depende de: SPEC 05, SPEC 06`.
- Alcance, archivos, plan y criterios salen de las secciones de referencia de este skill (§ Registro si no existe, § Supabase, § Motor, § Verificación), con nombres y valores concretos (ningún `<id>` sin sustituir).
- Decisiones con "Sí/No" y motivo; las del usuario marcadas como "Decisión del usuario".
- Tras guardar, pide al usuario que lo revise y apruebe. Con su OK, cambia el estado a `Aprobado` y **continúa con la Fase 4** (aquí no se aplica la regla de `/spec` de parar tras guardar ni la de no escribir código).

## Fase 4 — Rama

- Si `git status --short` no está vacío, pide al usuario que lo resuelva (commit/stash) antes de seguir.
- `git checkout -b spec-NN-juego-<id>` desde la rama actual.

## Fase 5 — Implementación por pasos

Tras **cada** paso: verificación del paso, `git diff --stat`, resumen breve y **pausa** hasta que el usuario diga que siga. Sin commits automáticos.
Antes de usar cualquier API de Next, consulta el doc correspondiente en `node_modules/next/dist/docs/` (Next 16 difiere del training data).

1. **Registro genérico** (solo si no existe `app/lib/games/registry.ts`): ver § Registro. Verificar: `npm run build`; Asteroids se juega y guarda igual que antes.
2. **Ficha en Supabase:** migración seed (§ Supabase) aplicada con `apply_migration` y verificada con `execute_sql`. Pedir al usuario reiniciar `npm run dev`. Verificar: `/games` lista el juego; `/games/<id>` muestra "Mejor global" 0 y ranking vacío.
3. **Assets:** copiar (`cp`, nunca mover) desde `references/starter-games/<carpeta>/assets/` a `public/games/<id>/`. `references/` queda intacto.
4. **Motor:** `app/lib/games/<id>/constants.ts`, `entities.ts`, `engine.ts` según § Motor, tomando `app/lib/games/asteroids/` como modelo. Verificar: `npm run build`.
5. **Alta en la plataforma:** entrada en `GAME_ENGINES` y id en `PLAYABLE_GAMES`. Verificar: `/games/<id>/play` se juega igual que abrir `references/starter-games/<carpeta>/index.html`; guardar crea fila en `scores`.
   5b. **Skins:** el juego debe tener `classic`/`neon`/`retro` (contrato y reglas en `.claude/agents/skin-designer.md`); delegar en el agente `skin-designer`.
6. **UI nueva** (portada, mensajes, HUD extra) solo si aplica: diseñar con `/frontend-design`, reutilizando tokens de `app/globals.css`.
7. **`CLAUDE.md`:** actualizar la frase "Asteroids is the only real game" y la lista de juegos jugables.

## Fase 6 — Verificación

Ejecuta todo § Verificación. Si algo falla, corrige y repite; informa fallos con su salida, sin maquillarlos.

## Fase 7 — Cierre

- Marca los criterios cumplidos en el spec y cambia el estado a `Implementado`; añade a Decisiones lo decidido durante la implementación.
- Resumen final conciso: archivos, migración aplicada, resultado de la verificación.
- Commit o PR solo si el usuario lo pide.

---

## § Motor

Archivos en `app/lib/games/<id>/`: `constants.ts` (`W`, `H` y constantes de gameplay), `entities.ts` (clases; `draw(ctx)` recibe el contexto), `engine.ts` (estado, input, loop, colisiones, HUD del canvas, fábrica).

API pública (compatible con `GameFactory` de § Registro):

```ts
export function create<Juego>Game(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks, // onStateChange(snapshot), onGameOver(finalScore)
): GameEngine; // pause, resume, togglePause, end, restart, destroy
```

Reglas (todas presentes en `app/lib/games/asteroids/engine.ts`):

- Ningún estado mutable en el scope del módulo: todo vive en el closure de la fábrica. Solo constantes y clases a nivel de módulo.
- Loop con `requestAnimationFrame`; `dt` en segundos limitado a 0.05.
- Pausado: no se llama a `update` ni `draw`. La pausa la pinta el overlay React `EN PAUSA`, no el canvas.
- `emitStateIfChanged()` compara con el último snapshot emitido; nunca notifica en frames sin cambios.
- Teclado en `window`; ignorar eventos cuyo `target` sea `input`, `textarea` o `contenteditable`; `preventDefault` solo en teclas que hacen scroll (flechas, `Space`).
- `P` y `Escape` alternan la pausa (ignoradas en `gameover`). `visibilitychange` con pestaña oculta → `pause()`; reanudar siempre es manual.
- `clearInput()` al pausar, reanudar, terminar y reiniciar.
- Una sola función `gameOver()` que garantiza un único `onGameOver` por partida. `end()` despausa y fuerza game over. Ninguna tecla reinicia en `gameover`: solo `restart()`.
- Overlay del canvas en `gameover` sin textos tipo "pulsa X para reiniciar".
- Ratón: listeners sobre el canvas; convertir coordenadas CSS a lógicas con `getBoundingClientRect()` (`x * W / rect.width`).
- Assets: rutas `/games/<id>/...`; precargar en la fábrica y no dibujar sprites hasta que estén listos.
- Sonido: `Audio` creado en la fábrica; no suena en pausa; `destroy()` lo detiene.
- `destroy()` cancela el rAF y quita **todos** los listeners (teclado, ratón, `visibilitychange`).
- Gameplay, física, puntuación y aspecto idénticos al original.

## § Registro

Se crea una sola vez (con el 2.º juego real). Sustituye el `if (game.id === "asteroids")` de `GamePlayer` y la lista fija `SAVEABLE_GAMES` de `saveScore`.

- `app/lib/games/types.ts`:
  - `GameSnapshot { score: number; paused: boolean; lives?: number; level?: number; extra?: { label: string; value: string }[] }`
  - `GameCallbacks { onStateChange(s: GameSnapshot): void; onGameOver(finalScore: number): void }`
  - `GameEngine { pause; resume; togglePause; end; restart; destroy }`
  - `GameFactory = (canvas: HTMLCanvasElement, callbacks: GameCallbacks) => GameEngine`
- Asteroids se adapta a estos tipos sin cambiar su comportamiento.
- `app/lib/games/playable.ts` (sin dependencias; importable desde cliente y Server Action): `PLAYABLE_GAMES = ["asteroids", ...] as const` + `isPlayable(id)`.
- `app/lib/games/registry.ts` (cliente): `GAME_ENGINES: Record<string, { create: GameFactory; width: number; height: number }>`.
- `app/components/GameCanvas.tsx`: versión genérica de `app/components/AsteroidsCanvas.tsx` (callbacks en `ref`, motor creado en `useEffect([])` y destruido en el cleanup, controlador vía `useImperativeHandle`, canvas `position:absolute; inset:0; width:100%; height:100%`). Si la proporción no es 4:3, letterbox centrado dentro del `.crt-screen`. `AsteroidsCanvas.tsx` se elimina.
- `app/components/GamePlayer.tsx`: `const engine = GAME_ENGINES[game.id]`; si existe monta `GameCanvas` y usa el snapshot; si no, placeholder actual. El HUD oculta vidas/nivel cuando vienen `undefined` y pinta `extra`. Guardado real y `VER RANKING` para todo juego jugable.
- `app/actions/scores.ts`: valida `gameId` con `isPlayable` en lugar de `SAVEABLE_GAMES`.

Con el registro existente, añadir un juego = motor + entrada en `GAME_ENGINES` + id en `PLAYABLE_GAMES` + seed.

## § Supabase

El leaderboard no necesita schema nuevo: `scores`, la vista `game_stats` (`best = max(score)`) y los grants ya existen (SPEC 06). `games` es de solo lectura para la app: la fila entra **solo** por migración.

Migración `supabase/migrations/<YYYYMMDDHHMMSS>_seed_<id>.sql` (timestamp del momento de aplicarla), mismo formato que `supabase/migrations/20261013033746_seed_games.sql`:

```sql
-- SPEC NN: fila de <id> en games. scores empieza vacía.
insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  '<id>', '<TITLE>', '<short>', '<long>', '<CAT>', '<cover>', '<color>', '0'
);
```

- Escribir el archivo y aplicarlo con `apply_migration` (mismo nombre `seed_<id>`).
- Verificar con `execute_sql`: la fila existe en `games`; `select best from game_stats where id = '<id>'` → 0; `scores` sin filas para `<id>`.
- `get_advisors` (security): solo el aviso conocido de RLS desactivada.
- Sin cambios de schema no se regenera `database.types.ts`. Si hubo cambio de schema: `revoke all` + grants explícitos en la migración y regenerar tipos con `generate_typescript_types`.
- Prohibido insertar puntuaciones demo: el ranking se llena con partidas reales.
- Lecturas: `getGames`, `getGameById`, `getLeaderboard` de `app/data/catalog.server.ts` (tags `games`/`scores`); `/games/<id>` muestra 10 filas y `/hall-of-fame` 12. No requieren cambios.
- Escritura: `saveScore` (`app/actions/scores.ts`) inserta sin `user_id` y llama a `updateTag("scores")`, que refresca ranking y `best`.
- SQL aplicado por MCP no invalida la caché `"use cache"`: reiniciar `npm run dev` tras el seed.
- `npm run build` prerenderiza `/games/<id>` vía `generateStaticParams`: necesita el seed aplicado y Supabase accesible.

## § Verificación

**Automática**

- `npm run lint` y `npm run build` sin errores.
- `execute_sql`: fila en `games`; `best = 0` antes de jugar.
- `git status`: ningún archivo de `references/` modificado.

**Playwright** (dev server en marcha; cerrar el navegador con `browser_close` al terminar, aunque algo falle)

1. `/games`: aparece el juego (también con su filtro de categoría).
2. `/games/<id>`: detalle con "Mejor global" 0 y ranking vacío, sin errores.
3. `/games/<id>/play`: `<canvas>` visible dentro de `.crt-screen`; consola sin errores ni warnings de `key`.
4. Jugar unos segundos con las teclas del juego: el `player-hud` cambia y coincide con el HUD del canvas.
5. `P` → overlay `EN PAUSA` y botón `REANUDAR`; `Escape` reanuda.
6. `FIN` → modal `FIN DEL JUEGO` con la puntuación actual.
7. En el input escribir `ace_01` (se ve `ACE_01`; espacio y `P` no afectan al juego) → `GUARDAR PUNTUACIÓN` → `GUARDANDO...` → toast + `VER RANKING`.
8. `execute_sql`: nueva fila en `scores` con `game_id = '<id>'`, `player_name = 'ACE_01'`, `user_id` null.
9. `VER RANKING` → la fila aparece en `/games/<id>` (fecha `dd/mm/aaaa`) sin reiniciar el servidor; si la puntuación > 0, "Mejor global" se actualiza.
10. `/hall-of-fame`: pestaña del juego con la fila.
11. Nombre `JOSÉ!` → mensaje `NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _` y ninguna fila nueva.
12. `JUGAR DE NUEVO` → partida nueva con estado inicial; se puede volver a guardar.
13. Regresión: `/games/asteroids/play` se juega, pausa y guarda como antes.

**Criterios heredados (incluirlos en el spec)**

- Un solo loop en Strict Mode (velocidad normal del juego).
- `onStateChange` no se dispara en frames sin cambios.
- Ocultar la pestaña pausa; al volver sigue pausado.
- Salir (`SALIR`, `VOLVER AL VAULT`) no deja loop, listeners ni sonido activos.
- `saveScore` con id no jugable, `score` negativo, decimal o > 9.999.999 → `{ ok: false, error: "invalid" }` sin insertar.
- Varias filas con el mismo nombre no producen warnings de `key`.
