# Juegos con temas (skins) — skin-designer

> Referencia de qué juegos tienen skins. Mantenido por el agente `skin-designer` (`.claude/agents/skin-designer.md`), un juego por ejecución, siempre indicado por el usuario. Skins obligatorios: classic (default) · neon · retro, afinados para modo oscuro. Selector por juego en `GamePlayer` (estado local de `GamePlayer`, sin persistencia).
> Leyenda: ✅ implementado · ❌ pendiente

## Matriz

| Juego     | classic | neon | retro | Fecha | Notas                                          |
| --------- | ------- | ---- | ----- | ----- | ---------------------------------------------- |
| asteroids | ✅      | ✅   | ✅    | 2026-10-13 | `skins.ts`; draw(ctx, palette); glow solo neon (no en partículas); partículas con `globalAlpha` |
| tetris    | ❌      | ❌   | ❌    | —     | `COLORS` + `THEME` en `constants.ts`           |
| arkanoid  | ✅      | ✅   | ✅    | 2026-10-13 | `skins.ts`; sprites tintados con `ctx.filter` vía `drawSkinnedSprite` (save/restore; classic `none` sin tocar ctx); neon `saturate(1.6) brightness(1.4)` + glow 12 solo paleta/bola; retro `sepia(0.4) saturate(0.8) brightness(1.2)` + scanlines; override `blockFilter.gray` (más brillo) en neon/retro |
| snake     | ✅      | ✅   | ✅    | 2026-10-13 | `COLORS` → `SKINS.classic`; fruta sprite con `ctx.filter` (classic `none`, neon `saturate(1.6) contrast(1.15)`, retro `sepia(1) saturate(1.8) brightness(1.1)`); glow solo neon (segmentos + HUD); retro segmentos casi cuadrados (radius 2) |
| frogger   | ✅      | ✅   | ✅    | 2026-10-13 | `COLORS` → `SKINS.classic` (eliminado de `constants.ts`); sin sprites; glow solo neon (rana/coches/camiones 12, HUD/overlay 6) vía `setGlow`/`clearGlow`; tortugas neon magenta y retro teal para distinguirlas de la rana |

## Infraestructura común

- [x] ✅ `SkinId` / `GameOptions` en `app/lib/games/types.ts`
- [x] ✅ `skins?` en `GAME_ENGINES` (`registry.ts`)
- [x] ✅ `SkinSelector` en `GamePlayer` (`.skin-selector` / `.skin-chip` / `.player-hud-controls` en `globals.css`)
- [x] ✅ `GameCanvas` pasa `options` (montado con `key={skin}`: cambiar skin reinicia partida)

## Paletas (fondo · principal · contraste HUD/entidades)

### asteroids

| Skin | Fondo | Principal | HUD min | Entidades min | Notas |
| ---- | ----- | --------- | ------- | ------------- | ----- |
| classic | `#000` | `#fff` (+ `#0ff` power-up) | 8.60 (overlaySub) | 6.19 (llama) | Colores originales idénticos |
| neon | `#07070f` | nave `#00f5ff`, asteroides `#ff2d8a`, balas `#f5ff00`, power-up `#00ff88` | 5.73 (GAME OVER) | 5.73 (asteroides) | Glow 12 entidades / 6 HUD |
| retro | `#0b140c` | fósforo verde: nave `#b4ff9e`, asteroides `#4fcf4a`, balas `#e6ffde` | 8.07 (overlaySub) | 7.68 (llama) | Sin glow |

### snake

| Skin | Fondo | Principal | HUD min | Entidades min | Notas |
| ---- | ----- | --------- | ------- | ------------- | ----- |
| classic | `#0a0a18` (HUD `#05050d`) | cabeza `#00ff88`, cuerpo `#00c46a`, HUD `#fff` | 20.31 (HUD) | 8.51 (cuerpo) | Colores originales idénticos; sin filtro de fruta |
| neon | `#07070f` (HUD `#03030a`) | cabeza `#f5ff00`, cuerpo `#00ff88`, HUD `#00f5ff`, GAME OVER `#ff2d8a` | 5.88 (GAME OVER sobre velo) | 14.97 (cuerpo) | Glow 12 segmentos / 6 HUD, reseteado tras dibujar |
| retro | `#1a1206` (HUD `#120c03`) | fósforo ámbar: cabeza `#ffd27a`, cuerpo `#d9901a`, HUD `#ffb000` | 10.62 (HUD) | 7.02 (cuerpo) | Sin glow; fruta en sepia ámbar |

