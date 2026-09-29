-- Integrate coach appointments with the facility court-booking source of truth.
-- Apply after 20260914000000_booking_operations.sql.

ALTER TABLE public.coach_bookings
  ADD COLUMN court_booking_id uuid REFERENCES public.bookings(id) ON DELETE RESTRICT,
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT,
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD COLUMN court_id uuid REFERENCES public.courts(id) ON DELETE RESTRICT,
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN started_at timestamptz;

CREATE UNIQUE INDEX coach_booking_one_per_court_booking_idx
  ON public.coach_bookings(court_booking_id) WHERE court_booking_id IS NOT NULL
    AND status IN ('requested','accepted','confirmed','in_progress');
CREATE INDEX coach_booking_facility_day_idx
  ON public.coach_bookings(tenant_id,branch_id,booking_date,start_time)
  WHERE court_booking_id IS NOT NULL;

ALTER TABLE public.coach_bookings
  ADD COLUMN booking_range tsrange GENERATED ALWAYS AS
    (tsrange((booking_date+start_time)::timestamp,(booking_date+end_time)::timestamp,'[)')) STORED;

CREATE INDEX coach_booking_coach_range_idx ON public.coach_bookings USING gist(coach_profile_id,booking_range);
CREATE INDEX coach_booking_player_range_idx ON public.coach_bookings USING gist(player_profile_id,booking_range);

