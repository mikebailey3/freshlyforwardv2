/*
# Admin Strategist Assignment

## Overview
Closes a real gap: there was no way for an admin to assign a member to a
strategist. The "Members" page under /strategist/members only ever shows
members with a row in strategist_assignments pointing at the logged-in
strategist -- and nothing in the app could create that row except a member
signing up (via enroll_member_with_random_strategist, which assigns
randomly) or a strategist self-assigning to their own account (the unused
assignStrategist() helper, gated to auth.uid() = strategist_id). An admin
had no path at all: strategist_assignments RLS only permitted the
strategist themselves to insert/update/delete their own assignment rows.

## What this adds
1. Admin-bypass RLS policies on strategist_assignments (select/insert/
   update/delete), so admins can manage assignments directly if needed.
2. `admin_assign_strategist(p_member_id, p_strategist_id)` -- SECURITY
   DEFINER, admin-gated. Deactivates any existing active assignment for
   the member, activates/creates the new one, and -- mirroring
   enroll_member_with_random_strategist -- starts the conversation thread
   with a welcome message + notification if one doesn't already exist
   between that member and strategist. Also notifies the strategist.
3. `admin_list_strategists()` -- SECURITY DEFINER, admin-gated. Returns
   every eligible strategist (admins + members flagged is_strategist) so
   the admin UI has a dropdown of who to assign.
4. `admin_list_members()` is extended to also return the member's current
   strategist_id/strategist_name, so the All Members page can show it
   without an extra round trip per row.
*/

-- ============================================================
-- 1. ADMIN-BYPASS RLS ON STRATEGIST_ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_own_assignments_member" ON strategist_assignments;
CREATE POLICY "select_own_assignments_member"
  ON strategist_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() = strategist_id
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "insert_assignments_admin" ON strategist_assignments;
CREATE POLICY "insert_assignments_admin"
  ON strategist_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "update_assignments_admin" ON strategist_assignments;
CREATE POLICY "update_assignments_admin"
  ON strategist_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = strategist_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.uid() = strategist_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "delete_assignments_admin" ON strategist_assignments;
CREATE POLICY "delete_assignments_admin"
  ON strategist_assignments FOR DELETE
  TO authenticated
  USING (auth.uid() = strategist_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- 2. ADMIN_ASSIGN_STRATEGIST (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_assign_strategist(p_member_id uuid, p_strategist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_name text;
  v_strategist_name text;
  v_conversation_id uuid;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an admin can assign a strategist to a member';
  END IF;

  IF p_member_id = p_strategist_id THEN
    RAISE EXCEPTION 'A member cannot be assigned as their own strategist';
  END IF;

  -- Deactivate any other active assignment(s) for this member -- a member
  -- has exactly one active strategist at a time.
  UPDATE strategist_assignments
  SET is_active = false
  WHERE member_id = p_member_id AND is_active = true AND strategist_id <> p_strategist_id;

  INSERT INTO strategist_assignments (strategist_id, member_id, is_active, assigned_at)
  VALUES (p_strategist_id, p_member_id, true, now())
  ON CONFLICT (strategist_id, member_id) DO UPDATE SET is_active = true, assigned_at = now();

  SELECT COALESCE(mp.full_name, split_part(au.email, '@', 1), 'there')
  INTO v_member_name
  FROM auth.users au
  LEFT JOIN member_profiles mp ON mp.user_id = au.id
  WHERE au.id = p_member_id;

  SELECT COALESCE(mp.full_name, split_part(au.email, '@', 1), 'Your Strategist')
  INTO v_strategist_name
  FROM auth.users au
  LEFT JOIN member_profiles mp ON mp.user_id = au.id
  WHERE au.id = p_strategist_id;

  INSERT INTO notifications (user_id, notification_type, title, body, link)
  VALUES (
    p_strategist_id,
    'member_assigned',
    'New Member Assigned',
    format('%s has been assigned to you as a strategist.', v_member_name),
    '/strategist/members'
  );

  -- Start (or surface) the conversation thread, same welcome pattern as
  -- signup-time enrollment, but only if these two have never talked.
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.member_id = p_member_id AND c.strategist_id = p_strategist_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (member_id, strategist_id, last_message_at)
    VALUES (p_member_id, p_strategist_id, now())
    RETURNING id INTO v_conversation_id;

    INSERT INTO messages (user_id, conversation_id, sender_type, body, is_read)
    VALUES (
      p_member_id,
      v_conversation_id,
      'strategist',
      format(
        'Hi %s! I''m %s, your Career Strategist here at FreshlyForward. I''m looking forward to working with you -- feel free to message me here anytime!',
        v_member_name,
        v_strategist_name
      ),
      false
    );

    INSERT INTO notifications (user_id, notification_type, title, body, link)
    VALUES (
      p_member_id,
      'strategist_assigned',
      'You''ve been matched with a Career Strategist',
      format('%s is your new Career Strategist and just sent you a welcome message.', v_strategist_name),
      '/messages'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_assign_strategist(uuid, uuid) TO authenticated;

-- ============================================================
-- 3. ADMIN_LIST_STRATEGISTS (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_strategists()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  is_admin boolean,
  active_member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    candidates.id,
    COALESCE(mp.full_name, split_part(au.email, '@', 1)),
    au.email::text,
    candidates.is_admin,
    COALESCE((
      SELECT count(*) FROM strategist_assignments sa
      WHERE sa.strategist_id = candidates.id AND sa.is_active = true
    ), 0)
  FROM (
    SELECT id, true AS is_admin FROM auth.users
    WHERE raw_app_meta_data ->> 'role' = 'admin'
    UNION
    SELECT user_id, false AS is_admin FROM member_profiles WHERE is_strategist = true
  ) candidates
  JOIN auth.users au ON au.id = candidates.id
  LEFT JOIN member_profiles mp ON mp.user_id = candidates.id
  ORDER BY 2;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_strategists() TO authenticated;

-- ============================================================
-- 4. ADMIN_LIST_MEMBERS -- surface current strategist assignment
-- ============================================================
DROP FUNCTION IF EXISTS admin_list_members();
CREATE FUNCTION admin_list_members()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  headline text,
  plan_id uuid,
  plan_name text,
  subscription_status text,
  account_status text,
  account_status_reason text,
  onboarding_completed boolean,
  search_readiness_score integer,
  is_strategist boolean,
  strategist_id uuid,
  strategist_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    mp.user_id,
    au.email::text,
    mp.full_name,
    mp.headline,
    mp.plan_id,
    plans.name,
    mp.subscription_status,
    mp.account_status,
    mp.account_status_reason,
    mp.onboarding_completed,
    mp.search_readiness_score,
    mp.is_strategist,
    sa.strategist_id,
    COALESCE(strategist_mp.full_name, split_part(strategist_au.email, '@', 1)),
    mp.created_at
  FROM member_profiles mp
  JOIN auth.users au ON au.id = mp.user_id
  LEFT JOIN membership_plans plans ON plans.id = mp.plan_id
  LEFT JOIN LATERAL (
    SELECT s.strategist_id FROM strategist_assignments s
    WHERE s.member_id = mp.user_id AND s.is_active = true
    ORDER BY s.assigned_at DESC LIMIT 1
  ) sa ON true
  LEFT JOIN auth.users strategist_au ON strategist_au.id = sa.strategist_id
  LEFT JOIN member_profiles strategist_mp ON strategist_mp.user_id = sa.strategist_id
  ORDER BY mp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_members() TO authenticated;
