-- Organizer memberships: facility owners organize by default; general users
-- need an active monthly add-on. This migration also closes permissive group
-- session policies shipped by the original queue prototype.

DO $$ BEGIN
  CREATE TYPE organizer_plan_code AS ENUM ('group_host', 'tournament_host', 'organizer_pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE organizer_subscription_status AS ENUM ('pending', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE organizer_order_status AS ENUM ('awaiting_verification', 'paid', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.organizer_plans (
  code organizer_plan_code PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  price_satang integer NOT NULL CHECK (price_satang >= 0),
  can_manage_groups boolean NOT NULL DEFAULT false,
  can_manage_tournaments boolean NOT NULL DEFAULT false,
  badge_label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.organizer_plans
  (code, name, description, price_satang, can_manage_groups, can_manage_tournaments, badge_label)
VALUES
  ('group_host', 'ผู้จัดก๊วน', 'สร้างและบริหารก๊วนกีฬาได้ไม่จำกัดตลอดรอบสมาชิก', 14900, true, false, 'ผู้จัดก๊วน'),
  ('tournament_host', 'ผู้จัดทัวร์นาเมนต์', 'สร้างและบริหารทัวร์นาเมนต์พร้อมสายการแข่งขัน', 29900, false, true, 'ผู้จัดการแข่งขัน'),
  ('organizer_pro', 'Organizer Pro', 'จัดก๊วนและทัวร์นาเมนต์ พร้อมป้ายยืนยันระดับ Pro', 39900, true, true, 'Organizer Pro')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_satang = EXCLUDED.price_satang,
  can_manage_groups = EXCLUDED.can_manage_groups,
  can_manage_tournaments = EXCLUDED.can_manage_tournaments,
  badge_label = EXCLUDED.badge_label,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.organizer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code organizer_plan_code NOT NULL REFERENCES public.organizer_plans(code),
  status organizer_subscription_status NOT NULL DEFAULT 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  activated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start)
);