CREATE OR REPLACE FUNCTION public.create_linked_coach_booking(
  p_player_id uuid,p_coach_id uuid,p_service_id uuid,p_court_booking_id uuid,p_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; c public.courts; cp public.coach_profiles; s public.coach_services;
  coach_end time; new_id uuid; dow int;
BEGIN
  SELECT * INTO b FROM bookings WHERE id=p_court_booking_id FOR UPDATE;
  IF NOT FOUND OR b.status<>'confirmed' OR b.attendance_status<>'not_arrived' THEN RAISE EXCEPTION 'COURT_BOOKING_NOT_CONFIRMED'; END IF;
  IF b.profile_id IS DISTINCT FROM p_player_id AND NOT EXISTS(
    SELECT 1 FROM members m WHERE m.id=b.member_id AND m.profile_id=p_player_id
  ) THEN RAISE EXCEPTION 'COURT_BOOKING_NOT_OWNED'; END IF;
  IF (b.booking_date+b.start_time) AT TIME ZONE 'Asia/Bangkok' <= now() THEN RAISE EXCEPTION 'COURT_BOOKING_STARTED'; END IF;
  SELECT * INTO cp FROM coach_profiles WHERE id=p_coach_id AND approval_status='approved' AND is_visible=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_UNAVAILABLE'; END IF;
  SELECT * INTO s FROM coach_services WHERE id=p_service_id AND coach_profile_id=p_coach_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERVICE_UNAVAILABLE'; END IF;
  coach_end := b.start_time + make_interval(mins=>s.duration_minutes);
  IF coach_end>b.end_time THEN RAISE EXCEPTION 'COURT_BOOKING_TOO_SHORT'; END IF;
  -- Serialize all new requests for this coach and player on this date, then re-check overlap.
  PERFORM pg_advisory_xact_lock(hashtextextended('coach:'||p_coach_id::text||':'||b.booking_date::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('player:'||p_player_id::text||':'||b.booking_date::text,0));
  IF EXISTS(SELECT 1 FROM coach_bookings WHERE coach_profile_id=p_coach_id AND booking_date=b.booking_date
    AND status IN ('requested','accepted','confirmed','in_progress') AND start_time<coach_end AND end_time>b.start_time)
    OR EXISTS(SELECT 1 FROM coach_bookings WHERE player_profile_id=p_player_id AND booking_date=b.booking_date
    AND status IN ('requested','accepted','confirmed','in_progress') AND start_time<coach_end AND end_time>b.start_time)
  THEN RAISE EXCEPTION 'COACH_SLOT_CONFLICT'; END IF;
  dow:=extract(dow FROM b.booking_date);
  IF EXISTS(SELECT 1 FROM coach_schedules WHERE coach_profile_id=p_coach_id AND is_available=true)
    AND NOT EXISTS(SELECT 1 FROM coach_schedules WHERE coach_profile_id=p_coach_id AND day_of_week=dow
      AND is_available=true AND start_time<=b.start_time AND end_time>=coach_end)
  THEN RAISE EXCEPTION 'OUTSIDE_COACH_SCHEDULE'; END IF;
  SELECT * INTO c FROM courts WHERE id=b.court_id;
  INSERT INTO coach_bookings(coach_profile_id,player_profile_id,service_id,booking_date,start_time,end_time,
    location_note,total_price,status,player_note,court_booking_id,tenant_id,branch_id,court_id)
  VALUES(p_coach_id,p_player_id,p_service_id,b.booking_date,b.start_time,coach_end,
    c.name,s.price,'requested',nullif(trim(p_note),''),b.id,b.tenant_id,b.branch_id,b.court_id)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('id',new_id,'status','requested');
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'COACH_SLOT_CONFLICT';
END $$;

CREATE OR REPLACE FUNCTION public.respond_coach_booking(
  p_actor_id uuid,p_booking_id uuid,p_action text,p_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cb public.coach_bookings; b public.bookings;
BEGIN
  SELECT cb0.* INTO cb FROM coach_bookings cb0 JOIN coach_profiles cp ON cp.id=cb0.coach_profile_id
    WHERE cb0.id=p_booking_id AND cp.profile_id=p_actor_id FOR UPDATE OF cb0;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_BOOKING_NOT_FOUND'; END IF;
  IF cb.status<>'requested' OR p_action NOT IN ('accept','reject') THEN RAISE EXCEPTION 'COACH_BOOKING_STATE_CHANGED'; END IF;
  IF p_action='accept' THEN
    SELECT * INTO b FROM bookings WHERE id=cb.court_booking_id FOR UPDATE;
    IF NOT FOUND OR b.status<>'confirmed' OR b.booking_date<>cb.booking_date OR b.start_time>cb.start_time OR b.end_time<cb.end_time THEN
      RAISE EXCEPTION 'COURT_BOOKING_CHANGED';
    END IF;
    UPDATE coach_bookings SET status='accepted',accepted_at=now(),coach_note=nullif(trim(p_note),'') WHERE id=cb.id;
  ELSE
    UPDATE coach_bookings SET status='rejected',coach_note=nullif(trim(p_note),'') WHERE id=cb.id;
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN p_action='accept' THEN 'accepted' ELSE 'rejected' END);
END $$;

CREATE OR REPLACE FUNCTION public.advance_coach_booking(
  p_actor_id uuid,p_booking_id uuid,p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cb public.coach_bookings; local_now timestamp:=now() AT TIME ZONE 'Asia/Bangkok'; next_status coach_booking_status;
BEGIN
  SELECT cb0.* INTO cb FROM coach_bookings cb0 JOIN coach_profiles cp ON cp.id=cb0.coach_profile_id
    WHERE cb0.id=p_booking_id AND cp.profile_id=p_actor_id FOR UPDATE OF cb0;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_BOOKING_NOT_FOUND'; END IF;
  IF p_action='start' AND cb.status IN ('accepted','confirmed') AND local_now>=cb.booking_date+cb.start_time AND local_now<cb.booking_date+cb.end_time THEN next_status:='in_progress';
  ELSIF p_action='complete' AND cb.status='in_progress' THEN next_status:='completed';
  ELSE RAISE EXCEPTION 'COACH_BOOKING_STATE_CHANGED'; END IF;
  UPDATE coach_bookings SET status=next_status,
    started_at=CASE WHEN next_status='in_progress' THEN now() ELSE started_at END,
    completed_at=CASE WHEN next_status='completed' THEN now() ELSE completed_at END WHERE id=cb.id;
  RETURN jsonb_build_object('status',next_status);
END $$;

REVOKE ALL ON FUNCTION public.create_linked_coach_booking(uuid,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.respond_coach_booking(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.advance_coach_booking(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_linked_coach_booking(uuid,uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_coach_booking(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_coach_booking(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.platform_coach_booking_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_object_agg(coach_profile_id,jsonb_build_object(
    'active',active_count,'completed',completed_count,'linked',linked_count
  )),'{}'::jsonb) FROM (
    SELECT coach_profile_id,
      count(*) FILTER(WHERE status IN ('requested','accepted','confirmed','in_progress')) active_count,
      count(*) FILTER(WHERE status='completed') completed_count,
      count(*) FILTER(WHERE court_booking_id IS NOT NULL) linked_count
    FROM coach_bookings GROUP BY coach_profile_id
  ) x;
$$;
REVOKE ALL ON FUNCTION public.platform_coach_booking_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_coach_booking_summary() TO service_role;

CREATE OR REPLACE FUNCTION public.replace_coach_schedule(p_actor_id uuid,p_schedules jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE coach_id uuid; invalid_count int; row_count int;
BEGIN
  SELECT id INTO coach_id FROM coach_profiles WHERE profile_id=p_actor_id FOR UPDATE;
  IF NOT FOUND OR jsonb_typeof(p_schedules)<>'array' OR jsonb_array_length(p_schedules)>28 THEN RAISE EXCEPTION 'INVALID_SCHEDULE'; END IF;
  SELECT count(*) INTO invalid_count FROM jsonb_to_recordset(p_schedules) x(day_of_week int,start_time time,end_time time)
    WHERE day_of_week NOT BETWEEN 0 AND 6 OR start_time IS NULL OR end_time IS NULL OR end_time<=start_time;
  IF invalid_count>0 THEN RAISE EXCEPTION 'INVALID_SCHEDULE'; END IF;
  SELECT count(*) INTO row_count FROM jsonb_array_elements(p_schedules);
  IF row_count>0 AND EXISTS(SELECT 1 FROM coach_bookings cb WHERE cb.coach_profile_id=coach_id
    AND cb.status IN ('requested','accepted','confirmed','in_progress') AND cb.booking_date>=current_date
    AND NOT EXISTS(SELECT 1 FROM jsonb_to_recordset(p_schedules) x(day_of_week int,start_time time,end_time time)
      WHERE x.day_of_week=extract(dow FROM cb.booking_date) AND x.start_time<=cb.start_time AND x.end_time>=cb.end_time))
  THEN RAISE EXCEPTION 'SCHEDULE_CONFLICTS_BOOKING'; END IF;
  DELETE FROM coach_schedules WHERE coach_profile_id=coach_id;
  INSERT INTO coach_schedules(coach_profile_id,day_of_week,start_time,end_time,is_available)
    SELECT coach_id,x.day_of_week,x.start_time,x.end_time,true FROM jsonb_to_recordset(p_schedules) x(day_of_week int,start_time time,end_time time);
  RETURN jsonb_build_object('count',row_count);
END $$;
REVOKE ALL ON FUNCTION public.replace_coach_schedule(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_coach_schedule(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_player_coach_booking(p_actor_id uuid,p_booking_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cb public.coach_bookings;
BEGIN
  SELECT * INTO cb FROM coach_bookings WHERE id=p_booking_id AND player_profile_id=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_BOOKING_NOT_FOUND'; END IF;
  IF cb.status NOT IN ('requested','accepted','confirmed') OR (cb.booking_date+cb.start_time) AT TIME ZONE 'Asia/Bangkok'<=now() THEN RAISE EXCEPTION 'COACH_BOOKING_STATE_CHANGED'; END IF;
  UPDATE coach_bookings SET status='cancelled',cancelled_at=now(),cancel_reason=nullif(trim(p_reason),''),cancelled_by='player' WHERE id=cb.id;
  RETURN jsonb_build_object('status','cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_player_coach_booking(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_player_coach_booking(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_linked_coach_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cb public.coach_bookings; s public.coach_services; cp_end time; dow int;
BEGIN
  SELECT * INTO cb FROM coach_bookings WHERE court_booking_id=NEW.id
    AND status IN ('requested','accepted','confirmed','in_progress') FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.status IN ('rejected','cancelled','awaiting_refund','refunded') OR NEW.attendance_status='no_show' THEN
    UPDATE coach_bookings SET status='cancelled',cancelled_at=now(),
      cancel_reason=CASE WHEN NEW.attendance_status='no_show' THEN 'ผู้เรียนไม่มาตามนัดที่สนาม' ELSE 'รายการสนามถูกยกเลิกหรือเข้าสู่การคืนเงิน' END
      WHERE id=cb.id;
    RETURN NEW;
  END IF;
  IF NEW.booking_date IS DISTINCT FROM OLD.booking_date OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    SELECT * INTO s FROM coach_services WHERE id=cb.service_id;
    cp_end:=NEW.start_time+make_interval(mins=>s.duration_minutes);dow:=extract(dow FROM NEW.booking_date);
    IF cp_end>NEW.end_time OR (EXISTS(SELECT 1 FROM coach_schedules WHERE coach_profile_id=cb.coach_profile_id AND is_available=true)
      AND NOT EXISTS(SELECT 1 FROM coach_schedules WHERE coach_profile_id=cb.coach_profile_id AND day_of_week=dow AND is_available=true AND start_time<=NEW.start_time AND end_time>=cp_end))
      OR EXISTS(SELECT 1 FROM coach_bookings x WHERE x.id<>cb.id AND x.coach_profile_id=cb.coach_profile_id AND x.booking_date=NEW.booking_date
        AND x.status IN ('requested','accepted','confirmed','in_progress') AND x.start_time<cp_end AND x.end_time>NEW.start_time)
    THEN RAISE EXCEPTION 'LINKED_COACH_UNAVAILABLE'; END IF;
    UPDATE coach_bookings SET booking_date=NEW.booking_date,start_time=NEW.start_time,end_time=cp_end WHERE id=cb.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_linked_coach_booking ON public.bookings;
CREATE TRIGGER trg_sync_linked_coach_booking AFTER UPDATE OF status,attendance_status,booking_date,start_time,end_time
ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.sync_linked_coach_booking();
REVOKE ALL ON FUNCTION public.sync_linked_coach_booking() FROM PUBLIC,anon,authenticated;

-- Facility staff can see coach appointments only for court bookings in their tenant/assigned branches.
DROP POLICY IF EXISTS coach_bookings_facility_staff ON public.coach_bookings;
CREATE POLICY coach_bookings_facility_staff ON public.coach_bookings FOR SELECT USING (
  tenant_id=auth_tenant_id() AND (
    auth_role()='venue_admin' OR EXISTS(
      SELECT 1 FROM staff s LEFT JOIN staff_branches sb ON sb.staff_id=s.id
      WHERE s.profile_id=auth.uid() AND s.status='active'
        AND (s.multi_branch_access OR sb.branch_id=coach_bookings.branch_id)
    )
  )
);
