-- =============================================================
-- Migration: Tournament Full Lifecycle (BWF Standards & Verification)
-- =============================================================

-- 1. Tournaments Table Extensions
alter table public.tournaments add column if not exists require_video_proof boolean not null default false;
alter table public.tournaments add column if not exists skill_verification_mode text not null default 'skill_level' check (skill_verification_mode in ('open', 'skill_level', 'rating'));
alter table public.tournaments add column if not exists format text not null default 'knockout' check (format in ('knockout', 'round_robin', 'group_knockout', 'double_elimination'));
alter table public.tournaments add column if not exists has_third_place_match boolean not null default true;
alter table public.tournaments add column if not exists registration_deadline timestamptz;
alter table public.tournaments add column if not exists check_in_time text;
alter table public.tournaments add column if not exists start_time text;

-- 2. Tournament Registrations Extensions
alter table public.tournament_registrations add column if not exists video_url text;
alter table public.tournament_registrations add column if not exists verification_status text not null default 'auto_approved' check (verification_status in ('pending', 'approved', 'rejected', 'auto_approved'));
alter table public.tournament_registrations add column if not exists verification_notes text;
alter table public.tournament_registrations add column if not exists verified_by uuid references public.profiles(id) on delete set null;
alter table public.tournament_registrations add column if not exists verified_at timestamptz;
alter table public.tournament_registrations add column if not exists partner_id uuid references public.profiles(id) on delete set null;
alter table public.tournament_registrations add column if not exists partner_name text;
alter table public.tournament_registrations add column if not exists partner_video_url text;
alter table public.tournament_registrations add column if not exists rating_at_registration int;
alter table public.tournament_registrations add column if not exists checkin_status text not null default 'not_checked_in' check (checkin_status in ('not_checked_in', 'checked_in'));
alter table public.tournament_registrations add column if not exists checked_in_at timestamptz;

-- 3. Matches Table Extensions
alter table public.matches add column if not exists match_type text not null default 'knockout' check (match_type in ('group', 'knockout', 'third_place'));
alter table public.matches add column if not exists score_details jsonb;

-- Indexes for performance
create index if not exists idx_tournament_registrations_verification on public.tournament_registrations(tournament_id, verification_status);
create index if not exists idx_tournament_registrations_checkin on public.tournament_registrations(tournament_id, checkin_status);
create index if not exists idx_matches_type on public.matches(tournament_id, match_type);
