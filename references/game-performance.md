# Rendimiento de juegos — game-performance-booster

> Referencia de qué juegos se revisaron con el checklist del SPEC 10 (`specs/10-rendimiento-frogger.md`). Mantenido por el agente `game-performance-booster` (`.claude/agents/game-performance-booster.md`), un juego por ejecución, siempre indicado por el usuario.
> Leyenda: ✅ cumple · 🛠 corregido · ❌ pendiente · — sin revisar · n/a no aplica (p. ej. juego sin glow)

## Checklist

- **P1** — `onStateChange` solo con cambios del snapshot (nunca por frame ni por segundo).
- **P2** — 0 `shadowBlur` por frame (sprites offscreen + HUD cacheado).
- **P3** — 0 `ctx.filter` por frame (sprites pre-tintados por skin).
- **P4** — fondo estático en canvas offscreen.
- **P5** — infraestructura React intacta (store + suscriptores; solo se reporta).
- **P6** — `destroy()` limpia rAF y listeners; cachés en el closure.

## Matriz

| Juego     | P1  | P2  | P3  | P4  | P5  | P6  | Fecha      | Notas                                                                                                                                         |
| --------- | --- | --- | --- | --- | --- | --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| asteroids | ✅  | 🛠  | n/a | ✅  | ✅  | ✅  | 2026-10-14 | Sprites offscreen (WeakMap por asteroide, llama/pulso cuantizados) + HUD cacheado; vector directo si glow = 0; fondo = 1 fillRect             |
| tetris    | ✅  | n/a | n/a | 🛠  | ✅  | ✅  | 2026-10-14 | Sin skins ni glow. Fondo, rejilla, etiquetas, marco NEXT y controles en canvas offscreen (88 → 28 llamadas/frame). Blur de game over exento   |
| arkanoid  | ✅  | 🛠  | 🛠  | 🛠  | ✅  | ✅  | 2026-10-14 | Sprites offscreen pre-tintados + glow (paleta/bola/vidas/bloques/explosiones), HUD cacheado, scanlines retro offscreen. classic sigue sin filtro |
| snake     | ✅  | 🛠  | 🛠  | 🛠  | ✅  | ✅  | 2026-10-14 | Segmentos + HUD (barra+texto) cacheados con PAD; fruta pre-tintada por skin (con fracción subpíxel); tablero offscreen. 155 → 8 llamadas/frame |
| frogger   | ✅  | ✅  | n/a | ✅  | ✅  | ✅  | 2026-10-13 | Referencia: SPEC 10                                                                                                                           |

## Métricas (antes → después, Playwright 50 Hz)

> Revisión 2026-10-14 hecha con 4 instancias en paralelo: FPS y frames > 30 ms de "antes" con ruido; los conteos de llamadas son la métrica válida.

### asteroids (2026-10-14)

5 s, un Space al inicio.

| Skin    | Llamadas/frame | Glow/frame    | Filtro/frame | Notif. 5 s | Frames > 30 ms |
| ------- | -------------- | ------------- | ------------ | ---------- | -------------- |
| classic | 14 → 11        | 0 → 0         | 0 → 0        | 1 → 0      | 22 → 0         |
| neon    | 11 → 15        | 10,06 → **0** | 0 → 0        | 0 → 2      | 47 → 5         |
| retro   | 14 → 11        | 0 → 0         | 0 → 0        | 1 → 0      | 5 → 0          |

- Notificaciones por impactos/choques reales (score/vidas), no por tiempo.
- Neon con empuje + giro + disparo (172 frames): 0 llamadas con glow.
- Decisiones a revisar: sprite solo si `glow > 0` (classic/retro siguen vectoriales, píxeles idénticos); llama cuantizada a 0,5 px y pulso power-up a 0,25 px.
- Observación previa (no corregida, cambio visual): el texto "3x" deja `textBaseline = "middle"` y el HUD sube unos px tras el primer power-up.

### tetris (2026-10-14)

Sin skins: solo `classic`. Ventana de 5 s sin entrada.

| Skin    | Llamadas/frame | Glow/frame | Filtro/frame | Notif. 5 s | Frames > 30 ms | p95 (ms)    |
| ------- | -------------- | ---------- | ------------ | ---------- | -------------- | ----------- |
| classic | 88 → 28        | 0 → 0      | 0 → 0        | 0 → 0      | 7 → 0          | 20,6 → 20,2 |

### arkanoid (2026-10-14)

| Skin    | Llamadas/frame | Glow/frame | Filtro/frame | Notif. 5 s (sin entrada) | Frames > 30 ms (5 s) | p95 (ms)    |
| ------- | -------------- | ---------- | ------------ | ------------------------ | -------------------- | ----------- |
| classic | 65 → 64        | 0 → 0      | 0 → 0        | 6 → 5                    | 10 → 3               | 23,1 → 20,3 |
| neon    | 65 → 64        | 4,03 → 0   | 62,41 → 0    | 6 → 6                    | 104 → 7              | 60,1 → 20,5 |
| retro   | 216 → 65       | 0 → 0      | 61,82 → 0    | 6 → 6                    | 90 → 12              | 40,2 → 39,7 |

- Notificaciones legítimas (la bola rompe bloques / pierde vidas sin entrada).
- Observación: los 60 bloques siguen costando ~60 `drawImage`/frame (posible capa cacheada que se repinte al romper un bloque).

### snake (2026-10-14)

1 s sin entrada + 5 s girando en cuadrado, 1280×800.

| Skin    | Llamadas/frame | Glow/frame | Filtro/frame | Notif. sin entrada (1 s) | Frames > 30 ms (5 s) |
| ------- | -------------- | ---------- | ------------ | ------------------------ | -------------------- |
| classic | 155 → 8        | 0 → 0      | 0 → 0        | 0 → 0                    | 0 → 1                |
| neon    | 155 → 8        | 6,1 → 0    | 1,0 → 0      | 0 → 0                    | 26 → 0               |
| retro   | 162 → 8        | 0 → 0      | 1,07 → 0     | 0 → 0                    | 35 → 0               |

## Registro

- 2026-10-14 — asteroids — P2 corregido (glow neon 10,06 → 0 por frame vía sprites offscreen + HUD cacheado); P1/P4/P5/P6 ya cumplían; P3 n/a.
- 2026-10-14 — tetris — P4 corregido (fondo estático offscreen, 88 → 28 llamadas/frame). P1/P5/P6 ya cumplían; P2/P3 n/a (sin glow ni skins; blur solo en game over, exento).
- 2026-10-14 — arkanoid — P2/P3/P4 corregidos (glow 4,03 → 0 y filtro ~62 → 0 por frame en neon/retro; retro 216 → 65 llamadas/frame); P1/P5/P6 ya cumplían. Mismo aspecto.
- 2026-10-14 — snake — P2/P3/P4 corregidos (sprites de segmentos y HUD con glow, fruta pre-tintada, tablero offscreen); P1/P5/P6 ya cumplían. 155 → 8 llamadas/frame, 0 glow/filtro por frame en los 3 skins.
