-- Fitness membership hardening: tenant-scoped, collision-free member numbers.
create table if not exists public.member_number_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  last_number bigint not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.member_number_counters enable row level security;
revoke all on public.member_number_counters from anon, authenticated;

create or replace function public.next_member_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number bigint;
  v_code text;
begin
  if p_tenant_id is null then
    raise exception 'TENANT_REQUIRED';
  end if;

  insert into public.member_number_counters (tenant_id, last_number)
  values (
    p_tenant_id,
    coalesce((
      select max(substring(m.member_number from '[0-9]+')::bigint)
      from public.members m
      where m.tenant_id = p_tenant_id
        and m.member_number ~ '^M-[0-9]+$'
    ), 0) + 1
  )
  on conflict (tenant_id) do update
    set last_number = public.member_number_counters.last_number + 1,
        updated_at = now()
  returning last_number into v_number;

  v_code := 'M-' || lpad(v_number::text, 7, '0');
  return v_code;
end;
$$;

revoke all on function public.next_member_number(uuid) from public, anon, authenticated;
grant execute on function public.next_member_number(uuid) to service_role;

comment on function public.next_member_number(uuid) is
  'Returns an atomic, tenant-scoped fitness member number such as M-0000001.';
