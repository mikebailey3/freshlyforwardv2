/*
# Phase 5 — Founding Member Experience, Communication, Reports, Interviews

## Overview
Creates the Founding Member experience and communication/reporting/interview infrastructure.

## New Tables
1. founding_member_feedback — Feature requests, bug reports, votes, suggestions
2. beta_features — Admin-controlled beta features
3. beta_feature_access — Per-member beta feature grants
4. success_story_requests — Testimonial/review/story/referral requests
5. email_templates — Admin-editable email templates
6. report_templates — Admin-editable Friday Report templates
7. report_approvals — Admin approval workflow for reports
8. conversations — Threaded conversations for messaging
9. interview_prep — Auto-generated interview prep pages
10. interview_feedback — Strategist feedback after mock interviews
11. notifications — Member notification center
12. communication_preferences — Per-member notification prefs
13. activity_feed — Member activity timeline
14. calendar_events — Unified calendar events
15. strategist_reminders — Contextual reminders
16. referral_program — Placeholder for future referrals

## Modified Tables
- messages: added conversation_id, read_at, attachment columns
- friday_reports: added approval_status, approved_by, approved_at, sent_at, report_data
- mock_interviews: added company, position, interview_type, duration, meeting fields, prep fields

## Security
- RLS on all tables, owner-scoped using auth.uid()
*/

-- ============================================================
-- FOUNDING MEMBER FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS founding_member_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  title text NOT NULL,
  description text,
  votes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE founding_member_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_founding_feedback" ON founding_member_feedback;
CREATE POLICY "select_own_founding_feedback"
  ON founding_member_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() IN (SELECT strategist_id FROM strategist_assignments WHERE is_active = true));

DROP POLICY IF EXISTS "insert_own_founding_feedback" ON founding_member_feedback;
CREATE POLICY "insert_own_founding_feedback"
  ON founding_member_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "update_own_founding_feedback" ON founding_member_feedback;
CREATE POLICY "update_own_founding_feedback"
  ON founding_member_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- ============================================================
-- BETA FEATURES
-- ============================================================
CREATE TABLE IF NOT EXISTS beta_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT 'Sparkles',
  target_audience text NOT NULL DEFAULT 'everyone',
  is_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE beta_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_beta_features" ON beta_features;
CREATE POLICY "public_read_beta_features"
  ON beta_features FOR SELECT
  TO anon, authenticated
  USING (is_enabled = true);

CREATE TABLE IF NOT EXISTS beta_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beta_feature_id uuid NOT NULL REFERENCES beta_features(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(beta_feature_id, member_id)
);

ALTER TABLE beta_feature_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_beta_access" ON beta_feature_access;
CREATE POLICY "select_own_beta_access"
  ON beta_feature_access FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- ============================================================
-- SUCCESS STORY REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS success_story_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  member_response text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE success_story_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_success_story_requests" ON success_story_requests;
CREATE POLICY "select_success_story_requests"
  ON success_story_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() = strategist_id
    OR auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = success_story_requests.member_id AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_success_story_requests" ON success_story_requests;
CREATE POLICY "insert_success_story_requests"
  ON success_story_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_success_story_requests" ON success_story_requests;
CREATE POLICY "update_success_story_requests"
  ON success_story_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = member_id OR auth.uid() = strategist_id);

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_email_templates" ON email_templates;
CREATE POLICY "read_email_templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- ============================================================
-- REPORT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL DEFAULT 'default',
  name text NOT NULL DEFAULT 'Default Report Template',
  header text,
  footer text,
  branding text,
  signature text,
  primary_color text DEFAULT '#0ea5e9',
  legal_disclaimer text,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_report_templates" ON report_templates;
CREATE POLICY "read_report_templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- REPORT APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES friday_reports(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_report_approvals" ON report_approvals;
CREATE POLICY "select_report_approvals"
  ON report_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM friday_reports WHERE friday_reports.id = report_approvals.report_id AND friday_reports.user_id = auth.uid())
    OR auth.uid() IN (SELECT strategist_id FROM strategist_assignments WHERE is_active = true)
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id);

DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id OR auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = member_id OR auth.uid() = strategist_id);

-- Add columns to messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE messages ADD COLUMN attachment_url text;
    ALTER TABLE messages ADD COLUMN attachment_name text;
    ALTER TABLE messages ADD COLUMN attachment_type text;
  END IF;
END $$;

-- ============================================================
-- INTERVIEW PREP
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_prep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  mock_interview_id uuid REFERENCES mock_interviews(id) ON DELETE SET NULL,
  company text,
  position text,
  interview_type text,
  company_overview text,
  role_summary text,
  important_qualifications text,
  talking_points text,
  star_story_suggestions text,
  questions_to_ask text,
  salary_guidance text,
  dress_suggestions text,
  research_notes text,
  directions text,
  meeting_link text,
  checklist jsonb DEFAULT '[]'::jsonb,
  uploaded_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_interview_prep" ON interview_prep;