CREATE TABLE IF NOT EXISTS public.organizer_subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code organizer_plan_code NOT NULL REFERENCES public.organizer_plans(code),
  amount_satang integer NOT NULL CHECK (amount_satang > 0),
  status organizer_order_status NOT NULL DEFAULT 'awaiting_verification',
  sender_name text NOT NULL,
  transfer_at timestamptz NOT NULL,
  payment_reference text,
  slip_path text,
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizer_orders_review_idx
  ON public.organizer_subscription_orders(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS organizer_orders_one_pending_idx
  ON public.organizer_subscription_orders(profile_id)
  WHERE status = 'awaiting_verification';
CREATE INDEX IF NOT EXISTS organizer_subscriptions_expiry_idx
  ON public.organizer_subscriptions(status, current_period_end);

CREATE OR REPLACE FUNCTION public.review_organizer_order(
  p_order_id uuid,
  p_decision text,
  p_note text,
  p_reviewer uuid
)
RETURNS TABLE (
  profile_id uuid,
  plan_code organizer_plan_code,
  order_status organizer_order_status,
  current_period_end timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order organizer_subscription_orders%ROWTYPE;
  v_existing_end timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_reviewer AND role = 'super_admin' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;

  SELECT * INTO v_order
  FROM organizer_subscription_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_order.status <> 'awaiting_verification' THEN
    RAISE EXCEPTION 'order already reviewed';
  END IF;

  IF p_decision = 'reject' THEN
    UPDATE organizer_subscription_orders
    SET status = 'rejected',
        review_note = COALESCE(NULLIF(trim(p_note), ''), 'หลักฐานไม่ผ่านการตรวจสอบ'),
        reviewed_by = p_reviewer,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

    RETURN QUERY SELECT v_order.profile_id, v_order.plan_code,
      'rejected'::organizer_order_status, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_order.slip_path IS NULL THEN
    RAISE EXCEPTION 'payment slip is required';
  END IF;

  SELECT os.current_period_end INTO v_existing_end
  FROM organizer_subscriptions os
  WHERE os.profile_id = v_order.profile_id
  FOR UPDATE;

  v_period_start := GREATEST(now(), COALESCE(v_existing_end, now()));
  v_period_end := v_period_start + interval '1 month';

  INSERT INTO organizer_subscriptions (
    profile_id, plan_code, status, current_period_start, current_period_end,
    activated_by, updated_at
  ) VALUES (
    v_order.profile_id, v_order.plan_code, 'active', v_period_start, v_period_end,
    p_reviewer, now()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    activated_by = EXCLUDED.activated_by,
    updated_at = now();

  UPDATE organizer_subscription_orders
  SET status = 'paid',
      review_note = NULLIF(trim(p_note), ''),
      reviewed_by = p_reviewer,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN QUERY SELECT v_order.profile_id, v_order.plan_code,
    'paid'::organizer_order_status, v_period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.review_organizer_order(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_organizer_order(uuid, text, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.join_community_group(p_group_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group groups%ROWTYPE;
  v_member_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND is_active = true) THEN
    RAISE EXCEPTION 'inactive profile';
  END IF;

  SELECT * INTO v_group FROM groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'group not found'; END IF;
  IF v_group.status <> 'open' OR v_group.play_date < current_date THEN
    RAISE EXCEPTION 'group is not open';
  END IF;
  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND profile_id = p_profile_id) THEN
    RAISE EXCEPTION 'already joined';
  END IF;

  SELECT count(*)::integer INTO v_member_count FROM group_members WHERE group_id = p_group_id;
  IF v_member_count >= v_group.max_players THEN
    UPDATE groups SET current_players = v_member_count, status = 'full', updated_at = now()
    WHERE id = p_group_id;
    RAISE EXCEPTION 'group is full';
  END IF;

  INSERT INTO group_members(group_id, profile_id, is_creator)
  VALUES (p_group_id, p_profile_id, false);
  v_member_count := v_member_count + 1;
  UPDATE groups
  SET current_players = v_member_count,
      status = CASE WHEN v_member_count >= max_players THEN 'full'::group_status ELSE 'open'::group_status END,
      updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_community_group(p_group_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group groups%ROWTYPE;
  v_is_creator boolean;
  v_member_count integer;
BEGIN
  SELECT * INTO v_group FROM groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'group not found'; END IF;

  SELECT is_creator INTO v_is_creator FROM group_members
  WHERE group_id = p_group_id AND profile_id = p_profile_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not a member'; END IF;
  IF v_is_creator THEN RAISE EXCEPTION 'creator cannot leave'; END IF;

  DELETE FROM group_members WHERE group_id = p_group_id AND profile_id = p_profile_id;
  SELECT count(*)::integer INTO v_member_count FROM group_members WHERE group_id = p_group_id;
  UPDATE groups
  SET current_players = v_member_count,
      status = CASE WHEN status = 'full' THEN 'open'::group_status ELSE status END,
      updated_at = now()
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_community_group(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_community_group(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_community_group(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_community_group(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.has_organizer_entitlement(p_profile_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = p_profile_id
      AND p.is_active = true
      AND (
        p.role = 'super_admin'
        OR (p.role = 'venue_admin' AND t.status IN ('active','trial','free'))
        OR EXISTS (
          SELECT 1
          FROM organizer_subscriptions os
          JOIN organizer_plans op ON op.code = os.plan_code
          WHERE os.profile_id = p.id
            AND os.status = 'active'
            AND os.current_period_end > now()
            AND op.is_active = true
            AND CASE p_feature
              WHEN 'groups' THEN op.can_manage_groups
              WHEN 'tournaments' THEN op.can_manage_tournaments
              ELSE false
            END
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_organizer_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organizer_entitlement(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.organizer_badges
WITH (security_invoker = false) AS
  SELECT p.id AS profile_id, 'facility_owner'::text AS badge_type,
         'เจ้าของสนาม'::text AS label, 10 AS priority, NULL::timestamptz AS valid_until
  FROM profiles p JOIN tenants t ON t.id = p.tenant_id
  WHERE p.role = 'venue_admin' AND p.is_active = true AND t.status IN ('active','trial','free')
  UNION ALL
  SELECT os.profile_id,
         CASE os.plan_code
           WHEN 'group_host' THEN 'group_host'
           WHEN 'tournament_host' THEN 'tournament_host'
           ELSE 'organizer_pro'
         END,
         op.badge_label, 20, os.current_period_end
  FROM organizer_subscriptions os
  JOIN organizer_plans op ON op.code = os.plan_code
  WHERE os.status = 'active' AND os.current_period_end > now() AND op.is_active = true
  UNION ALL
  SELECT cp.profile_id, 'verified_coach', 'โค้ชยืนยันแล้ว', 30, NULL::timestamptz
  FROM coach_profiles cp
  WHERE cp.approval_status = 'approved' AND cp.is_visible = true;

GRANT SELECT ON public.organizer_badges TO anon, authenticated, service_role;

ALTER TABLE public.organizer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_subscription_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizer_plans_public_read ON public.organizer_plans;
CREATE POLICY organizer_plans_public_read ON public.organizer_plans FOR SELECT USING (is_active = true OR is_super_admin());
DROP POLICY IF EXISTS organizer_subscriptions_self_read ON public.organizer_subscriptions;
CREATE POLICY organizer_subscriptions_self_read ON public.organizer_subscriptions FOR SELECT USING (profile_id = auth.uid() OR is_super_admin());
DROP POLICY IF EXISTS organizer_orders_self_read ON public.organizer_subscription_orders;
CREATE POLICY organizer_orders_self_read ON public.organizer_subscription_orders FOR SELECT USING (profile_id = auth.uid() OR is_super_admin());

-- Independent paid organizers do not need to own a facility.
ALTER TABLE public.tournaments ALTER COLUMN tenant_id DROP NOT NULL;

-- Community groups: public/member reads remain, but create/update/delete require
-- an active organizer entitlement and ownership.
DROP POLICY IF EXISTS groups_self ON public.groups;
DROP POLICY IF EXISTS groups_organizer_insert ON public.groups;
DROP POLICY IF EXISTS groups_organizer_update ON public.groups;
DROP POLICY IF EXISTS groups_organizer_delete ON public.groups;
CREATE POLICY groups_organizer_insert ON public.groups FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'groups'));
CREATE POLICY groups_organizer_update ON public.groups FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'groups'))
  WITH CHECK (creator_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'groups'));
CREATE POLICY groups_organizer_delete ON public.groups FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'groups'));

-- Membership changes run through the validated server actions so capacity,
-- creator rules, and cached player counts cannot be bypassed from the client.
DROP POLICY IF EXISTS group_members_insert ON public.group_members;
DROP POLICY IF EXISTS group_members_delete ON public.group_members;

-- Tournaments and children: organizer must still own the tournament and retain
-- the monthly entitlement. Facility owners qualify through the same function.
DROP POLICY IF EXISTS tournaments_admin ON public.tournaments;
DROP POLICY IF EXISTS tournaments_organizer ON public.tournaments;
DROP POLICY IF EXISTS tournaments_owner_manage ON public.tournaments;
CREATE POLICY tournaments_owner_manage ON public.tournaments FOR ALL TO authenticated
  USING (is_super_admin() OR (
    organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ))
  WITH CHECK (is_super_admin() OR (
    organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ));

DROP POLICY IF EXISTS tcats_admin ON public.tournament_categories;
DROP POLICY IF EXISTS tournament_categories_owner_manage ON public.tournament_categories;
CREATE POLICY tournament_categories_owner_manage ON public.tournament_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin());

DROP POLICY IF EXISTS teams_admin ON public.teams;
DROP POLICY IF EXISTS teams_owner_manage ON public.teams;
CREATE POLICY teams_owner_manage ON public.teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin());

DROP POLICY IF EXISTS registrations_admin ON public.tournament_registrations;
DROP POLICY IF EXISTS registrations_owner_manage ON public.tournament_registrations;
CREATE POLICY registrations_owner_manage ON public.tournament_registrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin());

DROP POLICY IF EXISTS matches_admin ON public.matches;
DROP POLICY IF EXISTS matches_owner_manage ON public.matches;
CREATE POLICY matches_owner_manage ON public.matches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid() AND has_organizer_entitlement(auth.uid(), 'tournaments')) OR is_super_admin());

-- Remove legacy direct-write policies. Registration and team membership are
-- created by validated server actions; organizers retain access through the
-- tournament ownership policies below.
DROP POLICY IF EXISTS registrations_self ON public.tournament_registrations;
DROP POLICY IF EXISTS team_members_self ON public.team_members;
DROP POLICY IF EXISTS team_members_owner_manage ON public.team_members;

CREATE POLICY team_members_owner_manage ON public.team_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id
    WHERE tm.id = team_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id
    WHERE tm.id = team_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin());

