/*
# Strategist Enrollment
*/

-- ============================================================
-- IS_STRATEGIST FLAG
-- ============================================================
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS is_strategist boolean NOT NULL DEFAULT false;

UPDATE member_profiles mp
SET is_strategist = true
WHERE mp.is_strategist = false
  AND EXISTS (
    SELECT 1 FROM strategist_assignments sa
    WHERE sa.strategist_id = mp.user_id AND sa.is_active = true
  );

CREATE INDEX IF NOT EXISTS idx_member_profiles_is_strategist ON member_profiles(is_strategist) WHERE is_strategist = true;

-- ============================================================
-- ENROLL_MEMBER_WITH_RANDOM_STRATEGIST (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION enroll_member_with_random_strategist(p_member_id uuid, p_member_name text DEFAULT NULL)
RETURNS TABLE (strategist_id uuid, strategist_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean := (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
  v_chosen uuid;
  v_chosen_name text;
  v_conversation_id uuid;
  v_display_name text := COALESCE(NULLIF(trim(p_member_name), ''), 'there');
BEGIN
  IF auth.uid() IS DISTINCT FROM p_member_id AND NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Not authorized to enroll this member';
  END IF;

  SELECT sa.strategist_id INTO v_chosen
  FROM strategist_assignments sa
  WHERE sa.member_id = p_member_id AND sa.is_active = true
  ORDER BY sa.assigned_at DESC
  LIMIT 1;

  IF v_chosen IS NULL THEN
    SELECT id INTO v_chosen
    FROM (
      SELECT au.id FROM auth.users au
      WHERE au.raw_app_meta_data ->> 'role' = 'admin' AND au.id <> p_member_id
      UNION
      SELECT mp.user_id FROM member_profiles mp
      WHERE mp.is_strategist = true AND mp.user_id <> p_member_id
    ) candidates
    ORDER BY random()
    LIMIT 1;

    IF v_chosen IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO strategist_assignments (strategist_id, member_id, is_active)
    VALUES (v_chosen, p_member_id, true)
    ON CONFLICT (strategist_id, member_id) DO UPDATE SET is_active = true;
  END IF;

  SELECT COALESCE(mp.full_name, split_part(au.email, '@', 1), 'Your Strategist')
  INTO v_chosen_name
  FROM auth.users au
  LEFT JOIN member_profiles mp ON mp.user_id = au.id
  WHERE au.id = v_chosen;

  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.member_id = p_member_id AND c.strategist_id = v_chosen
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (member_id, strategist_id, last_message_at)
    VALUES (p_member_id, v_chosen, now())
    RETURNING id INTO v_conversation_id;

    INSERT INTO messages (user_id, conversation_id, sender_type, body, is_read)
    VALUES (
      p_member_id,
      v_conversation_id,
      'strategist',
      format(
        'Hi %s! Welcome to FreshlyForward — I''m %s, and I''ll be your dedicated Career Strategist. I''m excited to help guide your job search every step of the way. Feel free to message me here anytime!',
        v_display_name,
        v_chosen_name
      ),
      false
    );

    INSERT INTO notifications (user_id, notification_type, title, body, link)
    VALUES (
      p_member_id,
      'strategist_assigned',
      'You''ve been matched with a Career Strategist',
      format('%s is your new Career Strategist and just sent you a welcome message.', v_chosen_name),
      '/messages'
    );
  END IF;

  RETURN QUERY SELECT v_chosen, v_chosen_name;
END;
$$;

GRANT EXECUTE ON FUNCTION enroll_member_with_random_strategist(uuid, text) TO authenticated;

-- ============================================================
-- GET_MY_STRATEGIST (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_strategist()
RETURNS TABLE (strategist_id uuid, strategist_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sa.strategist_id, COALESCE(mp.full_name, split_part(au.email, '@', 1), 'Your Strategist')
  FROM strategist_assignments sa
  LEFT JOIN member_profiles mp ON mp.user_id = sa.strategist_id
  LEFT JOIN auth.users au ON au.id = sa.strategist_id
  WHERE sa.member_id = auth.uid() AND sa.is_active = true
  ORDER BY sa.assigned_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_strategist() TO authenticated;

-- ============================================================
-- ADMIN_LIST_MEMBERS — add is_strategist to the directory
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
    mp.created_at
  FROM member_profiles mp
  JOIN auth.users au ON au.id = mp.user_id
  LEFT JOIN membership_plans plans ON plans.id = mp.plan_id
  ORDER BY mp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_members() TO authenticated;