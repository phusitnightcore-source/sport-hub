-- =============================================================
-- Badminton Tournament Manager Pro — Supabase Migration
-- Compatible with SportHub multi-tenant platform
-- =============================================================

-- 1. Skill Levels for tournaments
create table if not exists public.tournament_skill_levels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  code text not null,          -- e.g. 'N', 'S', 'P-', 'P', 'C', 'B'
  name text not null,          -- e.g. 'มือใหม่ N', 'มือ S'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Tournament Events (Categories like 'ชายคู่ มือ S', 'หญิงเดี่ยว มือ N')
create table if not exists public.tournament_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  event_type text not null default 'MD' check (event_type in ('MS', 'WS', 'MD', 'WD', 'XD')),
  skill_level_id uuid references public.tournament_skill_levels(id) on delete set null,
  format text not null default 'single_elim' check (format in ('single_elim', 'round_robin', 'group_knockout')),
  status text not null default 'setup' check (status in ('setup', 'draw_done', 'ongoing', 'finished')),
  best_of int not null default 3,
  points_per_game int not null default 21,
  max_points int not null default 30,
  created_at timestamptz not null default now()
);

-- 3. Groups (for round_robin / group_knockout)
create table if not exists public.tournament_event_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tournament_events(id) on delete cascade,
  name text not null,                          -- e.g. 'กลุ่ม A'
  sort_order int not null default 0
);

-- 4. Teams enhancement (link to event_id, player1, player2, group_id)
alter table public.teams add column if not exists event_id uuid references public.tournament_events(id) on delete cascade;
alter table public.teams add column if not exists player1_id uuid references public.profiles(id) on delete set null;
alter table public.teams add column if not exists player2_id uuid references public.profiles(id) on delete set null;
alter table public.teams add column if not exists group_id uuid references public.tournament_event_groups(id) on delete set null;

-- 5. Matches enhancement
alter table public.matches add column if not exists event_id uuid references public.tournament_events(id) on delete cascade;
alter table public.matches add column if not exists stage text not null default 'knockout' check (stage in ('group', 'knockout'));
alter table public.matches add column if not exists group_id uuid references public.tournament_event_groups(id) on delete set null;
alter table public.matches add column if not exists bracket_pos int not null default 0;
alter table public.matches add column if not exists court_no int;
alter table public.matches add column if not exists umpire_id uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists next_match_slot int check (next_match_slot in (1, 2));

-- 6. Tournament Games (Game 1, 2, 3 of a match)
create table if not exists public.tournament_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  game_no int not null check (game_no between 1 and 5),
  team1_score int not null default 0,
  team2_score int not null default 0,
  winner_id uuid references public.teams(id) on delete set null,
  finished boolean not null default false,
  unique (match_id, game_no)
);

-- 7. Score Events (Log of every point for live tracking and unlimited Undo)
create table if not exists public.tournament_score_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.tournament_games(id) on delete cascade,
  seq int not null,
  scoring_team int not null check (scoring_team in (1, 2)),
  team1_score int not null,
  team2_score int not null,
  serving_team int not null check (serving_team in (1, 2)),
  server_player_id uuid references public.profiles(id),
  positions jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (game_id, seq)
);

-- Indexes for performance
create index if not exists idx_tournament_events_tournament on public.tournament_events(tournament_id);
create index if not exists idx_tournament_games_match on public.tournament_games(match_id);
create index if not exists idx_tournament_score_events_game on public.tournament_score_events(game_id, seq);
create index if not exists idx_matches_umpire on public.matches(umpire_id, status);

-- 8. Advance winner trigger
create or replace function public.advance_tournament_winner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.winner_id is not null
     and new.status in ('completed', 'finished', 'walkover', 'retired')
     and new.next_match_id is not null then
    if new.next_match_slot = 1 or new.next_match_slot is null then
      update public.matches set team_a_id = new.winner_id where id = new.next_match_id;
    elsif new.next_match_slot = 2 then
      update public.matches set team_b_id = new.winner_id where id = new.next_match_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists on_tournament_match_finished on public.matches;
create trigger on_tournament_match_finished
  after update of winner_id, status on public.matches
  for each row execute function public.advance_tournament_winner();
