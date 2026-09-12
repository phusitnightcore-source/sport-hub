-- =============================================================
-- Badminton Tournament Manager — Supabase Schema
-- วิธีใช้: วางทั้งไฟล์นี้ใน Supabase Dashboard > SQL Editor > Run
-- (รันซ้ำได้ ปลอดภัยระดับหนึ่งเพราะใช้ if not exists / or replace)
-- =============================================================

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum ('admin', 'umpire', 'player');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('MS', 'WS', 'MD', 'WD', 'XD');
  -- MS=ชายเดี่ยว WS=หญิงเดี่ยว MD=ชายคู่ WD=หญิงคู่ XD=คู่ผสม
exception when duplicate_object then null; end $$;

do $$ begin
  create type draw_format as enum ('single_elim', 'round_robin', 'group_knockout');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tournament_status as enum ('draft', 'upcoming', 'ongoing', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('setup', 'draw_done', 'ongoing', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('pending', 'scheduled', 'live', 'finished', 'walkover', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_stage as enum ('group', 'knockout');
exception when duplicate_object then null; end $$;

-- ---------- TABLES ----------

-- โปรไฟล์ผู้ใช้ (ผูก 1:1 กับ auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'player',
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ระดับมือ (admin กำหนดเอง เช่น N, S, P-, P, C, B)
create table if not exists public.skill_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- เช่น 'S'
  name text not null,                 -- เช่น 'มือ S'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- นักแข่ง (user_id เป็น null ได้ = admin สร้างให้ก่อน ยังไม่ผูกบัญชี)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  nickname text,
  gender text check (gender in ('M', 'F')),
  skill_level_id uuid references public.skill_levels(id) on delete set null,
  club text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  start_date date,
  end_date date,
  status tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Event = ประเภท × ระดับมือ ภายในทัวร์นาเมนต์
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,                          -- เช่น 'ชายคู่ มือ S'
  event_type event_type not null,
  skill_level_id uuid references public.skill_levels(id) on delete set null,
  format draw_format not null default 'single_elim',
  status event_status not null default 'setup',
  best_of int not null default 3,              -- ชนะ 2 ใน 3
  points_per_game int not null default 21,
  max_points int not null default 30,          -- ตัน 30
  created_at timestamptz not null default now()
);

-- กลุ่ม (ใช้เมื่อ format = round_robin / group_knockout)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,                          -- 'กลุ่ม A'
  sort_order int not null default 0
);

-- ทีมที่ลงแข่งใน event (เดี่ยว = player2 เป็น null)
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player1_id uuid not null references public.players(id) on delete cascade,
  player2_id uuid references public.players(id) on delete cascade,
  seed int,                                    -- null = ไม่วางมือ
  group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now(),
  check (player2_id is null or player1_id <> player2_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage match_stage not null default 'knockout',
  group_id uuid references public.groups(id) on delete set null,
  round int not null default 1,                -- knockout: 1=รอบแรก เพิ่มขึ้นเรื่อยๆ
  bracket_pos int not null default 0,          -- ตำแหน่งในรอบ (0,1,2,...)
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  winner_id uuid references public.teams(id) on delete set null,
  status match_status not null default 'pending',
  court_no int,
  scheduled_at timestamptz,
  umpire_id uuid references public.profiles(id) on delete set null,  -- กรรมการ
  next_match_id uuid references public.matches(id) on delete set null,
  next_match_slot int check (next_match_slot in (1, 2)),  -- ผู้ชนะไปเป็น team1 หรือ team2
  started_at timestamptz,
  finished_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_event on public.matches(event_id, round, bracket_pos);
create index if not exists idx_matches_umpire on public.matches(umpire_id, status);
create index if not exists idx_matches_status on public.matches(status);

-- เกมที่ 1-3 ของแมตช์
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  game_no int not null check (game_no between 1 and 5),
  team1_score int not null default 0,
  team2_score int not null default 0,
  winner_id uuid references public.teams(id) on delete set null,
  finished boolean not null default false,
  unique (match_id, game_no)
);

-- log ทุกแต้ม = source of truth สำหรับ Undo และ replay
create table if not exists public.score_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  seq int not null,                             -- ลำดับแต้มในเกม เริ่ม 1
  scoring_team int not null check (scoring_team in (1, 2)),
  team1_score int not null,                     -- คะแนนหลังได้แต้มนี้
  team2_score int not null,
  serving_team int not null check (serving_team in (1, 2)),   -- ฝั่งเสิร์ฟ "แรลลี่ถัดไป"
  server_player_id uuid references public.players(id),
  positions jsonb,                              -- snapshot ตำแหน่งผู้เล่น 4 คน (ประเภทคู่)
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (game_id, seq)
);

-- ---------- FUNCTIONS & TRIGGERS ----------

-- สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper เช็ค role (security definer เพื่อเลี่ยง recursive RLS)
create or replace function public.get_my_role()
returns user_role language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.get_my_role() = 'admin', false);
$$;

-- กรรมการของแมตช์ที่ยังไม่จบ (ใช้ใน RLS ของ games/score_events)
create or replace function public.is_match_umpire(p_match_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and m.umpire_id = auth.uid()
      and m.status in ('scheduled', 'live')
  );
$$;

