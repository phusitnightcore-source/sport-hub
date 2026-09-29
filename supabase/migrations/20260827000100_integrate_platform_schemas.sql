-- =============================================================
-- Integrate Platform Schemas: Connect Tournament, Badminton, Profiles & Courts
-- =============================================================

-- 1. Ensure profiles table has all integrated social & gaming fields
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists skill_level text check (skill_level in ('Beginner', 'Intermediate', 'Advanced', 'N', 'S', 'P-', 'P', 'C', 'B'));
alter table public.profiles add column if not exists mmr int not null default 1000;

-- Backfill display_name if missing
update public.profiles
set display_name = coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'User')
where display_name is null;

-- 2. Ensure courts has indoor/outdoor flag
alter table public.courts add column if not exists is_indoor boolean not null default true;

-- 3. Ensure reviews has coach_id and coach_profile_id connected
alter table public.reviews add column if not exists coach_id uuid references public.profiles(id) on delete set null;

-- 4. Foreign key relationships and indexes for tournament connections
-- Ensure tournaments has branch and organizer connection
alter table public.tournaments add column if not exists organizer_id uuid references public.profiles(id) on delete set null;

-- Ensure matches has court connection and umpire connection
alter table public.matches add column if not exists court_id uuid references public.courts(id) on delete set null;
alter table public.matches add column if not exists umpire_id uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists event_id uuid references public.tournament_events(id) on delete cascade;

-- Ensure teams has event connection
alter table public.teams add column if not exists event_id uuid references public.tournament_events(id) on delete cascade;

-- Ensure games has winner connection
alter table public.tournament_games add column if not exists winner_id uuid references public.teams(id) on delete set null;

-- Ensure Elo ratings exist and connect to profiles
create table if not exists public.elo_ratings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  sport text not null default 'badminton',
  rating int not null default 1200,
  wins int not null default 0,
  losses int not null default 0,
  games_played int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_elo_ratings_profile on public.elo_ratings(profile_id, sport);
create index if not exists idx_elo_ratings_ranking on public.elo_ratings(sport, rating desc);
