
-- Allow admins to read all strategist assignments
CREATE POLICY "select_all_assignments_admin"
  ON strategist_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IN (
      SELECT au.id FROM auth.users au
      WHERE au.raw_app_meta_data->>'role' = 'admin'
    ))
  );
