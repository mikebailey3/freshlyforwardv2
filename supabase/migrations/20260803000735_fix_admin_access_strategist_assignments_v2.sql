
-- Drop the broken admin policy
DROP POLICY IF EXISTS "select_all_assignments_admin" ON strategist_assignments;

-- Allow admins to read all strategist assignments using JWT app_metadata
CREATE POLICY "select_all_assignments_admin"
  ON strategist_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