-- ขยับผู้ชนะเข้าสายรอบถัดไปอัตโนมัติเมื่อแมตช์จบ
create or replace function public.advance_winner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.winner_id is not null
     and new.status in ('finished', 'walkover', 'retired')
     and new.next_match_id is not null then
    if new.next_match_slot = 1 then
      update public.matches set team1_id = new.winner_id where id = new.next_match_id;
    elsif new.next_match_slot = 2 then
      update public.matches set team2_id = new.winner_id where id = new.next_match_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists on_match_finished on public.matches;
create trigger on_match_finished
  after update of winner_id, status on public.matches
  for each row execute function public.advance_winner();

-- updated_at อัตโนมัติ
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_players_touch on public.players;
create trigger trg_players_touch before update on public.players
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_tournaments_touch on public.tournaments;
create trigger trg_tournaments_touch before update on public.tournaments
  for each row execute function public.touch_updated_at();

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.skill_levels enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.events enable row level security;
alter table public.groups enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.games enable row level security;
alter table public.score_events enable row level security;

-- profiles
drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));
  -- user ธรรมดาแก้ role ตัวเองไม่ได้ (role ต้องเท่าเดิม)
drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ตารางสาธารณะ: ใครก็อ่านได้ / เขียนเฉพาะ admin
-- skill_levels
drop policy if exists "skill_levels public read" on public.skill_levels;
create policy "skill_levels public read" on public.skill_levels for select using (true);
drop policy if exists "skill_levels admin write" on public.skill_levels;
create policy "skill_levels admin write" on public.skill_levels
  for all using (public.is_admin()) with check (public.is_admin());

-- players (หน้าสาธารณะต้องเห็นชื่อในสาย)
drop policy if exists "players public read" on public.players;
create policy "players public read" on public.players for select using (true);
drop policy if exists "players admin write" on public.players;
create policy "players admin write" on public.players
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "players update own basic" on public.players;
create policy "players update own basic" on public.players
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- กันนักแข่งแก้ระดับมือตัวเอง
    and skill_level_id is not distinct from (select p.skill_level_id from public.players p where p.id = players.id)
  );

-- tournaments / events / groups / teams
drop policy if exists "tournaments public read" on public.tournaments;
create policy "tournaments public read" on public.tournaments
  for select using (status <> 'draft' or public.is_admin());
drop policy if exists "tournaments admin write" on public.tournaments;
create policy "tournaments admin write" on public.tournaments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events for select using (true);
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "groups public read" on public.groups;
create policy "groups public read" on public.groups for select using (true);
drop policy if exists "groups admin write" on public.groups;
create policy "groups admin write" on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "teams public read" on public.teams;
create policy "teams public read" on public.teams for select using (true);
drop policy if exists "teams admin write" on public.teams;
create policy "teams admin write" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

-- matches: อ่านสาธารณะ / admin เขียนได้หมด / กรรมการอัปเดตได้เฉพาะแมตช์ตัวเอง
drop policy if exists "matches public read" on public.matches;
create policy "matches public read" on public.matches for select using (true);
drop policy if exists "matches admin write" on public.matches;
create policy "matches admin write" on public.matches
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "matches umpire update own" on public.matches;
create policy "matches umpire update own" on public.matches
  for update using (umpire_id = auth.uid())
  with check (umpire_id = auth.uid());

-- games
drop policy if exists "games public read" on public.games;
create policy "games public read" on public.games for select using (true);
drop policy if exists "games admin write" on public.games;
create policy "games admin write" on public.games
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "games umpire write" on public.games;
create policy "games umpire write" on public.games
  for insert with check (public.is_match_umpire(match_id));
drop policy if exists "games umpire update" on public.games;
create policy "games umpire update" on public.games
  for update using (public.is_match_umpire(match_id))
  with check (public.is_match_umpire(match_id));

-- score_events
drop policy if exists "score_events public read" on public.score_events;
create policy "score_events public read" on public.score_events for select using (true);
drop policy if exists "score_events admin write" on public.score_events;
create policy "score_events admin write" on public.score_events
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "score_events umpire insert" on public.score_events;
create policy "score_events umpire insert" on public.score_events
  for insert with check (
    exists (select 1 from public.games g
            where g.id = game_id and public.is_match_umpire(g.match_id))
  );
drop policy if exists "score_events umpire delete" on public.score_events;
create policy "score_events umpire delete" on public.score_events
  for delete using (
    exists (select 1 from public.games g
            where g.id = game_id and public.is_match_umpire(g.match_id))
  );  -- ใช้สำหรับ Undo (ลบ event ล่าสุด)

-- ---------- REALTIME ----------
-- เปิด realtime ให้ตารางที่หน้าสาธารณะต้อง subscribe
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.games;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.score_events;
exception when duplicate_object then null; end $$;

-- ---------- SEED เริ่มต้น ----------
insert into public.skill_levels (code, name, sort_order) values
  ('N',  'มือใหม่ (N)', 1),
  ('S',  'มือ S', 2),
  ('P-', 'มือ P-', 3),
  ('P',  'มือ P', 4),
  ('C',  'มือ C', 5),
  ('B',  'มือ B', 6)
on conflict (code) do nothing;

-- =============================================================
-- หลังรันไฟล์นี้:
-- 1) สมัคร user แรกผ่านหน้าเว็บ/ Auth แล้วรันคำสั่งนี้เพื่อตั้ง admin คนแรก:
--    update public.profiles set role = 'admin' where id = '<USER_UUID>';
-- 2) ปิด email confirmation ใน Auth settings ถ้าต้องการทดสอบเร็ว
-- =============================================================