ALTER TABLE public.tournament_skill_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_score_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournament_skill_levels_public_read ON public.tournament_skill_levels;
CREATE POLICY tournament_skill_levels_public_read ON public.tournament_skill_levels
  FOR SELECT USING (true);
DROP POLICY IF EXISTS tournament_events_public_read ON public.tournament_events;
CREATE POLICY tournament_events_public_read ON public.tournament_events
  FOR SELECT USING (true);
DROP POLICY IF EXISTS tournament_event_groups_public_read ON public.tournament_event_groups;
CREATE POLICY tournament_event_groups_public_read ON public.tournament_event_groups
  FOR SELECT USING (true);
DROP POLICY IF EXISTS tournament_games_public_read ON public.tournament_games;
CREATE POLICY tournament_games_public_read ON public.tournament_games
  FOR SELECT USING (true);
DROP POLICY IF EXISTS tournament_score_events_public_read ON public.tournament_score_events;
CREATE POLICY tournament_score_events_public_read ON public.tournament_score_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tournament_events_owner_manage ON public.tournament_events;
CREATE POLICY tournament_events_owner_manage ON public.tournament_events FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tournaments t WHERE t.id = tournament_id
      AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t WHERE t.id = tournament_id
      AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin());

DROP POLICY IF EXISTS tournament_event_groups_owner_manage ON public.tournament_event_groups;
CREATE POLICY tournament_event_groups_owner_manage ON public.tournament_event_groups FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tournament_events e JOIN tournaments t ON t.id = e.tournament_id
    WHERE e.id = event_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournament_events e JOIN tournaments t ON t.id = e.tournament_id
    WHERE e.id = event_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin());

