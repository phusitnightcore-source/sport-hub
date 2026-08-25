-- Sports Hub SOW v1.1 - POS Shifts Management

do $$ begin
  create type pos_shift_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists pos_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  opened_by uuid references staff(id) on delete set null,
  closed_by uuid references staff(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status pos_shift_status not null default 'open',
  starting_cash numeric(10,2) not null default 0 check (starting_cash >= 0),
  actual_closing_cash numeric(10,2) check (actual_closing_cash >= 0),
  expected_closing_cash numeric(10,2) check (expected_closing_cash >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table pos_shifts alter column opened_by drop not null;
create index if not exists idx_pos_shifts_tenant_branch on pos_shifts (tenant_id, branch_id);

create trigger set_pos_shifts_updated_at
  before update on pos_shifts for each row execute function set_updated_at();

-- Add shift_id to sales
alter table sales add column shift_id uuid references pos_shifts(id) on delete set null;
create index if not exists idx_sales_shift on sales (shift_id);

-- Create RPC for opening a shift
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
  -- Check if there's already an open shift for this branch
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

-- Create RPC for closing a shift
create or replace function close_pos_shift(
  p_tenant_id uuid,
  p_shift_id uuid,
  p_staff_id uuid,
  p_actual_cash numeric,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_expected_cash numeric(10,2);
  v_starting_cash numeric(10,2);
  v_cash_sales numeric(10,2);
begin
  -- Calculate expected cash (starting cash + all cash sales for this shift)
  select starting_cash into v_starting_cash
  from pos_shifts
  where id = p_shift_id and tenant_id = p_tenant_id and status = 'open';

  if not found then
    raise exception 'ไม่พบกะที่กำลังเปิดอยู่ หรือกะถูกปิดไปแล้ว';
  end if;

  select coalesce(sum(p.amount), 0) into v_cash_sales
  from pos_payments p
  join sales s on s.id = p.sale_id
  where s.shift_id = p_shift_id and p.method = 'cash' and s.status = 'completed';

  v_expected_cash := v_starting_cash + v_cash_sales;

  update pos_shifts
  set 
    status = 'closed',
    closed_at = now(),
    closed_by = p_staff_id,
    actual_closing_cash = p_actual_cash,
    expected_closing_cash = v_expected_cash,
    notes = p_notes
  where id = p_shift_id and tenant_id = p_tenant_id and status = 'open';
end $$;


-- Drop the old complete_pos_sale and replace it with one that takes p_shift_id
drop function if exists complete_pos_sale(uuid, uuid, uuid, pos_payment_method, jsonb, text, text, uuid, text, numeric);

create or replace function complete_pos_sale(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_staff_id uuid,
  p_shift_id uuid,
  p_payment_method pos_payment_method,
  p_items jsonb,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_booking_id uuid default null,
  p_note text default null,
  p_discount_amount numeric default 0
) returns table (sale_id uuid, sale_number text, receipt_number text, total_amount numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_sale_id uuid;
  v_sale_number text;
  v_receipt_number text;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
begin
  if p_shift_id is null then
    raise exception 'การขายต้องระบุกะ (Shift ID)';
  end if;
  
  if not exists (select 1 from pos_shifts where id = p_shift_id and tenant_id = p_tenant_id and branch_id = p_branch_id and status = 'open') then
    raise exception 'กะการขายถูกปิดไปแล้ว หรือไม่พบกะที่ถูกต้อง';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ต้องมีสินค้าอย่างน้อยหนึ่งรายการ';
  end if;
  if p_discount_amount < 0 then
    raise exception 'ส่วนลดต้องไม่ติดลบ';
  end if;
  if not exists (select 1 from branches where id = p_branch_id and tenant_id = p_tenant_id) then
    raise exception 'สาขาไม่อยู่ในองค์กร';
  end if;
  if p_booking_id is not null and not exists (
    select 1 from bookings where id = p_booking_id and tenant_id = p_tenant_id and branch_id = p_branch_id
  ) then
    raise exception 'การจองไม่อยู่ในสาขานี้';
  end if;

  -- validate และรวมยอดก่อน
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'จำนวนสินค้าไม่ถูกต้อง';
    end if;
    select * into v_product from products
    where id = (v_item ->> 'product_id')::uuid
      and tenant_id = p_tenant_id and is_active = true
    for share;
    if not found then
      raise exception 'ไม่พบสินค้าหรือสินค้าถูกปิดการขาย';
    end if;
    v_subtotal := v_subtotal + (v_product.selling_price * v_qty);
  end loop;

  if p_discount_amount > v_subtotal then
    raise exception 'ส่วนลดมากกว่ายอดขาย';
  end if;
  v_total := v_subtotal - p_discount_amount;
  v_receipt_number := next_receipt_number(p_tenant_id);
  v_sale_number := 'POS-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));

  insert into sales (
    tenant_id, branch_id, shift_id, booking_id, staff_id, sale_number, receipt_number,
    customer_name, customer_phone, subtotal, discount_amount, total_amount, note
  ) values (
    p_tenant_id, p_branch_id, p_shift_id, p_booking_id, p_staff_id, v_sale_number, v_receipt_number,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''),
    v_subtotal, p_discount_amount, v_total, nullif(trim(p_note), '')
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from products
    where id = (v_item ->> 'product_id')::uuid and tenant_id = p_tenant_id
    for share;

    insert into sale_items (
      tenant_id, sale_id, product_id, product_name, product_type, quantity, unit_price, line_total
    ) values (
      p_tenant_id, v_sale_id, v_product.id, v_product.name, v_product.product_type,
      v_qty, v_product.selling_price, v_product.selling_price * v_qty
    );
    if v_product.track_stock then
      perform adjust_inventory(
        p_tenant_id, p_branch_id, v_product.id, -v_qty, 'sale',
        'ขายหน้าร้าน ' || v_sale_number, p_staff_id, v_sale_id
      );
    end if;
  end loop;

  insert into pos_payments (tenant_id, sale_id, method, amount, received_by)
  values (p_tenant_id, v_sale_id, p_payment_method, v_total, p_staff_id);

  return query select v_sale_id, v_sale_number, v_receipt_number, v_total;
end $$;

-- Policies for pos_shifts
alter table pos_shifts enable row level security;

create policy "pos_shifts_tenant_read"
  on pos_shifts for select to authenticated
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_staff()));

create policy "pos_shifts_admin_all"
  on pos_shifts for all to authenticated
  using (tenant_id = auth_tenant_id() and is_venue_admin())
  with check (tenant_id = auth_tenant_id() and is_venue_admin());

create policy "pos_shifts_staff_manage"
  on pos_shifts for all to authenticated
  using (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()))
  with check (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()));

revoke all on function open_pos_shift(uuid, uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function close_pos_shift(uuid, uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function complete_pos_sale(uuid, uuid, uuid, uuid, pos_payment_method, jsonb, text, text, uuid, text, numeric) from public, anon, authenticated;

grant execute on function open_pos_shift(uuid, uuid, uuid, numeric) to service_role;
grant execute on function close_pos_shift(uuid, uuid, uuid, numeric, text) to service_role;
grant execute on function complete_pos_sale(uuid, uuid, uuid, uuid, pos_payment_method, jsonb, text, text, uuid, text, numeric) to service_role;
