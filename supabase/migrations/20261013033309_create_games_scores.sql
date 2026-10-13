-- SPEC 06: tablas games (solo lectura) y scores, vista game_stats.
-- Sin RLS: la protección son los grants explícitos al final.

create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  plays      text not null default '0',
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,12}$'),
  score       integer not null check (score between 0 and 9999999),
  user_id     uuid null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_ranking_idx on public.scores (game_id, score desc, created_at asc);

-- El proyecto activa RLS automáticamente en tablas nuevas (rls_auto_enable); este spec la deja desactivada.
alter table public.games disable row level security;
alter table public.scores disable row level security;

-- security_invoker: la vista aplica los permisos del rol que consulta, no los del dueño
create view public.game_stats with (security_invoker = true) as
  select g.*, coalesce(max(s.score), 0)::integer as best
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

revoke all on public.games, public.scores, public.game_stats from anon, authenticated;
grant select on public.games, public.scores, public.game_stats to anon, authenticated;
grant insert (game_id, player_name, score) on public.scores to anon, authenticated;
