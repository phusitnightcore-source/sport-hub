-- ============================================================================
-- SportHub SOW v1.1 — Marketplace Expansion Migration
-- Adds: User Roles, Coach System, Reviews, Groups, Tournaments, Elo
-- Idempotent: safe to re-run
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
do $$ begin
  create type marketplace_role as enum ('player', 'coach', 'facility_owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coach_approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coach_booking_status as enum (
    'requested', 'accepted', 'rejected', 'confirmed',
    'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type group_status as enum ('open', 'full', 'booked', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tournament_status as enum (
    'draft', 'registration_open', 'registration_closed',
    'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type bracket_type as enum (
    'single_elimination', 'double_elimination', 'round_robin', 'group_knockout'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_entity_type as enum ('facility', 'coach');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. USER ROLES (Multi-role support per SOW §4)
-- A single user can hold multiple roles simultaneously
-- ============================================================================
create table if not exists user_roles (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        marketplace_role not null,
  is_active   boolean not null default true,
  granted_at  timestamptz not null default now(),
  unique (profile_id, role)
);
create index if not exists idx_user_roles_profile on user_roles (profile_id, is_active);

-- Every existing user gets 'player' role by default
insert into user_roles (profile_id, role)
select id, 'player'::marketplace_role from profiles
on conflict (profile_id, role) do nothing;

-- ============================================================================
-- 3. COACH SYSTEM (SOW §17-18)
-- ============================================================================

create table if not exists coach_profiles (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null unique references profiles(id) on delete cascade,
  display_name        text not null,
  sport               text not null,          -- e.g. 'แบดมินตัน', 'เทนนิส'
  skill_level         text,                   -- e.g. 'Advanced', 'Professional'
  experience_years    int,
  biography           text,
  cover_image_url     text,
  profile_image_url   text,
  location_province   text,
  latitude            double precision,
  longitude           double precision,
  payment_info        text,                   -- PromptPay/bank info for receiving payments
  approval_status     coach_approval_status not null default 'pending',
  approved_at         timestamptz,
  approved_by         uuid,                   -- super_admin profile_id
  rejection_reason    text,
  rating_avg          numeric(3,2) not null default 0,
  review_count        int not null default 0,
  is_visible          boolean not null default false, -- visible on marketplace only when approved
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_coach_profiles_sport on coach_profiles (sport, approval_status, is_visible);
create index if not exists idx_coach_profiles_location on coach_profiles (location_province, approval_status);

create table if not exists coach_certificates (
  id                uuid primary key default gen_random_uuid(),
  coach_profile_id  uuid not null references coach_profiles(id) on delete cascade,
  name              text not null,
  issuing_org       text,
  issued_date       date,
  image_url         text,
  created_at        timestamptz not null default now()
);

create table if not exists coach_media (
  id                uuid primary key default gen_random_uuid(),
  coach_profile_id  uuid not null references coach_profiles(id) on delete cascade,
  media_type        text not null check (media_type in ('image', 'video')),
  url               text not null,
  caption           text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists coach_services (
  id                uuid primary key default gen_random_uuid(),
  coach_profile_id  uuid not null references coach_profiles(id) on delete cascade,
  name              text not null,
  description       text,
  duration_minutes  int not null default 60,
  price             numeric(10,2) not null check (price >= 0),
  max_participants  int not null default 1,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists coach_schedules (
  id                uuid primary key default gen_random_uuid(),
  coach_profile_id  uuid not null references coach_profiles(id) on delete cascade,
  day_of_week       int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time        time not null,
  end_time          time not null,
  is_available      boolean not null default true,
  check (end_time > start_time)
);
create index if not exists idx_coach_schedules_profile on coach_schedules (coach_profile_id, day_of_week);

create table if not exists coach_bookings (
  id                uuid primary key default gen_random_uuid(),
  coach_profile_id  uuid not null references coach_profiles(id) on delete cascade,
  player_profile_id uuid not null references profiles(id) on delete cascade,
  service_id        uuid not null references coach_services(id) on delete cascade,
  booking_date      date not null,
  start_time        time not null,
  end_time          time not null,
  location_note     text,               -- where training will happen
  total_price       numeric(10,2) not null,
  status            coach_booking_status not null default 'requested',
  slip_image_url    text,
  player_note       text,
  coach_note        text,
  cancelled_at      timestamptz,
  cancel_reason     text,
  cancelled_by      text check (cancelled_by in ('player', 'coach')),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_coach_bookings_coach on coach_bookings (coach_profile_id, booking_date);
create index if not exists idx_coach_bookings_player on coach_bookings (player_profile_id, booking_date);

-- ============================================================================
-- 4. REVIEWS (SOW §24)
-- Unified review table for both facility and coach reviews
-- A review is tied to a specific booking to prevent fake reviews
-- ============================================================================

create table if not exists reviews (
  id                uuid primary key default gen_random_uuid(),
  reviewer_id       uuid not null references profiles(id) on delete cascade,
  entity_type       review_entity_type not null,
  -- facility review: references tenant_id (the facility)
  facility_id       uuid references tenants(id) on delete cascade,
  -- coach review: references coach_profile
  coach_profile_id  uuid references coach_profiles(id) on delete cascade,
  -- booking reference (to verify the reviewer actually used the service)
  booking_id        uuid,               -- references bookings or coach_bookings
  -- Ratings (1-5 scale)
  rating_overall    int not null check (rating_overall between 1 and 5),
  -- Facility-specific ratings (null for coach reviews)
  rating_cleanliness int check (rating_cleanliness between 1 and 5),
  rating_court       int check (rating_court between 1 and 5),
  rating_bathroom    int check (rating_bathroom between 1 and 5),
  rating_parking     int check (rating_parking between 1 and 5),
  rating_service     int check (rating_service between 1 and 5),
  -- Coach-specific ratings (null for facility reviews)
  rating_technique   int check (rating_technique between 1 and 5),
  rating_communication int check (rating_communication between 1 and 5),
  rating_punctuality int check (rating_punctuality between 1 and 5),
  rating_value       int check (rating_value between 1 and 5),
  -- Content
  comment           text,
  -- Moderation
  is_visible        boolean not null default true,
  reported_at       timestamptz,
  report_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Ensure entity reference is provided
  check (
    (entity_type = 'facility' and facility_id is not null) or
    (entity_type = 'coach' and coach_profile_id is not null)
  )
);
create index if not exists idx_reviews_facility on reviews (facility_id, is_visible, created_at desc)
  where entity_type = 'facility';
create index if not exists idx_reviews_coach on reviews (coach_profile_id, is_visible, created_at desc)
  where entity_type = 'coach';
create index if not exists idx_reviews_reviewer on reviews (reviewer_id);

-- ============================================================================
-- 5. GROUP & MATCHMAKING (SOW §19)
-- ============================================================================

create table if not exists groups (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references profiles(id) on delete cascade,
  sport             text not null,
  facility_id       uuid references tenants(id) on delete set null,
  branch_id         uuid references branches(id) on delete set null,
  title             text not null,
  description       text,
  play_date         date not null,
  start_time        time not null,
  end_time          time not null,
  max_players       int not null check (max_players >= 2),
  current_players   int not null default 1,
  skill_level       text,                   -- e.g. 'Beginner', 'Intermediate', 'Advanced'
  cost_per_person   numeric(10,2),
  booking_id        uuid references bookings(id) on delete set null, -- linked booking
  status            group_status not null default 'open',
  deadline          timestamptz,            -- deadline for joining
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_groups_status on groups (status, play_date);
create index if not exists idx_groups_sport on groups (sport, status, play_date);
create index if not exists idx_groups_creator on groups (creator_id);

create table if not exists group_members (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  is_creator  boolean not null default false,
  unique (group_id, profile_id)
);

-- ============================================================================
-- 6. TOURNAMENT SYSTEM (SOW §20-22)
-- ============================================================================

create table if not exists tournaments (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  branch_id             uuid references branches(id) on delete set null,
  organizer_id          uuid not null references profiles(id) on delete cascade,
  name                  text not null,
  sport                 text not null,
  description           text,
  banner_image_url      text,
  start_date            date not null,
  end_date              date,
  registration_deadline timestamptz,
  entry_fee             numeric(10,2) not null default 0,
  max_teams             int,
  rules                 text,
  prize_info            text,
  bracket_type          bracket_type not null default 'single_elimination',
  status                tournament_status not null default 'draft',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_tournaments_tenant on tournaments (tenant_id, status);
create index if not exists idx_tournaments_sport on tournaments (sport, status, start_date);

create table if not exists tournament_categories (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  name            text not null,    -- e.g. 'Men''s Singles', 'Women''s Doubles'
  max_teams       int,
  created_at      timestamptz not null default now()
);

create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  category_id   uuid references tournament_categories(id) on delete set null,
  name          text not null,
  seed          int,
  created_at    timestamptz not null default now()
);

create table if not exists team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  is_captain  boolean not null default false,
  unique (team_id, profile_id)
);

create table if not exists tournament_registrations (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  category_id     uuid references tournament_categories(id) on delete set null,
  team_id         uuid references teams(id) on delete cascade,
  player_id       uuid not null references profiles(id) on delete cascade,
  payment_status  text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  slip_image_url  text,
  registered_at   timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table if not exists matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  category_id     uuid references tournament_categories(id) on delete set null,
  round           int not null,           -- 1 = first round, etc.
  match_number    int not null,           -- position in bracket
  team_a_id       uuid references teams(id) on delete set null,
  team_b_id       uuid references teams(id) on delete set null,
  winner_id       uuid references teams(id) on delete set null,
  score_a         text,                   -- flexible scoring e.g. '21-15, 21-18'
  score_b         text,
  court_id        uuid references courts(id) on delete set null,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  duration_minutes int,
  status          match_status not null default 'scheduled',
  notes           text,
  next_match_id   uuid references matches(id) on delete set null,  -- winner advances here
  created_at      timestamptz not null default now()
);
create index if not exists idx_matches_tournament on matches (tournament_id, round, match_number);

-- ============================================================================
-- 7. ELO RATING (SOW §23)
-- ============================================================================

create table if not exists elo_ratings (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  sport       text not null,
  rating      int not null default 1200,
  games_played int not null default 0,
  wins        int not null default 0,
  losses      int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (profile_id, sport)
);
create index if not exists idx_elo_sport_rating on elo_ratings (sport, rating desc);

create table if not exists elo_history (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  sport           text not null,
  match_id        uuid references matches(id) on delete set null,
  tournament_id   uuid references tournaments(id) on delete set null,
  opponent_id     uuid references profiles(id) on delete set null,
  rating_before   int not null,
  rating_after    int not null,
  rating_change   int not null,
  result          text not null check (result in ('win', 'loss', 'draw')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_elo_history_profile on elo_history (profile_id, sport, created_at desc);

-- ============================================================================
-- 8. FACILITY EXTRA FIELDS (for marketplace display)
-- Add rating cache to tenants for fast sorting
-- ============================================================================
alter table tenants add column if not exists rating_avg numeric(3,2) not null default 0;
alter table tenants add column if not exists review_count int not null default 0;
alter table tenants add column if not exists sport_types text[] not null default '{}';

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================
-- updated_at triggers for new tables
do $$
declare t text;
begin
  foreach t in array array[
    'coach_profiles', 'coach_services', 'coach_bookings',
    'reviews', 'groups', 'tournaments'
  ] loop
    execute format('drop trigger if exists trg_%s_updated on %I', t, t);
    execute format('create trigger trg_%s_updated before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Update facility rating cache when reviews change
create or replace function update_facility_rating() returns trigger language plpgsql
security definer as $$
declare
  v_avg numeric(3,2);
  v_count int;
begin
  if new.entity_type = 'facility' then
    select coalesce(avg(rating_overall), 0), count(*)
      into v_avg, v_count
      from reviews
     where facility_id = new.facility_id
       and entity_type = 'facility'
       and is_visible = true;

    update tenants set rating_avg = v_avg, review_count = v_count
     where id = new.facility_id;
  end if;

  if new.entity_type = 'coach' then
    select coalesce(avg(rating_overall), 0), count(*)
      into v_avg, v_count
      from reviews
     where coach_profile_id = new.coach_profile_id
       and entity_type = 'coach'
       and is_visible = true;

    update coach_profiles set rating_avg = v_avg, review_count = v_count
     where id = new.coach_profile_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_review_rating on reviews;
create trigger trg_review_rating after insert or update on reviews
  for each row execute function update_facility_rating();

-- Update group current_players count when members join/leave
create or replace function update_group_count() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update groups set current_players = current_players + 1 where id = new.group_id;
    -- Auto-set to FULL if max reached
    update groups set status = 'full'
     where id = new.group_id
       and current_players >= max_players
       and status = 'open';
    return new;
  elsif TG_OP = 'DELETE' then
    update groups set current_players = greatest(current_players - 1, 0) where id = old.group_id;
    -- Reopen if was full
    update groups set status = 'open'
     where id = old.group_id
       and current_players < max_players
       and status = 'full';
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_group_member_count on group_members;
create trigger trg_group_member_count after insert or delete on group_members
  for each row execute function update_group_count();

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================
alter table user_roles                enable row level security;
alter table coach_profiles            enable row level security;
alter table coach_certificates        enable row level security;
alter table coach_media               enable row level security;
alter table coach_services            enable row level security;
alter table coach_schedules           enable row level security;
alter table coach_bookings            enable row level security;
alter table reviews                   enable row level security;
alter table groups                    enable row level security;
alter table group_members             enable row level security;
alter table tournaments               enable row level security;
alter table tournament_categories     enable row level security;
alter table teams                     enable row level security;
alter table team_members              enable row level security;
alter table tournament_registrations  enable row level security;
alter table matches                   enable row level security;
alter table elo_ratings               enable row level security;
alter table elo_history               enable row level security;

-- user_roles: self read + super_admin manage
drop policy if exists user_roles_self on user_roles;
create policy user_roles_self on user_roles for select
  using (profile_id = auth.uid());
drop policy if exists user_roles_admin on user_roles;
create policy user_roles_admin on user_roles for all
  using (is_super_admin());

-- coach_profiles: public read (approved) + self manage + super_admin manage
drop policy if exists coach_public_read on coach_profiles;
create policy coach_public_read on coach_profiles for select
  using (is_visible = true and approval_status = 'approved');
drop policy if exists coach_self on coach_profiles;
create policy coach_self on coach_profiles for all
  using (profile_id = auth.uid());
drop policy if exists coach_admin on coach_profiles;
create policy coach_admin on coach_profiles for all
  using (is_super_admin());

-- coach certs/media/services/schedules: public read for approved coaches + self manage
drop policy if exists coach_certs_read on coach_certificates;
create policy coach_certs_read on coach_certificates for select
  using (coach_profile_id in (select id from coach_profiles where is_visible = true));
drop policy if exists coach_certs_self on coach_certificates;
create policy coach_certs_self on coach_certificates for all
  using (coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));

drop policy if exists coach_media_read on coach_media;
create policy coach_media_read on coach_media for select
  using (coach_profile_id in (select id from coach_profiles where is_visible = true));
drop policy if exists coach_media_self on coach_media;
create policy coach_media_self on coach_media for all
  using (coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));

drop policy if exists coach_services_read on coach_services;
create policy coach_services_read on coach_services for select
  using (is_active = true or coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));
drop policy if exists coach_services_self on coach_services;
create policy coach_services_self on coach_services for all
  using (coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));

drop policy if exists coach_schedules_read on coach_schedules;
create policy coach_schedules_read on coach_schedules for select using (true);
drop policy if exists coach_schedules_self on coach_schedules;
create policy coach_schedules_self on coach_schedules for all
  using (coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));

-- coach_bookings: coach + player can see own bookings
drop policy if exists coach_bookings_coach on coach_bookings;
create policy coach_bookings_coach on coach_bookings for all
  using (coach_profile_id in (select id from coach_profiles where profile_id = auth.uid()));
drop policy if exists coach_bookings_player on coach_bookings;
create policy coach_bookings_player on coach_bookings for all
  using (player_profile_id = auth.uid());
drop policy if exists coach_bookings_admin on coach_bookings;
create policy coach_bookings_admin on coach_bookings for all
  using (is_super_admin());

-- reviews: public read (visible) + self manage own review + admin manage
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select
  using (is_visible = true);
drop policy if exists reviews_self on reviews;
create policy reviews_self on reviews for all
  using (reviewer_id = auth.uid());
drop policy if exists reviews_admin on reviews;
create policy reviews_admin on reviews for all
  using (is_super_admin());

-- groups: public read (open) + self manage + admin
drop policy if exists groups_public_read on groups;
create policy groups_public_read on groups for select
  using (status in ('open', 'full'));
drop policy if exists groups_self on groups;
create policy groups_self on groups for all
  using (creator_id = auth.uid());
drop policy if exists groups_member_read on groups;
create policy groups_member_read on groups for select
  using (id in (select group_id from group_members where profile_id = auth.uid()));

-- group_members: group creator + member self + admin
drop policy if exists group_members_read on group_members;
create policy group_members_read on group_members for select
  using (group_id in (select id from groups where status in ('open', 'full'))
         or profile_id = auth.uid()
         or group_id in (select id from groups where creator_id = auth.uid()));
drop policy if exists group_members_insert on group_members;
create policy group_members_insert on group_members for insert
  with check (profile_id = auth.uid());
drop policy if exists group_members_delete on group_members;
create policy group_members_delete on group_members for delete
  using (profile_id = auth.uid()
         or group_id in (select id from groups where creator_id = auth.uid()));

-- tournaments: public read + tenant admin manage
drop policy if exists tournaments_public_read on tournaments;
create policy tournaments_public_read on tournaments for select using (true);
drop policy if exists tournaments_admin on tournaments;
create policy tournaments_admin on tournaments for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists tournaments_organizer on tournaments;
create policy tournaments_organizer on tournaments for all
  using (organizer_id = auth.uid());

-- tournament_categories, teams, team_members, registrations, matches: public read
drop policy if exists tcats_public on tournament_categories;
create policy tcats_public on tournament_categories for select using (true);
drop policy if exists tcats_admin on tournament_categories;
create policy tcats_admin on tournament_categories for all
  using (tournament_id in (select id from tournaments where organizer_id = auth.uid())
         or is_super_admin());

drop policy if exists teams_public on teams;
create policy teams_public on teams for select using (true);
drop policy if exists teams_admin on teams;
create policy teams_admin on teams for all
  using (tournament_id in (select id from tournaments where organizer_id = auth.uid())
         or is_super_admin());

drop policy if exists team_members_public on team_members;
create policy team_members_public on team_members for select using (true);
drop policy if exists team_members_self on team_members;
create policy team_members_self on team_members for all
  using (profile_id = auth.uid()
         or team_id in (select t.id from teams t join tournaments tr on tr.id = t.tournament_id
                        where tr.organizer_id = auth.uid()));

drop policy if exists registrations_public on tournament_registrations;
create policy registrations_public on tournament_registrations for select using (true);
drop policy if exists registrations_self on tournament_registrations;
create policy registrations_self on tournament_registrations for all
  using (player_id = auth.uid());
drop policy if exists registrations_admin on tournament_registrations;
create policy registrations_admin on tournament_registrations for all
  using (tournament_id in (select id from tournaments where organizer_id = auth.uid())
         or is_super_admin());

drop policy if exists matches_public on matches;
create policy matches_public on matches for select using (true);
drop policy if exists matches_admin on matches;
create policy matches_admin on matches for all
  using (tournament_id in (select id from tournaments where organizer_id = auth.uid())
         or is_super_admin());

-- elo: public read + system manage (via service role)
drop policy if exists elo_public on elo_ratings;
create policy elo_public on elo_ratings for select using (true);
drop policy if exists elo_history_public on elo_history;
create policy elo_history_public on elo_history for select using (true);

-- ============================================================================
-- 11. STORAGE BUCKETS for new content
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('coach-media',    'coach-media',    true),
  ('coach-certs',    'coach-certs',    false),
  ('review-media',   'review-media',   true),
  ('tournament-media','tournament-media', true)
on conflict (id) do nothing;

-- ============================================================================
-- 12. REALTIME for new tables
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table coach_bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table groups;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table reviews;
exception when duplicate_object then null; end $$;
