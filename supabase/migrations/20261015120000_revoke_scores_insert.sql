-- SPEC 11: scores solo se escribe desde el servidor (saveScore con la clave secreta / service_role).
-- anon y authenticated conservan select (leaderboards).
revoke insert on public.scores from anon, authenticated;
