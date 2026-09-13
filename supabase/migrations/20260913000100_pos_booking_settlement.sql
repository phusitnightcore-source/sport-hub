-- Combined court + merchandise settlement. Apply after pos_counter_operations.
alter table public.sales add column if not exists booking_charge numeric(10,2) not null default 0 check (booking_charge >= 0 and booking_charge <= total_amount);
alter table public.sales add column if not exists booking_payment_id uuid references public.payments(id);
create unique index sales_booking_payment on public.sales(booking_payment_id) where booking_payment_id is not null;

-- Serialize slip uploads/approvals with counter checkout on the booking row.
-- Do not rewrite historical payments or introduce a unique constraint on old data.
create or replace function public.guard_booking_settlement() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_booking bookings%rowtype;
begin
  if new.booking_id is null then return new; end if;
  select * into v_booking from bookings where id=new.booking_id for update;
  if not found or v_booking.tenant_id<>new.tenant_id then raise exception 'ไม่พบการจองในองค์กรนี้'; end if;
  if tg_op='UPDATE' and old.reference_module='pos_counter' and new.refund_status='refunded'
     and old.refund_status is distinct from new.refund_status
     and not exists(select 1 from sales where id=old.reference_id and tenant_id=new.tenant_id and status='voided') then
    raise exception 'กรุณาคืนเงินบิลรวมผ่าน POS';
  end if;
  if new.status in ('awaiting_verification','verified') and (tg_op='INSERT' or old.status is distinct from new.status) then
    if v_booking.status in ('cancelled','refunded','awaiting_refund') then raise exception 'การจองนี้ไม่สามารถรับชำระได้'; end if;
    if exists(select 1 from payments where booking_id=new.booking_id and id<>new.id
      and status in ('awaiting_verification','verified') and refund_status is distinct from 'refunded'::refund_status) then
      raise exception 'การจองนี้มีรายการรับชำระหรือสลิปรอตรวจแล้ว';
    end if;
  end if;
  return new;
end $$;
create trigger booking_settlement_guard before insert or update of status,refund_status on public.payments
for each row execute function public.guard_booking_settlement();

create or replace function public.checkout_pos_booking(
  p_tenant_id uuid,p_branch_id uuid,p_staff_id uuid,p_shift_id uuid,
  p_checkout_key uuid,p_payment_method pos_payment_method,p_items jsonb,
  p_expected_total numeric,p_cash_received numeric,
  p_customer_name text default null,p_customer_phone text default null,
  p_booking_id uuid default null,p_note text default null,p_discount_amount numeric default 0,
  p_reference text default null
) returns table(sale_id uuid,receipt_number text,total_amount numeric)
language plpgsql security definer set search_path=public as $$
declare v_booking bookings%rowtype; v_existing sales%rowtype; v_result record;
  v_payload jsonb; v_sale uuid; v_receipt text; v_payment uuid; v_description text; v_method payment_method;
