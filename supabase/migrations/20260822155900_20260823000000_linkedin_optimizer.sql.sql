CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url text,
  target_role text,
  headline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  experience_bullets text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE linkedin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_linkedin_profile" ON linkedin_profiles;
CREATE POLICY "select_own_linkedin_profile"
  ON linkedin_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = linkedin_profiles.member_id
      AND strategist_assignments.is_active = true
    )
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "insert_own_linkedin_profile" ON linkedin_profiles;
CREATE POLICY "insert_own_linkedin_profile"
  ON linkedin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "update_own_linkedin_profile" ON linkedin_profiles;
CREATE POLICY "update_own_linkedin_profile"
  ON linkedin_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.uid() = member_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "delete_own_linkedin_profile" ON linkedin_profiles;
CREATE POLICY "delete_own_linkedin_profile"
  ON linkedin_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = member_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE OR REPLACE FUNCTION update_linkedin_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_linkedin_profiles_updated_at ON linkedin_profiles;
CREATE TRIGGER trg_linkedin_profiles_updated_at
  BEFORE UPDATE ON linkedin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_profiles_updated_at();