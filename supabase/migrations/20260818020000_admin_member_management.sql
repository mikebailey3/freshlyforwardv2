/*
# Admin Member Management

## Overview
Adds the database support needed for full admin control over members:
- Account status (active / suspended / banned) so admins can restrict
  access without deleting a member's data.
- RLS policies granting admins full read/write access to all member
  profiles (previously only the owning member could read their own row,
  which also silently broke the existing Strategist "Assigned Members"
  list — fixed here too).
- A SECURITY DEFINER function, `admin_list_members`, that returns a
  directory of every member (including their auth email, which the
  client cannot query directly) for the new Admin Members page.

## Security
- All new policies/functions gate on `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`,
  matching the existing admin-check convention used throughout the schema.
- Strategists keep read-only access limited to members assigned to them
  via `strategist_assignments`.
*/

-- ============================================================
-- ACCOUNT STATUS COLUMNS
-- ============================================================
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS account_status_reason text;
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS account_status_changed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'member_profiles_account_status_check'
  ) THEN
    ALTER TABLE member_profiles
      ADD CONSTRAINT member_profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'banned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_member_profiles_account_status ON member_profiles(account_status);

-- ============================================================
-- RLS: ADMIN FULL ACCESS TO ALL MEMBER PROFILES
-- ============================================================
DROP POLICY IF EXISTS "admin_select_all_profiles" ON member_profiles;
CREATE POLICY "admin_select_all_profiles"
  ON member_profiles FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "admin_update_all_profiles" ON member_profiles;
CREATE POLICY "admin_update_all_profiles"
  ON member_profiles FOR UPDATE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- RLS: STRATEGISTS CAN READ THEIR ASSIGNED MEMBERS' PROFILES
-- (Fixes a pre-existing gap — StrategistMembersPage / member workspace
-- pages query member_profiles for assigned members but no policy
-- previously allowed it.)
-- ============================================================
DROP POLICY IF EXISTS "strategist_select_assigned_profiles" ON member_profiles;
CREATE POLICY "strategist_select_assigned_profiles"
  ON member_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategist_assignments sa
      WHERE sa.member_id = member_profiles.user_id
        AND sa.strategist_id = auth.uid()
        AND sa.is_active = true
    )
  );

-- ============================================================
-- ADMIN_LIST_MEMBERS (SECURITY DEFINER)
-- Returns every member with their auth email joined in, since the
-- client cannot query auth.users directly. Admin-only.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_members()
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
    mp.created_at
  FROM member_profiles mp
  JOIN auth.users au ON au.id = mp.user_id
  LEFT JOIN membership_plans plans ON plans.id = mp.plan_id
  ORDER BY mp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_members() TO authenticated;
