-- =============================================================
-- Migration: Match, Game & Rally Complete BWF Data Model
-- =============================================================

-- 1. Matches Extension (Live serving & status tracking)
alter table public.matches add column if not exists current_server_id uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists current_serving_side text check (current_serving_side in ('right', 'left'));
alter table public.matches add column if not exists current_game_no int not null default 1;

-- 2. Tournament Games Extension (Per-game tracking)
alter table public.tournament_games add column if not exists status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed'));
alter table public.tournament_games add column if not exists started_at timestamptz;
alter table public.tournament_games add column if not exists completed_at timestamptz;

-- 3. Tournament Score Events / Rallies Extension (Point-by-point tracking)
alter table public.tournament_score_events add column if not exists rally_number int;
alter table public.tournament_score_events add column if not exists serving_side text check (serving_side in ('right', 'left'));
alter table public.tournament_score_events add column if not exists receiver_player_id uuid references public.profiles(id) on delete set null;

-- Populate rally_number with seq where missing
update public.tournament_score_events set rally_number = seq where rally_number is null;

-- 4. Create View for Rallies (Matching exact user naming)
create or replace view public.rallies as
select
  id,
  game_id,
  coalesce(rally_number, seq) as rally_number,
  scoring_team,
  team1_score as score_a,
  team2_score as score_b,
  serving_team,
  server_player_id as server_id,
  serving_side,
  receiver_player_id as receiver_id,
  positions,
  created_at
from public.tournament_score_events;
