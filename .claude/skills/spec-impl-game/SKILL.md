---
name: spec-impl-game
description: Implementa un spec aprobado de un juego siguiendo exactamente /spec-impl (validar estado, rama spec-NN-slug, pasos con pausas) y, al terminar, lanza en cadena (secuencial, nunca en paralelo) los agentes skin-designer y luego mobile-porter sobre ese juego.
argument-hint: <NN-spec-name>
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run lint:*), Bash(npm run build:*)
---

# /spec-impl-game — /spec-impl + skins + mobile

## Contexto de la sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Config de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

Motores de juego existentes (`app/lib/games/`):
!`ls app/lib/games/`

Juegos con skins:
!`cat references/game-with-themes.md 2>/dev/null || echo "references/game-with-themes.md no existe"`

---

## Instrucciones

Sigue las fases en orden estricto. No avances si la anterior no terminó bien.

### Fase 0 — Cargar /spec-impl

**Antes de nada, lee completo `~/.claude/skills/spec-impl/SKILL.md`.** Es la referencia obligatoria de las fases 1–4: aplícalas al pie de la letra (mismos mensajes, mismas paradas, mismas reglas). Si no existe, detente y pide instalarlo (`npx skills@latest add Klerith/fernando-skills`).

Solo se aceptan specs de `specs/NN-*.md` (no `specs/game-jam/`).

### Fases 1–4 — Igual que /spec-impl

Ejecuta las fases 1–4 de `/spec-impl` con el argumento `$ARGUMENTS` y el contexto de sesión de arriba. Particularidades (prevalecen sobre `/spec-impl`):

- **Fase 1 — juego objetivo:** además de localizar el spec, deduce el `<game-id>` del juego que implementa: id del seed en `games`, entrada en `GAME_ENGINES`, fila en `references/implemented-games.md` o slug `NN-juego-<id>`. Si no es un spec de juego o no puedes deducirlo con certeza, pregúntalo con `AskUserQuestion` (opción "no es un juego" incluida). Si no es un juego, la Fase 5 no se ejecuta.
- **Fase 4 — final:** al confirmar el usuario el último paso, **no** muestres todavía el mensaje de cierre de `/spec-impl`; pasa directamente a la Fase 5 (sin pedir confirmación extra).

### Fase 5 — Agentes en cadena (secuencial)

Lanza los agentes **uno después del otro, nunca en paralelo** (una sola llamada a `Agent` por mensaje; espera el resultado antes de la siguiente). Ninguno commitea.

**5a. `skin-designer`** — `Agent` con `subagent_type: "skin-designer"`. Prompt con: juego objetivo `<game-id>`, spec origen `specs/NN-slug.md`, rama activa, "no hagas commits", "implementa classic/neon/retro según tus reglas y actualiza `references/game-with-themes.md`".

- Si el juego ya tiene los 3 skins en `references/game-with-themes.md`, el agente lo detectará y se detendrá: anótalo y sigue con 5b.
- Si el agente falla dejando código a medias o roto, **detente**: muestra el error y pregunta al usuario cómo seguir antes de lanzar 5b.

**5b. `mobile-porter`** — solo cuando 5a terminó. `Agent` con `subagent_type: "mobile-porter"`. Prompt con: juego objetivo `<game-id>`, spec origen, rama activa, "no hagas commits", y el resultado de 5a (si el juego ya tiene skins, cablear el selector de skin real, no el placeholder `classic`).

- Si falla o se detiene, muestra su salida tal cual; no improvises el port tú.

**5c. Verificación** — `npm run lint` y `npm run build`. Informa los fallos con su salida, sin maquillarlos; no corrijas fuera del alcance del spec sin preguntar.

### Fase 6 — Cierre

Resumen conciso:

- Archivos tocados por la implementación del spec, por `skin-designer` y por `mobile-porter` (`git diff --stat`).
- Resultado de lint/build.
- Luego el mensaje de cierre de `/spec-impl` (verificar criterios de aceptación, estado `Implementado`, commit final solo si el usuario lo pide).

---

## Resumen del comportamiento esperado

```
/spec-impl-game 10-juego-frogger

  Fase 0  →  Lee ~/.claude/skills/spec-impl/SKILL.md
  Fase 1  →  Encuentra specs/10-juego-frogger.md · game-id = frogger
  Fase 2  →  Estado "Aprobado" → ✅ continúa
  Fase 3  →  git checkout -b spec-10-juego-frogger · resumen del spec
  Fase 4  →  Implementa paso a paso con pausas
  Fase 5  →  skin-designer (frogger) → espera → mobile-porter (frogger) → lint + build
  Fase 6  →  Resumen + recordatorio de criterios / estado Implementado

/spec-impl-game 09  (estado: Implementado)

  Fase 2  →  ❌ se detiene con el mensaje estándar de /spec-impl
             Sin rama, sin código, sin agentes
```
