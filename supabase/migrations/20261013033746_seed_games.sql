-- SPEC 06: única fila de games (asteroids, valores de SPEC 05). scores empieza vacía.

insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'asteroids',
  'ASTEROIDS',
  'Destruye asteroides en el espacio toroidal.',
  'Pilota una nave triangular en un campo de asteroides donde los bordes se conectan. Los grandes se parten en medianos y los medianos en pequeños. Tienes 3 vidas y un power-up de triple disparo que aparece al destruir rocas.',
  'SHOOTER',
  'cover-rocas',
  'cyan',
  '0'
);
