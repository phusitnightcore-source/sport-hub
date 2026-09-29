-- Additive booking operations. Apply after the POS settlement migration.
ALTER TABLE public.bookings
  ADD COLUMN attendance_status text NOT NULL DEFAULT 'not_arrived'
    CHECK (attendance_status IN ('not_arrived','checked_in','completed','no_show')),
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN completed_at timestamptz;

CREATE TABLE public.booking_operation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_operation_events ENABLE ROW LEVEL SECURITY;
-- Read/write only through authenticated, branch-scoped server actions.
REVOKE ALL ON public.booking_operation_events FROM anon, authenticated;
GRANT ALL ON public.booking_operation_events TO service_role;
CREATE INDEX booking_operations_history_idx ON public.booking_operation_events(booking_id,created_at DESC);
CREATE INDEX booking_desk_day_idx ON public.bookings(tenant_id,branch_id,booking_date,start_time,id);

CREATE FUNCTION public.set_booking_attendance(p_tenant_id uuid,p_booking_id uuid,p_actor_id uuid,p_status text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; local_now timestamp := now() AT TIME ZONE 'Asia/Bangkok';
BEGIN
  SELECT * INTO b FROM bookings WHERE id=p_booking_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('checked_in','completed','no_show') THEN RAISE EXCEPTION 'INVALID_ATTENDANCE'; END IF;
  IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'BOOKING_NOT_CONFIRMED'; END IF;
  IF b.attendance_status=p_status THEN RETURN jsonb_build_object('status',p_status); END IF;
  IF length(trim(coalesce(p_reason,''))) < 2 OR length(p_reason)>500 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF p_status='checked_in' AND (b.attendance_status<>'not_arrived' OR b.booking_date<>local_now::date OR local_now >= b.booking_date+b.end_time) THEN
    RAISE EXCEPTION 'CHECK_IN_NOT_ALLOWED';
  END IF;
  IF p_status='completed' AND (b.attendance_status<>'checked_in' OR local_now < b.booking_date+b.start_time) THEN RAISE EXCEPTION 'COMPLETE_NOT_ALLOWED'; END IF;
  IF p_status='no_show' AND (b.attendance_status<>'not_arrived' OR local_now < b.booking_date+b.end_time) THEN RAISE EXCEPTION 'NO_SHOW_NOT_ALLOWED'; END IF;
  UPDATE bookings SET attendance_status=p_status,
    checked_in_at=CASE WHEN p_status='checked_in' THEN now() ELSE checked_in_at END,
    completed_at=CASE WHEN p_status='completed' THEN now() ELSE completed_at END
  WHERE id=b.id;
  INSERT INTO booking_operation_events(tenant_id,booking_id,actor_id,action,detail)
    VALUES(b.tenant_id,b.id,p_actor_id,'attendance',jsonb_build_object('before',b.attendance_status,'after',p_status,'reason',trim(p_reason)));
  RETURN jsonb_build_object('status',p_status);
END $$;

CREATE FUNCTION public.cancel_guest_booking(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; c public.courts; paid boolean; fee numeric; remaining_hours numeric; next_status public.booking_status;
BEGIN
  SELECT * INTO b FROM bookings WHERE booking_code=p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF b.status NOT IN ('pending_payment','awaiting_verification','confirmed') OR b.attendance_status<>'not_arrived' THEN RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'; END IF;
  remaining_hours := extract(epoch FROM (((b.booking_date+b.start_time) AT TIME ZONE 'Asia/Bangkok')-now()))/3600;
  IF remaining_hours<=0 THEN RAISE EXCEPTION 'BOOKING_ALREADY_STARTED'; END IF;
  -- POS refunds must use the original receipt; never create a second refund route.
  IF EXISTS(SELECT 1 FROM payments WHERE booking_id=b.id AND reference_module='pos_counter' AND refund_status IS DISTINCT FROM 'refunded') THEN RAISE EXCEPTION 'CANCEL_AT_POS'; END IF;
  SELECT * INTO c FROM courts WHERE id=b.court_id;
  SELECT EXISTS(SELECT 1 FROM payments WHERE booking_id=b.id AND status IN ('awaiting_verification','verified') AND refund_status IS DISTINCT FROM 'refunded') INTO paid;
  fee := CASE WHEN paid AND remaining_hours<coalesce(c.free_cancel_hours,24) THEN round(b.total_price*coalesce(c.cancel_fee_percent,50)/100,2) ELSE 0 END;
  next_status := CASE WHEN paid THEN 'awaiting_refund'::booking_status ELSE 'cancelled'::booking_status END;
  UPDATE bookings SET status=next_status,cancelled_at=now(),cancel_reason='ลูกค้ายกเลิก',cancel_fee=fee,slot_locked_until=NULL WHERE id=b.id;
  IF paid THEN UPDATE payments SET refund_status='awaiting_refund' WHERE booking_id=b.id AND status IN ('awaiting_verification','verified') AND refund_status IS DISTINCT FROM 'refunded'; END IF;
  INSERT INTO booking_operation_events(tenant_id,booking_id,action,detail) VALUES(b.tenant_id,b.id,'cancel',jsonb_build_object('before',b.status,'after',next_status,'fee',fee));
  RETURN jsonb_build_object('status',next_status,'cancelFee',fee,'refundAmount',CASE WHEN paid THEN b.total_price-fee ELSE 0 END,'message',CASE WHEN paid THEN 'ยกเลิกแล้ว กรุณาติดต่อสนามเพื่อติดตามการคืนเงิน' ELSE 'ยกเลิกการจองเรียบร้อยแล้ว' END);
END $$;

REVOKE ALL ON FUNCTION public.set_booking_attendance(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancel_guest_booking(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_attendance(uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_guest_booking(text) TO service_role;

CREATE FUNCTION public.verify_booking_payment(p_tenant_id uuid,p_payment_id uuid,p_staff_id uuid,p_actor_id uuid,p_approve boolean,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; p public.payments;
BEGIN
  SELECT * INTO p FROM payments WHERE id=p_payment_id AND tenant_id=p_tenant_id;
  IF NOT FOUND OR p.booking_id IS NULL THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
  SELECT * INTO b FROM bookings WHERE id=p.booking_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND OR b.status<>'awaiting_verification' THEN RAISE EXCEPTION 'BOOKING_STATE_CHANGED'; END IF;
  SELECT * INTO p FROM payments WHERE id=p_payment_id FOR UPDATE;
  IF p.status<>'awaiting_verification' OR p.refund_status IS NOT NULL THEN RAISE EXCEPTION 'PAYMENT_STATE_CHANGED'; END IF;
  IF p_approve IS NULL OR (NOT p_approve AND length(trim(coalesce(p_reason,'')))<2) THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  UPDATE payments SET status=CASE WHEN p_approve THEN 'verified'::payment_status ELSE 'rejected'::payment_status END,
    verified_by=p_staff_id,verified_at=now(),reject_reason=CASE WHEN p_approve THEN NULL ELSE p_reason END,
    refund_status=CASE WHEN p_approve THEN NULL ELSE 'awaiting_refund'::refund_status END
  WHERE id=p.id;
  UPDATE bookings SET status=CASE WHEN p_approve THEN 'confirmed'::booking_status ELSE 'awaiting_refund'::booking_status END,slot_locked_until=NULL WHERE id=b.id;
  INSERT INTO booking_operation_events(tenant_id,booking_id,actor_id,action,detail) VALUES(b.tenant_id,b.id,p_actor_id,'verify_payment',jsonb_build_object('approved',p_approve,'reason',p_reason,'payment_id',p.id));
  RETURN jsonb_build_object('status',CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END);
END $$;
CREATE FUNCTION public.booking_operation_history(p_tenant_id uuid,p_booking_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) FROM (
    SELECT action,detail,created_at FROM booking_operation_events
    WHERE tenant_id=p_tenant_id AND booking_id=p_booking_id ORDER BY created_at DESC,id DESC LIMIT 50
  ) e;
$$;
REVOKE ALL ON FUNCTION public.verify_booking_payment(uuid,uuid,uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.booking_operation_history(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment(uuid,uuid,uuid,uuid,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.booking_operation_history(uuid,uuid) TO service_role;

-- Rescheduling preserves the paid contract: same court, duration and gross price.
-- A changed-price booking requires a new booking and the normal refund workflow.
CREATE FUNCTION public.reschedule_booking(p_tenant_id uuid,p_booking_id uuid,p_actor_id uuid,p_date date,p_start time,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; c public.courts; finish timestamp; slot timestamp; gross numeric:=0; local_now timestamp:=now() AT TIME ZONE 'Asia/Bangkok';
BEGIN
  SELECT * INTO b FROM bookings WHERE id=p_booking_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF p_date IS NULL OR p_start IS NULL OR length(trim(coalesce(p_reason,'')))<2 OR length(p_reason)>500 THEN RAISE EXCEPTION 'INVALID_RESCHEDULE'; END IF;
  IF b.status<>'confirmed' OR b.attendance_status<>'not_arrived' THEN RAISE EXCEPTION 'RESCHEDULE_NOT_ALLOWED'; END IF;
  SELECT * INTO c FROM courts WHERE id=b.court_id FOR UPDATE;
  IF NOT c.allow_reschedule OR c.status<>'open' OR NOT EXISTS(SELECT 1 FROM branches WHERE id=b.branch_id AND status='active') THEN RAISE EXCEPTION 'RESCHEDULE_NOT_ALLOWED'; END IF;
  IF b.booking_date=p_date AND b.start_time=p_start THEN RETURN jsonb_build_object('date',p_date); END IF;
  IF b.booking_date+b.start_time-local_now < make_interval(hours=>c.reschedule_hours) OR p_date+p_start<=local_now OR p_date>local_now::date+c.advance_booking_days THEN RAISE EXCEPTION 'RESCHEDULE_DEADLINE'; END IF;
  finish:=p_date+p_start+(b.end_time-b.start_time);
  IF p_start<c.open_time OR finish>p_date+c.close_time OR mod(extract(epoch FROM (p_start-c.open_time))::numeric,3600)<>0 OR mod(extract(epoch FROM (b.end_time-b.start_time))::numeric,3600)<>0 THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
  IF EXISTS(SELECT 1 FROM block_schedules WHERE court_id=b.court_id AND block_date=p_date AND start_time<finish::time AND end_time>p_start) THEN RAISE EXCEPTION 'SLOT_BLOCKED'; END IF;
  slot:=p_date+p_start;
  WHILE slot<finish LOOP
    gross:=gross+CASE WHEN EXISTS(SELECT 1 FROM court_peak_windows WHERE court_id=b.court_id AND day_of_week=extract(dow FROM p_date) AND start_time<(slot+interval '1 hour')::time AND end_time>slot::time) THEN coalesce(c.price_peak,c.price_standard) ELSE c.price_standard END;
    slot:=slot+interval '1 hour';
  END LOOP;
  IF gross<>b.total_price+b.discount_amount THEN RAISE EXCEPTION 'RESCHEDULE_PRICE_CHANGED'; END IF;
  UPDATE bookings SET booking_date=p_date,start_time=p_start,end_time=finish::time WHERE id=b.id;
  -- Existing no_double_booking exclusion rejects concurrent occupied-slot moves.
  INSERT INTO booking_operation_events(tenant_id,booking_id,actor_id,action,detail) VALUES(b.tenant_id,b.id,p_actor_id,'reschedule',jsonb_build_object('old_date',b.booking_date,'old_start',b.start_time,'date',p_date,'start',p_start,'reason',trim(p_reason)));
  RETURN jsonb_build_object('date',p_date);
END $$;
REVOKE ALL ON FUNCTION public.reschedule_booking(uuid,uuid,uuid,date,time,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(uuid,uuid,uuid,date,time,text) TO service_role;

-- Serialize block creation with rescheduling on the same court, so the block
-- cannot appear between the reschedule availability check and its UPDATE.
CREATE FUNCTION public.guard_booking_block() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM 1 FROM courts WHERE id=NEW.court_id AND tenant_id=NEW.tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COURT_NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM bookings WHERE court_id=NEW.court_id AND booking_date=NEW.block_date
    AND status IN ('pending_payment','awaiting_verification','confirmed','awaiting_refund')
    AND start_time<NEW.end_time AND end_time>NEW.start_time) THEN RAISE EXCEPTION 'BLOCK_OVERLAPS_BOOKING'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_block_guard BEFORE INSERT OR UPDATE OF court_id,block_date,start_time,end_time
ON public.block_schedules FOR EACH ROW EXECUTE FUNCTION public.guard_booking_block();
REVOKE ALL ON FUNCTION public.guard_booking_block() FROM PUBLIC,anon,authenticated;
