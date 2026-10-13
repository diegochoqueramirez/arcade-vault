-- SPEC 07: fila de tetris en games. scores empieza vacía.

insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'tetris',
  'TETRIS',
  'Encaja las piezas y limpia líneas antes de llegar al techo.',
  'El clásico de bloques en un tablero de 10×20 con las 7 piezas estándar. Rota con wall kicks, baja rápido o suelta en caída instantánea y guíate por la pieza fantasma y la vista previa. Cada 10 líneas sube el nivel y la caída se acelera.',
  'PUZZLE',
  'cover-tetro',
  'magenta',
  '0'
);