DROP POLICY IF EXISTS tournament_games_owner_manage ON public.tournament_games;
CREATE POLICY tournament_games_owner_manage ON public.tournament_games FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = match_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = match_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin());

DROP POLICY IF EXISTS tournament_score_events_owner_manage ON public.tournament_score_events;
CREATE POLICY tournament_score_events_owner_manage ON public.tournament_score_events FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tournament_games g
    JOIN matches m ON m.id = g.match_id
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE g.id = game_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournament_games g
    JOIN matches m ON m.id = g.match_id
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE g.id = game_id AND t.organizer_id = auth.uid()
      AND has_organizer_entitlement(auth.uid(), 'tournaments')
  ) OR is_super_admin());

-- Close the original queue prototype's public write policies. Public live-board
-- reads stay available, but only the facility owner can mutate official sessions.
DROP POLICY IF EXISTS group_sessions_staff_all ON public.group_sessions;
DROP POLICY IF EXISTS group_session_players_staff_all ON public.group_session_players;
DROP POLICY IF EXISTS group_session_matches_staff_all ON public.group_session_matches;
DROP POLICY IF EXISTS group_session_match_players_staff_all ON public.group_session_match_players;
DROP POLICY IF EXISTS group_sessions_owner_write ON public.group_sessions;
DROP POLICY IF EXISTS group_session_players_owner_write ON public.group_session_players;
DROP POLICY IF EXISTS group_session_matches_owner_write ON public.group_session_matches;
DROP POLICY IF EXISTS group_session_match_players_owner_write ON public.group_session_match_players;

CREATE POLICY group_sessions_owner_write ON public.group_sessions FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin')
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin');
CREATE POLICY group_session_players_owner_write ON public.group_session_players FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM group_sessions s WHERE s.id = session_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM group_sessions s WHERE s.id = session_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'));
CREATE POLICY group_session_matches_owner_write ON public.group_session_matches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM group_sessions s WHERE s.id = session_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM group_sessions s WHERE s.id = session_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'));
CREATE POLICY group_session_match_players_owner_write ON public.group_session_match_players FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_session_matches m JOIN group_sessions s ON s.id = m.session_id
    WHERE m.id = match_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_session_matches m JOIN group_sessions s ON s.id = m.session_id
    WHERE m.id = match_id AND s.tenant_id = auth_tenant_id() AND auth_role() = 'venue_admin'
  ));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('organizer-slips', 'organizer-slips', false, 4194304, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
