-- Keep every bracket route explicit.  A winner and a losing semifinalist
-- must never be placed by whichever slot happens to be empty.
alter table public.matches
  add column if not exists loser_next_match_id uuid references public.matches(id) on delete set null,
  add column if not exists loser_next_match_slot int check (loser_next_match_slot in (1, 2));

create index if not exists idx_matches_loser_route on public.matches (loser_next_match_id);

-- The UI performs the same checks for a friendly message; this trigger is the
-- final guard against two people claiming the final slot at the same time.
create or replace function public.validate_tournament_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tournament_record record;
  registered_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.tournament_id::text));

  select status, max_teams, registration_deadline
    into tournament_record
    from public.tournaments
    where id = new.tournament_id
    for update;

  if not found or tournament_record.status <> 'registration_open' then
    raise exception 'Tournament registration is not open';
  end if;

  if tournament_record.registration_deadline is not null
     and tournament_record.registration_deadline < now() then
    raise exception 'Tournament registration deadline has passed';
  end if;

  if tournament_record.max_teams is not null then
    select count(*) into registered_count
      from public.tournament_registrations
      where tournament_id = new.tournament_id;
    if registered_count >= tournament_record.max_teams then
      raise exception 'Tournament is full';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists before_tournament_registration on public.tournament_registrations;
create trigger before_tournament_registration
  before insert on public.tournament_registrations
  for each row execute function public.validate_tournament_registration();

create or replace function public.advance_tournament_winner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.winner_id is null
     or new.status not in ('completed', 'finished', 'walkover', 'retired') then
    return new;
  end if;

  if new.next_match_id is not null then
    if new.next_match_slot = 2 then
      update public.matches set team_b_id = new.winner_id where id = new.next_match_id;
    else
      update public.matches set team_a_id = new.winner_id where id = new.next_match_id;
    end if;
  end if;

  if new.loser_next_match_id is not null then
    if new.loser_next_match_slot = 2 then
      update public.matches
        set team_b_id = case when new.winner_id = new.team_a_id then new.team_b_id else new.team_a_id end
        where id = new.loser_next_match_id;
    else
      update public.matches
        set team_a_id = case when new.winner_id = new.team_a_id then new.team_b_id else new.team_a_id end
        where id = new.loser_next_match_id;
    end if;
  end if;

  return new;
end $$;
