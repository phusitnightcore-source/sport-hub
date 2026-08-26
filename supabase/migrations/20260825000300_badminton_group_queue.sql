-- ============================================================================
-- SportHub — Badminton Group Queue & Matchmaking System for Facility Owners
-- Multi-tenant, integrated with tenants, branches, courts and profiles
-- ============================================================================

-- 1. GROUP SESSIONS (รอบก๊วนของสนาม)
create table if not exists group_sessions (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  branch_id           uuid references branches(id) on delete set null,
  title               text not null,
  session_date        date not null default current_date,
  start_time          time not null default '18:00',
  end_time            time not null default '21:00',
  shuttlecock_brand   text not null default 'RSL Classic',
  shuttlecock_price   numeric(10,2) not null default 35.00,
  entry_fee           numeric(10,2) not null default 0.00,
  court_ids           uuid[] not null default '{}',
  court_names         text[] not null default '{}',
  status              text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_group_sessions_tenant on group_sessions (tenant_id, session_date);

-- 2. GROUP SESSION PLAYERS (รายชื่อผู้เล่นในรอบก๊วน)
create table if not exists group_session_players (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references group_sessions(id) on delete cascade,
  profile_id          uuid references profiles(id) on delete set null,
  player_name         text not null,
  player_phone        text,
  skill_level         text not null default 'N',
  mmr                 int not null default 1000,
  is_guest            boolean not null default false,
  is_checked_in       boolean not null default true,
  discount            numeric(10,2) not null default 0.00,
  additional_cost     numeric(10,2) not null default 0.00,
  payment_status      text not null default 'pending' check (payment_status in ('pending', 'paid')),
  payment_method      text check (payment_method in ('cash', 'transfer', 'other')),
  slip_image_url      text,
  games_played        int not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists idx_group_session_players_session on group_session_players (session_id);

-- 3. GROUP SESSION MATCHES (แมตช์การแข่งขันในรอบก๊วน)
create table if not exists group_session_matches (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references group_sessions(id) on delete cascade,
  court_name          text not null,
  court_id            uuid references courts(id) on delete set null,
  match_number        int not null default 1,
  status              text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'cancelled')),
  team_a_score        int default 0,
  team_b_score        int default 0,
  shuttlecock_count   int not null default 1,
  shuttlecock_numbers text[] not null default '{}',
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_group_session_matches_session on group_session_matches (session_id, match_number);

-- 4. GROUP SESSION MATCH PLAYERS (ผู้เล่นในแต่ละแมตช์)
create table if not exists group_session_match_players (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references group_session_matches(id) on delete cascade,
  session_player_id   uuid not null references group_session_players(id) on delete cascade,
  team                text not null check (team in ('A', 'B')),
  created_at          timestamptz not null default now()
);
create index if not exists idx_group_match_players_match on group_session_match_players (match_id);

-- 5. RLS Policies
alter table group_sessions enable row level security;
alter table group_session_players enable row level security;
alter table group_session_matches enable row level security;
alter table group_session_match_players enable row level security;

-- Public read for live board view
create policy group_sessions_public_read on group_sessions for select using (true);
create policy group_session_players_public_read on group_session_players for select using (true);
create policy group_session_matches_public_read on group_session_matches for select using (true);
create policy group_session_match_players_public_read on group_session_match_players for select using (true);

-- Facility staff manage
create policy group_sessions_staff_all on group_sessions for all using (true);
create policy group_session_players_staff_all on group_session_players for all using (true);
create policy group_session_matches_staff_all on group_session_matches for all using (true);
create policy group_session_match_players_staff_all on group_session_match_players for all using (true);
