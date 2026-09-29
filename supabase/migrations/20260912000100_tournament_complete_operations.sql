-- Tournament operations: one event is bound to one public category.  This
-- keeps singles, doubles and skill divisions from ever sharing a bracket.
alter table public.tournament_events
  add column if not exists category_id uuid references public.tournament_categories(id) on delete cascade;

create unique index if not exists idx_tournament_events_category_unique
  on public.tournament_events (tournament_id, category_id)
  where category_id is not null;

alter table public.matches
  add column if not exists duration_seconds integer check (duration_seconds >= 0),
  add column if not exists result_recorded_by uuid references public.profiles(id) on delete set null,
  add column if not exists result_recorded_at timestamptz;

alter table public.tournament_registrations
  add column if not exists payment_notes text,
  add column if not exists payment_verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists payment_verified_at timestamptz;

create index if not exists idx_matches_event on public.matches (event_id, round, match_number);
create index if not exists idx_teams_event on public.teams (event_id, seed);

-- Ensure a registration is internally consistent even when it is created by
-- a staff workflow rather than the public registration form.
create or replace function public.validate_tournament_registration_team()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team_record record;
begin
  if new.team_id is null then
    return new;
  end if;

  select tournament_id, category_id into team_record from public.teams where id = new.team_id;
  if not found or team_record.tournament_id <> new.tournament_id then
    raise exception 'Registration team does not belong to this tournament';
  end if;
  if new.category_id is distinct from team_record.category_id then
    raise exception 'Registration category does not match team category';
  end if;
  return new;
end $$;

drop trigger if exists before_tournament_registration_team on public.tournament_registrations;
create trigger before_tournament_registration_team
  before insert or update of team_id, category_id, tournament_id on public.tournament_registrations
  for each row execute function public.validate_tournament_registration_team();
