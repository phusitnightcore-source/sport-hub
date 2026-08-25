-- Sports Hub SOW v1.1 — POS & Inventory MVP
-- ข้อมูลทุกชุดผูก tenant + branch และการตัดสต็อกทำผ่าน RPC เท่านั้น

do $$ begin
  create type product_type as enum ('product', 'rental', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_movement_type as enum
    ('purchase', 'sale', 'return', 'adjustment', 'damage', 'transfer', 'initial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pos_sale_status as enum ('completed', 'voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pos_payment_method as enum ('cash', 'transfer', 'card', 'other');
exception when duplicate_object then null; end $$;

-- SOW v1.1: Hold เป็น 15 นาทีแบบตายตัว (ใช้กับ tenant เดิมด้วย)
update tenants
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{slot_lock_minutes}', '15'::jsonb, true)
where coalesce(settings ->> 'slot_lock_minutes', '') <> '15';

create table if not exists product_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists products (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  category_id           uuid references product_categories(id) on delete set null,
  sku                   text,
  barcode               text,
  name                  text not null,
  product_type          product_type not null default 'product',
  cost_price            numeric(10,2) not null default 0 check (cost_price >= 0),
  selling_price         numeric(10,2) not null check (selling_price >= 0),
  low_stock_threshold   integer not null default 0 check (low_stock_threshold >= 0),
  track_stock           boolean not null default true,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, sku),
  unique (tenant_id, barcode)
);
create index if not exists idx_products_tenant_active on products (tenant_id, is_active, name);

create table if not exists inventory (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  branch_id   uuid not null references branches(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  quantity    integer not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  unique (branch_id, product_id)
);
create index if not exists idx_inventory_tenant_branch on inventory (tenant_id, branch_id);

create table if not exists sales (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid not null references branches(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete set null,
  staff_id        uuid references staff(id) on delete set null,
  sale_number     text not null unique,
  receipt_number  text not null,
  customer_name   text,
  customer_phone  text,
  subtotal        numeric(10,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  total_amount    numeric(10,2) not null default 0 check (total_amount >= 0),
  status          pos_sale_status not null default 'completed',
  note            text,
  completed_at    timestamptz not null default now(),
  voided_at       timestamptz,
  void_reason     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, receipt_number),
  check (discount_amount <= subtotal),
  check ((status = 'completed' and voided_at is null) or status = 'voided')
);
create index if not exists idx_sales_tenant_completed on sales (tenant_id, completed_at desc);
create index if not exists idx_sales_branch_completed on sales (branch_id, completed_at desc);

create table if not exists sale_items (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  sale_id         uuid not null references sales(id) on delete cascade,
  product_id      uuid references products(id) on delete set null,
  product_name    text not null,
  product_type    product_type not null,
  quantity        integer not null check (quantity > 0),
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  line_total      numeric(10,2) not null check (line_total >= 0),
  created_at      timestamptz not null default now(),
  check (line_total = unit_price * quantity)
);
create index if not exists idx_sale_items_sale on sale_items (sale_id);

create table if not exists pos_payments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  sale_id         uuid not null references sales(id) on delete cascade,
  method          pos_payment_method not null,
  amount          numeric(10,2) not null check (amount >= 0),
  reference       text,
  received_by     uuid references staff(id) on delete set null,
  paid_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_pos_payments_sale on pos_payments (sale_id);

create table if not exists stock_movements (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid not null references branches(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  sale_id         uuid references sales(id) on delete set null,
  movement_type   stock_movement_type not null,
  quantity_change integer not null check (quantity_change <> 0),
  quantity_after  integer not null check (quantity_after >= 0),
  note            text,
  created_by      uuid references staff(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_stock_movements_product on stock_movements (product_id, created_at desc);
create index if not exists idx_stock_movements_branch on stock_movements (branch_id, created_at desc);

create trigger set_product_categories_updated_at
  before update on product_categories for each row execute function set_updated_at();
create trigger set_products_updated_at
  before update on products for each row execute function set_updated_at();
create trigger set_sales_updated_at
  before update on sales for each row execute function set_updated_at();

-- ปรับสต็อกโดยบันทึก movement เสมอ: ห้าม update inventory ตรงจาก client/API
create or replace function adjust_inventory(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity_change integer,
  p_movement_type stock_movement_type,
  p_note text default null,
  p_created_by uuid default null,
  p_sale_id uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_quantity integer;
  v_tracks_stock boolean;
begin
  if p_quantity_change = 0 then
    raise exception 'จำนวนสต็อกต้องเปลี่ยนแปลง';
  end if;

  select track_stock into v_tracks_stock
  from products
  where id = p_product_id and tenant_id = p_tenant_id and is_active = true;
  if not found then
    raise exception 'ไม่พบสินค้า';
  end if;
  if not v_tracks_stock then
    raise exception 'สินค้านี้ไม่ได้ติดตามสต็อก';
  end if;
  if not exists (select 1 from branches where id = p_branch_id and tenant_id = p_tenant_id) then
    raise exception 'สาขาไม่อยู่ในองค์กร';
  end if;

  insert into inventory (tenant_id, branch_id, product_id, quantity)
  values (p_tenant_id, p_branch_id, p_product_id, 0)
  on conflict (branch_id, product_id) do nothing;

  select quantity into v_quantity
  from inventory
  where branch_id = p_branch_id and product_id = p_product_id
  for update;
  v_quantity := v_quantity + p_quantity_change;
  if v_quantity < 0 then
    raise exception 'สต็อกคงเหลือไม่เพียงพอ';
  end if;

  update inventory set quantity = v_quantity, updated_at = now()
  where branch_id = p_branch_id and product_id = p_product_id;

  insert into stock_movements (
    tenant_id, branch_id, product_id, sale_id, movement_type,
    quantity_change, quantity_after, note, created_by
  ) values (
    p_tenant_id, p_branch_id, p_product_id, p_sale_id, p_movement_type,
    p_quantity_change, v_quantity, p_note, p_created_by
  );
  return v_quantity;
end $$;

-- Checkout เป็นธุรกรรมเดียว: สร้าง Sale, Payment, Movement, และตัด Stock พร้อมกัน
create or replace function complete_pos_sale(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_staff_id uuid,
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

  -- validate และรวมยอดก่อน เพื่อ reject รายการที่ไม่ถูกต้องโดยไม่สร้าง sale ครึ่งเดียว
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
    tenant_id, branch_id, booking_id, staff_id, sale_number, receipt_number,
    customer_name, customer_phone, subtotal, discount_amount, total_amount, note
  ) values (
    p_tenant_id, p_branch_id, p_booking_id, p_staff_id, v_sale_number, v_receipt_number,
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

-- RLS: ผู้ใช้เห็นเฉพาะข้อมูลใน tenant/สาขาที่รับผิดชอบ; การตัดสต็อกเขียนผ่าน RPC เท่านั้น
alter table product_categories enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table pos_payments enable row level security;
alter table stock_movements enable row level security;

create policy product_categories_tenant_read on product_categories for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_staff()));
create policy product_categories_admin_write on product_categories for all
  using (tenant_id = auth_tenant_id() and is_venue_admin())
  with check (tenant_id = auth_tenant_id() and is_venue_admin());

create policy products_tenant_read on products for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_staff()));
create policy products_admin_write on products for all
  using (tenant_id = auth_tenant_id() and is_venue_admin())
  with check (tenant_id = auth_tenant_id() and is_venue_admin());

create policy inventory_branch_read on inventory for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and branch_id = any(my_branch_ids())));
create policy sales_branch_read on sales for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and branch_id = any(my_branch_ids())));
create policy sale_items_branch_read on sale_items for select
  using (is_super_admin() or exists (
    select 1 from sales s
    where s.id = sale_items.sale_id and s.tenant_id = auth_tenant_id() and s.branch_id = any(my_branch_ids())
  ));
create policy pos_payments_branch_read on pos_payments for select
  using (is_super_admin() or exists (
    select 1 from sales s
    where s.id = pos_payments.sale_id and s.tenant_id = auth_tenant_id() and s.branch_id = any(my_branch_ids())
  ));
create policy stock_movements_branch_read on stock_movements for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and branch_id = any(my_branch_ids())));

revoke all on function adjust_inventory(uuid, uuid, uuid, integer, stock_movement_type, text, uuid, uuid) from public, anon, authenticated;
revoke all on function complete_pos_sale(uuid, uuid, uuid, pos_payment_method, jsonb, text, text, uuid, text, numeric) from public, anon, authenticated;
grant execute on function adjust_inventory(uuid, uuid, uuid, integer, stock_movement_type, text, uuid, uuid) to service_role;
grant execute on function complete_pos_sale(uuid, uuid, uuid, pos_payment_method, jsonb, text, text, uuid, text, numeric) to service_role;