begin
  if p_checkout_key is null or p_booking_id is null then raise exception 'ระบุรหัสรายการและการจอง'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_checkout_key::text,0));
  v_payload:=jsonb_build_object('collectBooking',true,'branch',p_branch_id,'shift',p_shift_id,'method',p_payment_method,
    'items',p_items,'total',p_expected_total,'received',p_cash_received,'discount',p_discount_amount,
    'booking',p_booking_id,'name',p_customer_name,'phone',p_customer_phone,'note',p_note,'reference',p_reference);
  select * into v_existing from sales where tenant_id=p_tenant_id and checkout_key=p_checkout_key;
  if found then
    if v_existing.checkout_payload is distinct from v_payload then raise exception 'รหัสรายการซ้ำกับบิลอื่น'; end if;
    return query select v_existing.id,v_existing.receipt_number,v_existing.total_amount; return;
  end if;
  perform 1 from pos_shifts where id=p_shift_id and tenant_id=p_tenant_id and branch_id=p_branch_id and status='open' for update;
  if not found then raise exception 'กะถูกปิดแล้ว กรุณาเปิดกะใหม่'; end if;
  select * into v_booking from bookings where id=p_booking_id and tenant_id=p_tenant_id and branch_id=p_branch_id for update;
  if not found then raise exception 'ไม่พบการจองในสาขานี้'; end if;
  if v_booking.status<>'pending_payment' or (v_booking.slot_locked_until is not null and v_booking.slot_locked_until<=now()) then
    raise exception 'การจองหมดเวลา รับชำระแล้ว หรือไม่อยู่ในสถานะรอชำระ';
  end if;
  if exists(select 1 from payments where booking_id=p_booking_id and (status in ('awaiting_verification','verified') or refund_status='awaiting_refund')) then
    raise exception 'การจองมีรายการชำระหรือรอคืนเงินแล้ว กรุณาตรวจสอบก่อน';
  end if;
  if p_expected_total is null or p_expected_total<0 or p_expected_total>1000000
    or p_discount_amount is null or p_discount_amount<0 then raise exception 'ยอดชำระไม่ถูกต้อง'; end if;
  if p_payment_method='cash' and (p_cash_received is null or p_cash_received<round(p_expected_total,2) or p_cash_received>1000000) then
    raise exception 'เงินสดที่รับไม่เพียงพอ'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>100 then raise exception 'รายการสินค้าไม่ถูกต้อง'; end if;
  if jsonb_array_length(p_items)>0 then
    -- Reuse the existing atomic stock and price validation; the outer transaction
    -- rolls everything back if booking/payment/receipt creation fails.
    select * into v_result from checkout_pos_counter(p_tenant_id,p_branch_id,p_staff_id,p_shift_id,p_checkout_key,
      p_payment_method,p_items,p_expected_total-v_booking.total_price,p_cash_received,p_customer_name,p_customer_phone,
      p_booking_id,p_note,p_discount_amount,p_reference);
    v_sale:=v_result.sale_id; v_receipt:=v_result.receipt_number;
    update sales set subtotal=subtotal+v_booking.total_price,total_amount=total_amount+v_booking.total_price where id=v_sale;
    update pos_payments set amount=amount+v_booking.total_price where pos_payments.sale_id=v_sale;
  else
    if p_discount_amount<>0 or round(p_expected_total,2)<>v_booking.total_price then raise exception 'ค่าจองเปลี่ยน กรุณาตรวจยอดใหม่'; end if;
    v_receipt:=next_receipt_number(p_tenant_id);
    insert into sales(tenant_id,branch_id,shift_id,booking_id,staff_id,sale_number,receipt_number,customer_name,customer_phone,subtotal,total_amount,note)
    values(p_tenant_id,p_branch_id,p_shift_id,p_booking_id,p_staff_id,'POS-'||gen_random_uuid()::text,v_receipt,
      coalesce(nullif(trim(p_customer_name),''),v_booking.user_name),coalesce(nullif(trim(p_customer_phone),''),v_booking.user_phone),
      v_booking.total_price,v_booking.total_price,p_note) returning id into v_sale;
    insert into pos_payments(tenant_id,sale_id,method,amount,reference,received_by)
    values(p_tenant_id,v_sale,p_payment_method,v_booking.total_price,p_reference,p_staff_id);
  end if;
  v_description:='ค่าจอง '||v_booking.booking_code||' · '||v_booking.booking_date||' '||v_booking.start_time||'–'||v_booking.end_time;
  insert into sale_items(tenant_id,sale_id,product_name,product_type,quantity,unit_price,line_total)
  values(p_tenant_id,v_sale,v_description,'service',1,v_booking.total_price,v_booking.total_price);
  v_method:=case when p_payment_method='cash' then 'walk_in_cash'::payment_method else 'walk_in_transfer'::payment_method end;
  insert into payments(tenant_id,booking_id,amount,method,status,verified_by,verified_at,reference_module,reference_id)
  values(p_tenant_id,p_booking_id,v_booking.total_price,v_method,'verified',p_staff_id,now(),'pos_counter',v_sale) returning id into v_payment;
  -- One receipt number shared by booking and POS, with the full tendered amount.
  insert into receipts(tenant_id,payment_id,receipt_number,customer_name,description,amount,payment_method)
  values(p_tenant_id,v_payment,v_receipt,coalesce(nullif(trim(p_customer_name),''),v_booking.user_name),
    v_description||' และสินค้าตามบิล POS',round(p_expected_total,2),p_payment_method::text);
  update sales set booking_charge=v_booking.total_price,booking_payment_id=v_payment,
    checkout_key=p_checkout_key,checkout_payload=v_payload,
    cash_received=case when p_payment_method='cash' then round(p_cash_received,2) end,
    change_amount=case when p_payment_method='cash' then round(p_cash_received,2)-round(p_expected_total,2) end where id=v_sale;
  update bookings set status='confirmed',slot_locked_until=null,payment_method=v_method where id=p_booking_id;
  return query select v_sale,v_receipt,round(p_expected_total,2);
end $$;

create or replace function public.void_pos_booking_sale(p_tenant_id uuid,p_sale_id uuid,p_staff_id uuid,p_reason text,p_restock boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_sale sales%rowtype;
begin
  perform void_pos_counter_sale(p_tenant_id,p_sale_id,p_staff_id,p_reason,p_restock);
  select * into v_sale from sales where id=p_sale_id and tenant_id=p_tenant_id;
  if v_sale.booking_payment_id is not null then
    perform 1 from bookings where id=v_sale.booking_id for update;
    update payments set refund_status='refunded',refund_confirmed_at=now()
      where id=v_sale.booking_payment_id and refund_status is distinct from 'refunded'::refund_status;
    update bookings set status='refunded',cancelled_at=coalesce(cancelled_at,now()),cancel_reason=p_reason where id=v_sale.booking_id;
  end if;
end $$;
revoke all on function public.guard_booking_settlement() from public,anon,authenticated;
revoke all on function public.checkout_pos_booking(uuid,uuid,uuid,uuid,uuid,pos_payment_method,jsonb,numeric,numeric,text,text,uuid,text,numeric,text) from public,anon,authenticated;
revoke all on function public.void_pos_booking_sale(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.checkout_pos_booking(uuid,uuid,uuid,uuid,uuid,pos_payment_method,jsonb,numeric,numeric,text,text,uuid,text,numeric,text) to service_role;
grant execute on function public.void_pos_booking_sale(uuid,uuid,uuid,text,boolean) to service_role;