### arkanoid

Contraste de sprites medido con el color medio de cada recorte (sharp) tras aplicar la matriz del filtro CSS.

| Skin | Fondo | Principal | HUD min | Entidades min | Notas |
| ---- | ----- | --------- | ------- | ------------- | ----- |
| classic | `#000` | HUD/overlay `#fff`, sprites originales | 21.00 (HUD) | 2.06 (bloque gris; heredado del original, sin cambio) · resto ≥2.66 magenta / 3.00 rojo | Idéntico al original; gris/magenta < 3:1 ya en el original |
| neon | `#07070f` | HUD `#00f5ff`, GAME OVER `#ff2d8a`, glow paleta cyan / bola `#f5ff00` | 5.73 (GAME OVER sobre velo) | 3.96 (bloque magenta) · gris 5.24 | Glow 12 paleta/bola, 6 HUD; bloques sin glow |
| retro | `#1a1208` | CRT ámbar: HUD/overlay `#ffb000`, sprites sepia parcial (conservan tono) | 10.11 (HUD) | 3.06 (bloque magenta) · gris 4.66 | Sin glow; scanlines `rgba(0,0,0,0.18)` 1px/4px |

### frogger

Contraste de entidades frente a su zona (vehículos/carretera, troncos-tortugas/río, rana/todas las zonas); HUD frente a fila de metas; barra de tiempo frente a zona segura; overlay frente a velo 0.6.

| Skin | Fondo | Principal | HUD min | Entidades min | Notas |
| ---- | ----- | --------- | ------- | ------------- | ----- |
| classic | carretera `#0a0a0a`, río `#06204a`, segura `#0d3a14`, metas `#2f7a2f` | rana `#39ff6a`, HUD `#fff` | 5.32 (texto HUD) · vidas 3.98 · tiempo bajo 3.64 | 2.72 (tronco; heredado del original, sin cambio) · resto ≥5.54 | Colores originales idénticos |
| neon | carretera `#07070f`, río `#050b1a`, segura `#0d0614`, metas `#0d0d1a` | rana `#00ff88`, coches `#ff2d8a`/`#f5ff00`/`#00f5ff`, camión `#b06bff`, troncos `#ff8a3d`, tortugas `#ff2d8a`, HUD `#00f5ff` | 5.81 (GAME OVER sobre velo) | 5.61 (tortuga) | Glow 12 rana/vehículos, 6 HUD; reseteado tras dibujar |
| retro | carretera `#16120c`, río `#0f1a1c`, segura `#1a2010`, metas `#2a3418` | 8 bits apagada: rana `#c8ec80`, tortugas `#5fb0a0`, HUD crema `#f0e6c8` | 10.52 (texto HUD) · tiempo bajo 4.36 | 4.41 (tronco) | Sin glow; rana/tortuga 1.92 por luminancia pero tonos distintos (lima vs teal) |

## Registro

- 2026-10-13 — Archivo creado; ningún juego con skins.
- 2026-10-13 — asteroids: classic/neon/retro implementados; creada infraestructura común (types, registry, skin-store, SkinSelector, GameCanvas/GamePlayer, CSS).
- 2026-10-13 — snake: classic/neon/retro implementados (`skins.ts`, motor sin colores hardcodeados, fruta tintada con `ctx.filter`); infraestructura común reutilizada.
- 2026-10-13 — arkanoid: classic/neon/retro implementados (`skins.ts`, sprites tintados con `ctx.filter`, sin colores hardcodeados en motor); infraestructura común reutilizada.
- 2026-10-13 — infraestructura: eliminado `skin-store.ts` (localStorage); el skin vive en un `useState` de `GamePlayer`, sin persistencia (cada visita arranca en classic).
- 2026-10-13 — frogger: classic/neon/retro implementados (`skins.ts`, factory acepta `options`, `COLORS` movido a `SKINS.classic`, registry con `skins`); infraestructura común reutilizada.
