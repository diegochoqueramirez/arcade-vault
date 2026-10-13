# Sugerencias de juegos — game-planner

> Mantenido por el agente `game-planner` (`.claude/agents/game-planner.md`). Estados: pendiente · aceptado · descartado · implementado.

## Pendientes

- [ ] `neon-racer` — NEON RACER (ARCADE) · 29/30 · 2026-10-13 · Carreras top-down sin fin esquivando tráfico; score = distancia + adelantamientos, velocidad creciente; primer juego de carreras; arte procedural y generación justa del tráfico como riesgos.
- [ ] `stacker` — STACKER (ARCADE) · 29/30 · 2026-10-13 · Timing de un botón: apilar bloques que oscilan, recorte del sobrante, combos por precisión; motor trivial; riesgo: poca profundidad y percepción de parecido con tetris.
- [ ] `neon-arena` — NEON ARENA (SHOOTER) · 28/30 · 2026-10-13 · Twin-stick por teclado (WASD mover, flechas disparar) en arena con oleadas; reusa estilo vectorial/partículas de asteroids. Riesgo: ghosting de teclado, balance de spawns.
- [ ] `invaders` — INVADERS (SHOOTER) · 27/30 · 2026-10-13 · Shooter de oleadas clásico, score natural por alien/oleada, motor original simple (formas pixel en canvas). Recomendado.
- [ ] `hopper` — HOPPER (ARCADE) · 27/30 · 2026-10-13 · Cruzar carretera y río (estilo Frogger, nombre genérico); rejilla simple, score por fila más alta + metas + bonus tiempo. Riesgo: farmeo, arte procedural.
- [ ] `chain-drop` — CHAIN DROP (PUZZLE) · 27/30 · 2026-10-13 · Burbujas en pares estilo Puyo (genérico), score por cadenas × multiplicador; reusa lógica de rejilla/gravedad de tetris. Riesgo: solape con tetris, cascadas.
- [ ] `missile-guard` — MISSILE GUARD (SHOOTER) · 27/30 · 2026-10-13 · Defensa de misiles con mira por flechas + Espacio; score por misiles + bonus ciudades/munición por oleada; mecánica defensiva distinta. Riesgo: precisión de la mira con teclado.
- [ ] `paddle-duel` — PADDLE DUEL (VERSUS) · 26/30 · 2026-10-13 · Pong vs CPU, estrena categoría VERSUS; score = puntos hasta perder (CPU acelera). Duda: rejugabilidad competitiva.
- [ ] `neon-cycles` — NEON CYCLES (VERSUS) · 26/30 · 2026-10-13 · Motos de luz vs CPU en rondas crecientes; motor simple tipo Snake. Compite con paddle-duel por estrenar VERSUS; IA y bonus por celdas a afinar.
- [ ] `tank-duel` — TANK DUEL (VERSUS) · 26/30 · 2026-10-13 · Duelo de tanques vs CPU en arenas con muros, balas con rebote, CPU más dura por ronda. Riesgo: IA de navegación/apuntado.
- [ ] `maze-chase` — MAZE CHASE (ARCADE) · 26/30 · 2026-10-13 · Laberinto + fantasmas (estilo Pac-Man, genérico); IA de fantasmas es lo más costoso; 3er ARCADE.
- [ ] `moon-lander` — MOON LANDER (ARCADE) · 26/30 · 2026-10-13 · Aterrizaje lunar con gravedad/empuje/combustible, terreno procedural con multiplicadores; motor vectorial simple (reutiliza patrón asteroids). Riesgo: tuning física y fórmula de score.
- [ ] `tower-climb` — TOWER CLIMB (ARCADE) · 26/30 · 2026-10-13 · Plataformas verticales infinitas (estilo Icy Tower, genérico), scroll creciente, score por altura + combos; estrena plataformas. Riesgo: generación procedural justa, sprite propio.
- [ ] `neon-echo` — NEON ECHO (PUZZLE) · 26/30 · 2026-10-13 · Simon de memoria con 4 pads neón por flechas; motor trivial, mecánica nueva (memoria). Riesgo: empates/poca profundidad, mitigar con bonus velocidad.
- [ ] `2048` — 2048 (PUZZLE) · 25/30 · 2026-10-13 · Puzzle por flechas, motor trivial, score acumulado; estética menos arcade.
- [ ] `neon-puck` — NEON PUCK (VERSUS) · 25/30 · 2026-10-13 · Hockey de aire vs CPU, mazo 2D por teclado, colisiones círculo-círculo; reutiliza ball-bounce.mp3. Riesgo: solapa con paddle-duel.
- [ ] `blob-volley` — BLOB VOLLEY (VERSUS) · 25/30 · 2026-10-13 · Voleibol 1v1 vs CPU con salto/gravedad y red; ligas crecientes, score por puntos × ronda. Riesgo: tuning física/IA.
- [ ] `deep-driller` — DEEP DRILLER (ARCADE) · 25/30 · 2026-10-13 · Excavar en vertical con aire limitado y bloques que caen; score por profundidad + cápsulas; mecánica nueva; riesgo: física de caída de bloques y farmeo de cápsulas.
- [ ] `sky-raider` — SKY RAIDER (SHOOTER) · 24/30 · 2026-10-13 · Shmup vertical con scroll, patrones de enemigos y power-ups; motor original más costoso, se solapa con invaders.
- [ ] `girder-climb` — GIRDER CLIMB (ARCADE) · 22/30 · 2026-10-13 · Vigas+escaleras+barriles (estilo Donkey Kong, genérico); motor complejo (rampas, escaleras, niveles), rejugabilidad limitada por niveles fijos.
- [ ] `crate-push` — CRATE PUSH (PUZZLE) · 22/30 · 2026-10-13 · Sokoban (genérico) por niveles, score = base + bonus movimientos/tiempo; coste en diseño de niveles. Riesgo: score con techo, soluciones memorizables.
- [ ] `barrage` — BARRAGE (SHOOTER) · 22/30 · 2026-10-13 · Artillería por turnos (ángulo/potencia/viento) vs búnkeres en terreno deformable; mecánica única pero ritmo lento, física/terreno costosos.
- [ ] `gem-rush` — GEM RUSH (PUZZLE) · 21/30 · 2026-10-13 · Match-3 contrarreloj por teclado (cursor + Espacio), score por combos; controles y suerte del reparto como riesgos.

## Aceptados (en spec/impl)

## Descartados

## Implementados

- [x] `asteroids` — ASTEROIDS (SHOOTER) · SPEC 05
- [x] `tetris` — TETRIS (PUZZLE) · SPEC 07
- [x] `arkanoid` — ARKANOID (ARCADE) · SPEC 08
- [x] `snake` — SNAKE (ARCADE) · SPEC 09
