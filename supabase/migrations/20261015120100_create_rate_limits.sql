-- SPEC 11: rate limit de ventana fija para saveScore (clave = 'score:' + sha256 de la IP).
-- Sin RLS (convención SPEC 06): la protección son los grants; solo service_role accede.

create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  count        integer not null
);

-- El proyecto activa RLS automáticamente en tablas nuevas (rls_auto_enable).
alter table public.rate_limits disable row level security;

revoke all on public.rate_limits from anon, authenticated;
grant select, insert, update on public.rate_limits to service_role;

-- true = permitido (cuenta el intento); false = límite superado. Atómico: un único upsert.
create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
set search_path = ''
as $$
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end,
    count = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end
  returning count <= p_limit;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