CREATE POLICY "select_own_interview_prep"
  ON interview_prep FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = interview_prep.member_id AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_interview_prep" ON interview_prep;
CREATE POLICY "insert_interview_prep"
  ON interview_prep FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = interview_prep.member_id AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_interview_prep" ON interview_prep;
CREATE POLICY "update_interview_prep"
  ON interview_prep FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = interview_prep.member_id AND sa.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = interview_prep.member_id AND sa.is_active = true
    )
  );

-- ============================================================
-- INTERVIEW FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_interview_id uuid NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence integer,
  communication integer,
  leadership integer,
  professionalism integer,
  storytelling integer,
  star_method integer,
  body_language integer,
  preparation integer,
  areas_to_improve text,
  action_plan text,
  next_goals text,
  member_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_interview_feedback" ON interview_feedback;
CREATE POLICY "select_interview_feedback"
  ON interview_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id);

DROP POLICY IF EXISTS "insert_interview_feedback" ON interview_feedback;
CREATE POLICY "insert_interview_feedback"
  ON interview_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_interview_feedback" ON interview_feedback;
CREATE POLICY "update_interview_feedback"
  ON interview_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = member_id OR auth.uid() = strategist_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- COMMUNICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT false,
  browser_notifications boolean NOT NULL DEFAULT false,
  weekly_digest boolean NOT NULL DEFAULT true,
  immediate_alerts boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_comm_prefs" ON communication_preferences;
CREATE POLICY "select_own_comm_prefs"
  ON communication_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_comm_prefs" ON communication_preferences;
CREATE POLICY "insert_own_comm_prefs"
  ON communication_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comm_prefs" ON communication_preferences;
CREATE POLICY "update_own_comm_prefs"
  ON communication_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activity" ON activity_feed;
CREATE POLICY "select_own_activity"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_activity" ON activity_feed;
CREATE POLICY "insert_own_activity"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  meeting_link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calendar" ON calendar_events;
CREATE POLICY "select_own_calendar"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_calendar" ON calendar_events;
CREATE POLICY "insert_own_calendar"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_calendar" ON calendar_events;
CREATE POLICY "update_own_calendar"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_calendar" ON calendar_events;
CREATE POLICY "delete_own_calendar"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STRATEGIST REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS strategist_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategist_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  title text NOT NULL,
  description text,
  trigger_milestone text,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE strategist_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reminders" ON strategist_reminders;
CREATE POLICY "select_own_reminders"
  ON strategist_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "insert_own_reminders" ON strategist_reminders;
CREATE POLICY "insert_own_reminders"
  ON strategist_reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_own_reminders" ON strategist_reminders;
CREATE POLICY "update_own_reminders"
  ON strategist_reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = strategist_id);

-- ============================================================
-- REFERRAL PROGRAM (placeholder)
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text UNIQUE,
  referred_email text,
  status text NOT NULL DEFAULT 'pending',
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_program ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referrals" ON referral_program;
CREATE POLICY "select_own_referrals"
  ON referral_program FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- ============================================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'approval_status') THEN
    ALTER TABLE friday_reports ADD COLUMN approval_status text NOT NULL DEFAULT 'draft';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'approved_by') THEN
    ALTER TABLE friday_reports ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'approved_at') THEN
    ALTER TABLE friday_reports ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'sent_at') THEN
    ALTER TABLE friday_reports ADD COLUMN sent_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friday_reports' AND column_name = 'report_data') THEN
    ALTER TABLE friday_reports ADD COLUMN report_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_interviews' AND column_name = 'company') THEN
    ALTER TABLE mock_interviews ADD COLUMN company text;
    ALTER TABLE mock_interviews ADD COLUMN position text;
    ALTER TABLE mock_interviews ADD COLUMN interview_type text;
    ALTER TABLE mock_interviews ADD COLUMN duration_minutes integer DEFAULT 60;
    ALTER TABLE mock_interviews ADD COLUMN meeting_platform text;
    ALTER TABLE mock_interviews ADD COLUMN meeting_link text;
    ALTER TABLE mock_interviews ADD COLUMN preparation_notes text;
    ALTER TABLE mock_interviews ADD COLUMN star_questions text;
    ALTER TABLE mock_interviews ADD COLUMN behavioral_questions text;
    ALTER TABLE mock_interviews ADD COLUMN technical_questions text;
    ALTER TABLE mock_interviews ADD COLUMN action_plan text;
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_founding_feedback_member ON founding_member_feedback(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feature_access_member ON beta_feature_access(member_id);
CREATE INDEX IF NOT EXISTS idx_success_story_requests_member ON success_story_requests(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_member ON conversations(member_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_member ON interview_prep(member_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_member ON interview_feedback(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_strategist_reminders ON strategist_reminders(strategist_id, is_dismissed);
