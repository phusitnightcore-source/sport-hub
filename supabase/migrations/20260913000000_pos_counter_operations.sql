-- Additive counter operations. Does not seed or delete customer/business data.
alter table public.sales add column if not exists checkout_key uuid;
alter table public.sales add column if not exists checkout_payload jsonb;
alter table public.sales add column if not exists cash_received numeric(12,2);
alter table public.sales add column if not exists change_amount numeric(12,2);
create unique index if not exists sales_checkout_key on public.sales(tenant_id, checkout_key) where checkout_key is not null;

create table public.pos_cash_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  branch_id uuid not null references public.branches(id),
  shift_id uuid not null references public.pos_shifts(id),
  amount numeric(12,2) not null check (amount <> 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, request_id)
);
alter table public.pos_cash_movements enable row level security;
create policy pos_cash_branch_read on public.pos_cash_movements for select to authenticated
  using (tenant_id = auth_tenant_id() and (is_venue_admin() or branch_id = any(my_branch_ids())));
grant select on public.pos_cash_movements to authenticated;
grant all on public.pos_cash_movements to service_role;

-- All counter writes lock the same shift row, serializing settlement and closing.
create or replace function public.open_pos_shift(p_tenant_id uuid, p_branch_id uuid, p_staff_id uuid, p_starting_cash numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform 1 from branches where id=p_branch_id and tenant_id=p_tenant_id and status='active' for update;
  if not found then raise exception 'ไม่พบสาขาที่เปิดใช้งาน'; end if;
  if p_starting_cash is null or p_starting_cash < 0 or p_starting_cash > 1000000 then raise exception 'เงินตั้งต้นไม่ถูกต้อง'; end if;
  if exists(select 1 from pos_shifts where branch_id=p_branch_id and tenant_id=p_tenant_id and status='open') then
    raise exception 'สาขานี้มีกะเปิดอยู่แล้ว';
  end if;
  insert into pos_shifts(tenant_id,branch_id,opened_by,starting_cash) values(p_tenant_id,p_branch_id,p_staff_id,round(p_starting_cash,2)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.checkout_pos_counter(
  p_tenant_id uuid, p_branch_id uuid, p_staff_id uuid, p_shift_id uuid,
  p_checkout_key uuid, p_payment_method pos_payment_method, p_items jsonb,
  p_expected_total numeric, p_cash_received numeric,
  p_customer_name text default null, p_customer_phone text default null,
  p_booking_id uuid default null, p_note text default null, p_discount_amount numeric default 0,
  p_reference text default null
) returns table(sale_id uuid, receipt_number text, total_amount numeric)
language plpgsql security definer set search_path = public as $$
declare v_existing sales%rowtype; v_result record; v_payload jsonb;
begin
  if p_checkout_key is null then raise exception 'ไม่พบรหัสรายการ'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || p_checkout_key::text,0));
  v_payload := jsonb_build_object('branch',p_branch_id,'shift',p_shift_id,'method',p_payment_method,'items',p_items,
    'total',p_expected_total,'received',p_cash_received,'discount',p_discount_amount,'booking',p_booking_id,
    'name',p_customer_name,'phone',p_customer_phone,'note',p_note,'reference',p_reference);
  select * into v_existing from sales where tenant_id=p_tenant_id and checkout_key=p_checkout_key;
  if found then
    if v_existing.checkout_payload is distinct from v_payload then raise exception 'รหัสรายการซ้ำกับบิลอื่น'; end if;
    return query select v_existing.id,v_existing.receipt_number,v_existing.total_amount;
    return;
  end if;
  perform 1 from pos_shifts where id=p_shift_id and tenant_id=p_tenant_id and branch_id=p_branch_id and status='open' for update;
  if not found then raise exception 'กะถูกปิดแล้ว กรุณาเปิดกะใหม่'; end if;
  if p_expected_total is null or p_expected_total < 0 or p_expected_total > 1000000 then raise exception 'ยอดชำระไม่ถูกต้อง'; end if;
  if p_payment_method='cash' and (p_cash_received is null or p_cash_received < p_expected_total or p_cash_received > 1000000) then
    raise exception 'เงินสดที่รับไม่เพียงพอหรือไม่ถูกต้อง';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'รายการสินค้าไม่ถูกต้อง'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'quantity')::numeric not between 1 and 100 or (i->>'quantity')::numeric <> trunc((i->>'quantity')::numeric)) then raise exception 'จำนวนสินค้าไม่ถูกต้อง'; end if;
  if (select count(distinct i->>'product_id') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then raise exception 'รายการสินค้าซ้ำ'; end if;
  select * into v_result from complete_pos_sale(p_tenant_id,p_branch_id,p_staff_id,p_shift_id,p_payment_method,p_items,p_customer_name,p_customer_phone,p_booking_id,p_note,p_discount_amount);
  -- An exception rolls back sale, receipt sequence update, payment and stock together.
  if v_result.total_amount <> round(p_expected_total,2) then raise exception 'ราคาสินค้าเปลี่ยน กรุณาโหลดสินค้าใหม่และตรวจยอดอีกครั้ง'; end if;
  update sales set checkout_key=p_checkout_key, checkout_payload=v_payload,
    cash_received=case when p_payment_method='cash' then round(p_cash_received,2) end,
    change_amount=case when p_payment_method='cash' then round(p_cash_received-v_result.total_amount,2) end
  where id=v_result.sale_id;
  update pos_payments set reference=nullif(trim(p_reference),'') where pos_payments.sale_id=v_result.sale_id;
  return query select v_result.sale_id,v_result.receipt_number,v_result.total_amount;
end $$;

create or replace function public.pos_counter_report(p_tenant_id uuid, p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shift pos_shifts%rowtype; v_methods jsonb; v_cash numeric; v_total numeric; v_movements numeric;
begin
  select * into v_shift from pos_shifts where id=p_shift_id and tenant_id=p_tenant_id;
  if not found then raise exception 'ไม่พบกะ'; end if;
  select coalesce(jsonb_object_agg(method,amount),'{}'::jsonb) into v_methods from (
    select p.method,sum(p.amount) amount from pos_payments p join sales s on s.id=p.sale_id
    where s.tenant_id=p_tenant_id and s.shift_id=p_shift_id and s.status='completed' group by p.method
  ) t;
  v_cash:=coalesce((v_methods->>'cash')::numeric,0);
  select coalesce(sum(total_amount),0) into v_total from sales where tenant_id=p_tenant_id and shift_id=p_shift_id and status='completed';
  select coalesce(sum(amount),0) into v_movements from pos_cash_movements where tenant_id=p_tenant_id and shift_id=p_shift_id;
  return jsonb_build_object('shift',to_jsonb(v_shift),'totalRevenue',v_total,
    'salesByMethod',jsonb_build_object('cash',0,'transfer',0,'card',0,'other',0)||v_methods,
    'cashMovementTotal',v_movements,'expectedCash',v_shift.starting_cash+v_cash+v_movements,
    'soldItems',coalesce((select jsonb_agg(t) from (
      select i.product_name name,sum(i.quantity) quantity,sum(i.line_total) revenue
      from sale_items i join sales s on s.id=i.sale_id where s.tenant_id=p_tenant_id and s.shift_id=p_shift_id and s.status='completed'
      group by i.product_id,i.product_name order by sum(i.quantity) desc
    ) t),'[]'::jsonb),
    'cashMovements',coalesce((select jsonb_agg(t) from (
      select amount,reason,created_at from pos_cash_movements where tenant_id=p_tenant_id and shift_id=p_shift_id order by created_at desc
    ) t),'[]'::jsonb));
end $$;

create or replace function public.record_pos_cash(p_tenant_id uuid,p_shift_id uuid,p_amount numeric,p_reason text,p_actor_id uuid,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_shift pos_shifts%rowtype; v_existing pos_cash_movements%rowtype; v_report jsonb;
begin
  select * into v_shift from pos_shifts where id=p_shift_id and tenant_id=p_tenant_id and status='open' for update;
  if not found then raise exception 'กะถูกปิดแล้ว'; end if;
  select * into v_existing from pos_cash_movements where tenant_id=p_tenant_id and request_id=p_request_id;
  if found then
    if v_existing.shift_id<>p_shift_id or v_existing.amount<>p_amount or v_existing.reason<>trim(p_reason) then raise exception 'รหัสรายการซ้ำ'; end if;
    return;
  end if;
  if p_amount is null or round(p_amount,2)=0 or abs(p_amount)>1000000 or length(trim(p_reason)) not between 1 and 500 then raise exception 'ข้อมูลเงินสดไม่ถูกต้อง'; end if;
  v_report:=pos_counter_report(p_tenant_id,p_shift_id);
  if (v_report->>'expectedCash')::numeric+p_amount < 0 then raise exception 'เงินสดในลิ้นชักไม่เพียงพอ'; end if;
  insert into pos_cash_movements(tenant_id,branch_id,shift_id,amount,reason,actor_id,request_id)
    values(p_tenant_id,v_shift.branch_id,p_shift_id,round(p_amount,2),trim(p_reason),p_actor_id,p_request_id);
end $$;

-- Full refund/void in the original open shift; closed shift accounts remain immutable.
create or replace function public.void_pos_counter_sale(p_tenant_id uuid,p_sale_id uuid,p_staff_id uuid,p_reason text,p_restock boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_sale sales%rowtype; v_move record; v_quantity integer;
begin
  select * into v_sale from sales where id=p_sale_id and tenant_id=p_tenant_id;
  if not found then raise exception 'ไม่พบบิล'; end if;
  perform 1 from pos_shifts where id=v_sale.shift_id and tenant_id=p_tenant_id and status='open' for update;
  if not found then raise exception 'คืนเงินได้เฉพาะบิลในกะที่ยังเปิดอยู่'; end if;
  select * into v_sale from sales where id=p_sale_id and tenant_id=p_tenant_id for update;
  if v_sale.status='voided' then return; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception 'กรุณาระบุเหตุผลคืนเงิน'; end if;
  if (pos_counter_report(p_tenant_id,v_sale.shift_id)->>'expectedCash')::numeric <
    coalesce((select sum(amount) from pos_payments where sale_id=p_sale_id and method='cash'),0) then
    raise exception 'เงินสดในลิ้นชักไม่พอคืน กรุณาบันทึกเติมเงินสดก่อน';
  end if;
  if p_restock then
    -- Use original stock movements, not the product's current tracking/active flag.
    for v_move in select product_id,-sum(quantity_change)::integer qty from stock_movements
      where tenant_id=p_tenant_id and sale_id=p_sale_id and movement_type='sale' group by product_id order by product_id loop
      insert into inventory(tenant_id,branch_id,product_id,quantity) values(p_tenant_id,v_sale.branch_id,v_move.product_id,0) on conflict(branch_id,product_id) do nothing;
      update inventory set quantity=quantity+v_move.qty,updated_at=now() where branch_id=v_sale.branch_id and product_id=v_move.product_id and tenant_id=p_tenant_id returning quantity into v_quantity;
      insert into stock_movements(tenant_id,branch_id,product_id,sale_id,movement_type,quantity_change,quantity_after,note,created_by)
        values(p_tenant_id,v_sale.branch_id,v_move.product_id,p_sale_id,'return',v_move.qty,v_quantity,trim(p_reason),p_staff_id);
    end loop;
  end if;
  update sales set status='voided',voided_at=now(),void_reason=trim(p_reason) where id=p_sale_id;
end $$;

create or replace function public.close_pos_shift(p_tenant_id uuid,p_shift_id uuid,p_staff_id uuid,p_actual_cash numeric,p_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_expected numeric; v_report jsonb;
begin
  perform 1 from pos_shifts where id=p_shift_id and tenant_id=p_tenant_id and status='open' for update;
  if not found then raise exception 'กะถูกปิดแล้ว'; end if;
  if p_actual_cash is null or p_actual_cash<0 or p_actual_cash>1000000 then raise exception 'ยอดเงินสดไม่ถูกต้อง'; end if;
  v_report:=pos_counter_report(p_tenant_id,p_shift_id);
  v_expected:=(v_report->>'expectedCash')::numeric;
  if round(p_actual_cash,2)<>v_expected and coalesce(length(trim(p_notes)),0)=0 then raise exception 'กรุณาระบุเหตุผลเงินสดขาดหรือเกิน'; end if;
  update pos_shifts set status='closed',closed_at=now(),closed_by=p_staff_id,actual_closing_cash=round(p_actual_cash,2),expected_closing_cash=v_expected,notes=p_notes where id=p_shift_id;
end $$;

create or replace function public.pos_daily_summary(p_tenant_id uuid,p_branch_ids uuid[])
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(t),'[]'::jsonb) from (
    select branch_id,count(*) sale_count,coalesce(sum(total_amount),0) revenue
    from sales where tenant_id=p_tenant_id and branch_id=any(p_branch_ids) and status='completed'
    and completed_at >= (date_trunc('day',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')
    and completed_at < ((date_trunc('day',now() at time zone 'Asia/Bangkok')+interval '1 day') at time zone 'Asia/Bangkok')
    group by branch_id
  ) t;
$$;

revoke all on function public.checkout_pos_counter(uuid,uuid,uuid,uuid,uuid,pos_payment_method,jsonb,numeric,numeric,text,text,uuid,text,numeric,text) from public,anon,authenticated;
revoke all on function public.pos_counter_report(uuid,uuid) from public,anon,authenticated;
revoke all on function public.record_pos_cash(uuid,uuid,numeric,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.void_pos_counter_sale(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.pos_daily_summary(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.checkout_pos_counter(uuid,uuid,uuid,uuid,uuid,pos_payment_method,jsonb,numeric,numeric,text,text,uuid,text,numeric,text) to service_role;
grant execute on function public.pos_counter_report(uuid,uuid) to service_role;
grant execute on function public.record_pos_cash(uuid,uuid,numeric,text,uuid,uuid) to service_role;
grant execute on function public.void_pos_counter_sale(uuid,uuid,uuid,text,boolean) to service_role;
grant execute on function public.pos_daily_summary(uuid,uuid[]) to service_role;

-- Create catalog item and its opening inventory in one transaction.
create or replace function public.create_pos_product(p_tenant_id uuid,p_branch_id uuid,p_staff_id uuid,p_product jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_category uuid;
begin
  if not exists(select 1 from branches where id=p_branch_id and tenant_id=p_tenant_id and status='active') then raise exception 'ไม่พบสาขา'; end if;
  if length(trim(coalesce(p_product->>'name',''))) not between 1 and 160 then raise exception 'ชื่อสินค้าไม่ถูกต้อง'; end if;
  if nullif(trim(p_product->>'category'),'') is not null then
    insert into product_categories(tenant_id,name) values(p_tenant_id,trim(p_product->>'category'))
    on conflict(tenant_id,name) do update set name=excluded.name returning id into v_category;
  end if;
  insert into products(tenant_id,category_id,name,sku,barcode,product_type,cost_price,selling_price,low_stock_threshold,track_stock)
  values(p_tenant_id,v_category,trim(p_product->>'name'),nullif(trim(p_product->>'sku'),''),nullif(trim(p_product->>'barcode'),''),
    (p_product->>'productType')::product_type,(p_product->>'costPrice')::numeric,(p_product->>'sellingPrice')::numeric,
    (p_product->>'lowStockThreshold')::integer,(p_product->>'trackStock')::boolean) returning id into v_id;
  if (p_product->>'trackStock')::boolean and (p_product->>'initialStock')::integer > 0 then
    perform adjust_inventory(p_tenant_id,p_branch_id,v_id,(p_product->>'initialStock')::integer,'initial','ยอดตั้งต้นเมื่อสร้างสินค้า',p_staff_id,null);
  end if;
  return v_id;
end $$;
revoke all on function public.create_pos_product(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_pos_product(uuid,uuid,uuid,jsonb) to service_role;

-- Staff clients must not bypass the shift lock/accounting RPCs with direct writes.
drop policy if exists pos_shifts_staff_manage on public.pos_shifts;
drop policy if exists pos_shifts_admin_all on public.pos_shifts;
drop policy if exists pos_shifts_tenant_read on public.pos_shifts;
create policy pos_shifts_tenant_read on public.pos_shifts for select to authenticated
  using (is_super_admin() or (tenant_id=auth_tenant_id() and (is_venue_admin() or branch_id=any(my_branch_ids()))));
