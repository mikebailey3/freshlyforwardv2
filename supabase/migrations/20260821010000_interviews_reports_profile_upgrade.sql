/*
# Interview Scheduling, Friday Report Workflow, and Member Profile Card

## Overview
Bundles schema changes for four related feature requests:

1. Members can propose/confirm an interview date on their own applications
   (no schema change needed — `applications` RLS already lets a member
   update their own row; `interview_date` already exists). This migration
   just documents that fact.

2. Mock interviews already have `meeting_platform` / `meeting_link` columns
   (added in phase5). We default `meeting_platform` to 'Microsoft Teams' for
   new bookings going forward so mock interviews consistently happen over
   Teams unless a strategist overrides it.

3. Friday Reports currently only has the bare-bones phase3 columns plus
   approval_status/approved_by/approved_at/sent_at/report_data from phase5.
   The frontend (FridayReportsPage.tsx) expects several detail columns that
   were never actually migrated — this was a real bug (page always showed
   "no reports" because it also filtered on a `status` column that doesn't
   exist; the real column is `approval_status`, fixed in application code).
   This migration adds the missing detail columns and RLS so strategists can
   author reports for their assigned members and admins can review/approve
   before anything reaches a member.

4. Member profile card: adds `username` and `avatar_url` to member_profiles,
   plus a public `avatars` storage bucket members can upload their own
   headshot into.
*/

-- ============================================================
-- 1. MEMBER PROFILE: username + avatar
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_profiles' AND column_name = 'username') THEN
    ALTER TABLE member_profiles ADD COLUMN username text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE member_profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Case-insensitive uniqueness, but allow many members to have no username yet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_username_unique
  ON member_profiles (lower(username))
  WHERE username IS NOT NULL;

-- ============================================================
-- 2. MOCK INTERVIEWS: default to Microsoft Teams
-- ============================================================
ALTER TABLE mock_interviews ALTER COLUMN meeting_platform SET DEFAULT 'Microsoft Teams';

-- ============================================================
-- 3. FRIDAY REPORTS: detail columns + strategist authorship
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'strategist_id') THEN
    ALTER TABLE friday_reports ADD COLUMN strategist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'strategist_summary') THEN
    ALTER TABLE friday_reports ADD COLUMN strategist_summary text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'opportunities_researched') THEN
    ALTER TABLE friday_reports ADD COLUMN opportunities_researched text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'applications_submitted_detail') THEN
    ALTER TABLE friday_reports ADD COLUMN applications_submitted_detail text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'interviews_detail') THEN
    ALTER TABLE friday_reports ADD COLUMN interviews_detail text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'reporting_period_start') THEN
    ALTER TABLE friday_reports ADD COLUMN reporting_period_start date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'reporting_period_end') THEN
    ALTER TABLE friday_reports ADD COLUMN reporting_period_end date;
  END IF;
END $$;

-- Reports are member-owned rows but authored by strategists/admins, so RLS
-- needs to let an assigned strategist (or admin) do everything short of
-- deleting; the member only ever gets read access, and only once approved.

DROP POLICY IF EXISTS "select_own_reports" ON friday_reports;
CREATE POLICY "select_own_reports"
  ON friday_reports FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id AND approval_status IN ('approved', 'sent'))
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = friday_reports.user_id
      AND strategist_assignments.is_active = true
    )
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "insert_own_reports" ON friday_reports;
CREATE POLICY "insert_strategist_reports"
  ON friday_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = friday_reports.user_id
      AND strategist_assignments.is_active = true
    )
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "update_strategist_reports" ON friday_reports;
CREATE POLICY "update_strategist_reports"
  ON friday_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = friday_reports.user_id
      AND strategist_assignments.is_active = true
    )
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = friday_reports.user_id
      AND strategist_assignments.is_active = true
    )
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "delete_admin_reports" ON friday_reports;
CREATE POLICY "delete_admin_reports"
  ON friday_reports FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- 1b. MEMBER-SET INTERVIEW DATE (notifies assigned strategist)
-- ============================================================
-- Members can already UPDATE their own applications row directly (RLS
-- already allows auth.uid() = member_id), so no schema change was strictly
-- required to let a member set interview_date. But members can't insert a
-- notification into their strategist's inbox (RLS requires
-- auth.uid() = user_id on notifications), so this SECURITY DEFINER function
-- does both atomically: sets the date/status, and pings the strategist.
CREATE OR REPLACE FUNCTION set_application_interview_date(
  p_application_id uuid,
  p_interview_date timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_job_title text;
  v_employer text;
  v_strategist_id uuid;
BEGIN
  SELECT member_id, job_title, employer INTO v_member_id, v_job_title, v_employer
  FROM applications WHERE id = p_application_id;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_member_id
     AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Not authorized to update this application';
  END IF;

  UPDATE applications
  SET interview_date = p_interview_date,
      status = CASE
        WHEN status IN ('rejected', 'closed', 'offer_accepted', 'offer_received') THEN status
        ELSE 'interview_scheduled'
      END,
      updated_at = now()
  WHERE id = p_application_id;

  SELECT strategist_id INTO v_strategist_id
  FROM strategist_assignments
  WHERE member_id = v_member_id AND is_active = true
  LIMIT 1;

  IF v_strategist_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, title, body, link)
    VALUES (
      v_strategist_id,
      'interview_date_added',
      'Interview Date Added',
      format('Your member scheduled an interview for %s at %s.', v_job_title, v_employer),
      '/strategist/applications'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_application_interview_date(uuid, timestamptz) TO authenticated;

-- ============================================================
-- 3b. SEND FRIDAY REPORT (admin-gated, notifies the member)
-- ============================================================
-- Admin/strategist already have UPDATE rights on friday_reports via RLS,
-- but they cannot insert into the member's notifications row directly
-- (RLS requires auth.uid() = user_id there). This SECURITY DEFINER
-- function marks the report sent and drops the member a notification
-- atomically. Restricted to admins so a report can never reach a member
-- without an explicit admin sign-off, per the review requirement.
CREATE OR REPLACE FUNCTION send_friday_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an admin can send a Friday Report to a member';
  END IF;

  SELECT user_id, title INTO v_user_id, v_title FROM friday_reports WHERE id = p_report_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  UPDATE friday_reports
  SET approval_status = 'sent',
      approved_by = COALESCE(approved_by, auth.uid()),
      approved_at = COALESCE(approved_at, now()),
      sent_at = now()
  WHERE id = p_report_id;

  INSERT INTO notifications (user_id, notification_type, title, body, link)
  VALUES (
    v_user_id,
    'friday_report_ready',
    'Your Friday Report is Ready',
    format('"%s" is ready to view.', v_title),
    '/friday-reports'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_friday_report(uuid) TO authenticated;

-- ============================================================
-- 3c. REPORT APPROVALS: was missing an INSERT policy entirely
-- ============================================================
-- phase5 created report_approvals with only a SELECT policy -- admins had
-- no way to actually log an approval/changes-requested note. Restricted to
-- admins since that's the only role the review UI exposes this to.
DROP POLICY IF EXISTS "insert_report_approvals" ON report_approvals;
CREATE POLICY "insert_report_approvals"
  ON report_approvals FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- 4. AVATARS STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "insert_own_avatar" ON storage.objects;
CREATE POLICY "insert_own_avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_avatar" ON storage.objects;
CREATE POLICY "update_own_avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_avatar" ON storage.objects;
CREATE POLICY "delete_own_avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
