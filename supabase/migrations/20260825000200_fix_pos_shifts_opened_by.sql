-- Sports Hub v1.1 - Fix pos_shifts opened_by nullable constraint
-- Allows venue_admin or staff without staff row to open/close shifts

alter table if exists pos_shifts alter column opened_by drop not null;

-- Ensure foreign key allows null with ON DELETE SET NULL
do $$ begin
  alter table pos_shifts drop constraint if exists pos_shifts_opened_by_fkey;
  alter table pos_shifts add constraint pos_shifts_opened_by_fkey 
    foreign key (opened_by) references staff(id) on delete set null;
exception when others then null; end $$;

-- Update open_pos_shift RPC
create or replace function open_pos_shift(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_staff_id uuid,
  p_starting_cash numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_shift_id uuid;
begin
  if exists (select 1 from pos_shifts where tenant_id = p_tenant_id and branch_id = p_branch_id and status = 'open') then
    raise exception 'มีกะที่เปิดอยู่แล้วในสาขานี้ กรุณาปิดกะเก่าก่อนเปิดกะใหม่';
  end if;

  insert into pos_shifts (
    tenant_id, branch_id, opened_by, starting_cash, status
  ) values (
    p_tenant_id, p_branch_id, p_staff_id, coalesce(p_starting_cash, 0), 'open'
  ) returning id into v_shift_id;

  return v_shift_id;
end $$;

-- Grant permissions to service_role
grant execute on function open_pos_shift(uuid, uuid, uuid, numeric) to service_role;
