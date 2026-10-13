-- SPEC 08: fila de arkanoid en games. scores empieza vacía.

insert into public.games (id, title, short, long, cat, cover, color, plays) values (
  'arkanoid',
  'ARKANOID',
  'Rebota la pelota y rompe los muros de bloques en 5 niveles.',
  'Mueve la paleta con el ratón o las flechas y rebota la pelota para destruir cada bloque. Cinco niveles con patrones distintos: parrilla completa, pirámide, ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota un 10 %. Tienes 3 vidas y cada bloque vale 10 puntos.',
  'ARCADE',
  'cover-bricks',
  'cyan',
  '0'
);
