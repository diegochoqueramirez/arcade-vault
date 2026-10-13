-- SPEC 09: fila de snake en games. scores empieza vacía.

insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'snake',
  'SNAKE',
  'Come frutas, crece y no choques con los muros ni contigo.',
  'Guía a la serpiente con las flechas o WASD por un tablero de 20×14. Cada fruta vale 10 puntos y te alarga un segmento. Cada 5 frutas subes de nivel y la serpiente acelera. Chocar con un muro o con tu propia cola termina la partida.',
  'ARCADE',
  'cover-snake',
  'green',
  '0'
);
