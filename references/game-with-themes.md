# Juegos con temas (skins) — skin-designer

> Referencia de qué juegos tienen skins. Mantenido por el agente `skin-designer` (`.claude/agents/skin-designer.md`), un juego por ejecución, siempre indicado por el usuario. Skins obligatorios: classic (default) · neon · retro, afinados para modo oscuro. Selector por juego en `GamePlayer` (`localStorage` `av-skin:<id>`).
> Leyenda: ✅ implementado · ❌ pendiente

## Matriz

| Juego     | classic | neon | retro | Fecha | Notas                                          |
| --------- | ------- | ---- | ----- | ----- | ---------------------------------------------- |
| asteroids | ✅      | ✅   | ✅    | 2026-10-13 | `skins.ts`; draw(ctx, palette); glow solo neon (no en partículas); partículas con `globalAlpha` |
| tetris    | ❌      | ❌   | ❌    | —     | `COLORS` + `THEME` en `constants.ts`           |
| arkanoid  | ❌      | ❌   | ❌    | —     | Spritesheet: tintar con `ctx.filter`           |
| snake     | ❌      | ❌   | ❌    | —     | `COLORS` en `constants.ts`; fruta es sprite    |

## Infraestructura común

- [x] ✅ `SkinId` / `GameOptions` en `app/lib/games/types.ts`
- [x] ✅ `skins?` en `GAME_ENGINES` (`registry.ts`)
- [x] ✅ `app/lib/games/skin-store.ts`
- [x] ✅ `SkinSelector` en `GamePlayer` (`.skin-selector` / `.skin-chip` / `.player-hud-controls` en `globals.css`)
- [x] ✅ `GameCanvas` pasa `options` (montado con `key={skin}`: cambiar skin reinicia partida)

## Paletas (fondo · principal · contraste HUD/entidades)

### asteroids

| Skin | Fondo | Principal | HUD min | Entidades min | Notas |
| ---- | ----- | --------- | ------- | ------------- | ----- |
| classic | `#000` | `#fff` (+ `#0ff` power-up) | 8.60 (overlaySub) | 6.19 (llama) | Colores originales idénticos |
| neon | `#07070f` | nave `#00f5ff`, asteroides `#ff2d8a`, balas `#f5ff00`, power-up `#00ff88` | 5.73 (GAME OVER) | 5.73 (asteroides) | Glow 12 entidades / 6 HUD |
| retro | `#0b140c` | fósforo verde: nave `#b4ff9e`, asteroides `#4fcf4a`, balas `#e6ffde` | 8.07 (overlaySub) | 7.68 (llama) | Sin glow |

## Registro

- 2026-10-13 — Archivo creado; ningún juego con skins.
- 2026-10-13 — asteroids: classic/neon/retro implementados; creada infraestructura común (types, registry, skin-store, SkinSelector, GameCanvas/GamePlayer, CSS).
