/*
# Phase 4 — Operational Engine: Opportunities, Applications, Resumes, Cover Letters, Notes, Follow-ups, Feedback

## Overview
Transforms FreshlyForward from a membership platform into a functioning Career Concierge service.
Creates the complete operational engine: opportunity research, pipeline management, application tracking,
resume/cover letter versioning, internal career notes, follow-up system, member feedback, and "Why We Applied" pages.

## New Tables (in creation order)
1. `strategist_assignments` — Links career strategists to members
2. `resume_versions` — Master + tailored resume versions with version history
3. `cover_letters` — Custom cover letters with templates and version history
4. `opportunities` — Hand-researched job opportunities with full pipeline statuses
5. `applications` — Application records tracking the full lifecycle
6. `career_notes` — Private strategist notes (strategist/admin only)
7. `follow_ups` — Scheduled follow-up reminders
8. `member_feedback` — Member feedback on opportunities and applications
9. `why_we_applied` — Auto-generated "Why We Applied" page for every submitted application

## Security
- RLS enabled on all tables
- Members see their own data; strategists see data for assigned members
- Career notes visible only to strategists/admins (never to members)
- Uses auth.uid() and strategist_assignments for access control
*/

-- ============================================================
-- STRATEGIST ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS strategist_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(strategist_id, member_id)
);

ALTER TABLE strategist_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_assignments_member" ON strategist_assignments;
CREATE POLICY "select_own_assignments_member"
  ON strategist_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = strategist_id);

DROP POLICY IF EXISTS "insert_assignments_strategist" ON strategist_assignments;
CREATE POLICY "insert_assignments_strategist"
  ON strategist_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_own_assignments" ON strategist_assignments;
CREATE POLICY "update_own_assignments"
  ON strategist_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "delete_own_assignments" ON strategist_assignments;
CREATE POLICY "delete_own_assignments"
  ON strategist_assignments FOR DELETE
  TO authenticated
  USING (auth.uid() = strategist_id);

-- ============================================================
-- RESUME VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  is_master boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  file_path text,
  file_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resumes" ON resume_versions;
CREATE POLICY "select_own_resumes"
  ON resume_versions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = resume_versions.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_own_resumes" ON resume_versions;
CREATE POLICY "insert_own_resumes"
  ON resume_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = resume_versions.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_own_resumes" ON resume_versions;
CREATE POLICY "update_own_resumes"
  ON resume_versions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = resume_versions.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = resume_versions.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "delete_own_resumes" ON resume_versions;
CREATE POLICY "delete_own_resumes"
  ON resume_versions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = resume_versions.member_id
      AND strategist_assignments.is_active = true
    )
  );

-- ============================================================
-- COVER LETTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_template boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cover_letters" ON cover_letters;
CREATE POLICY "select_own_cover_letters"
  ON cover_letters FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = cover_letters.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_own_cover_letters" ON cover_letters;
CREATE POLICY "insert_own_cover_letters"
  ON cover_letters FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = cover_letters.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_own_cover_letters" ON cover_letters;
CREATE POLICY "update_own_cover_letters"
  ON cover_letters FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = cover_letters.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = cover_letters.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "delete_own_cover_letters" ON cover_letters;
CREATE POLICY "delete_own_cover_letters"
  ON cover_letters FOR DELETE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = cover_letters.member_id
      AND strategist_assignments.is_active = true
    )
  );

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employer text NOT NULL,
  job_title text NOT NULL,
  location text,
  salary_min integer,
  salary_max integer,
  salary_text text,
  work_arrangement text,
  benefits text[],
  schedule text,
  employment_type text,
  posting_url text,
  posting_date date,
  expiration_date date,
  source text,
  full_job_description text,
  research_notes text,
  internal_notes text,
  member_visible_notes text,
  why_it_matches text,
  potential_concerns text,
  status text NOT NULL DEFAULT 'researching',
  authorization_mode text NOT NULL DEFAULT 'approval_required',
  preauthorized_qualification jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_opportunities" ON opportunities;
CREATE POLICY "select_own_opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = opportunities.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_opportunities_strategist" ON opportunities;
CREATE POLICY "insert_opportunities_strategist"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = opportunities.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_opportunities_strategist" ON opportunities;
CREATE POLICY "update_opportunities_strategist"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = opportunities.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = opportunities.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "delete_opportunities_strategist" ON opportunities;
CREATE POLICY "delete_opportunities_strategist"
  ON opportunities FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = opportunities.member_id
      AND strategist_assignments.is_active = true
    )
  );

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employer text NOT NULL,
  job_title text NOT NULL,
  date_found date,
  date_submitted date,
  source text,
  resume_version_id uuid REFERENCES resume_versions(id) ON DELETE SET NULL,
  cover_letter_id uuid REFERENCES cover_letters(id) ON DELETE SET NULL,
  authorization_used text DEFAULT 'approval_required',
  status text NOT NULL DEFAULT 'preparing_resume',
  follow_up_date date,
  interview_date timestamptz,
  offer_details text,
  internal_notes text,
  member_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = applications.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_applications_strategist" ON applications;
CREATE POLICY "insert_applications_strategist"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = applications.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_applications_strategist" ON applications;
CREATE POLICY "update_applications_strategist"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = applications.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = applications.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "delete_applications_strategist" ON applications;
CREATE POLICY "delete_applications_strategist"
  ON applications FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = applications.member_id
      AND strategist_assignments.is_active = true
    )
  );

-- ============================================================
-- CAREER NOTES (strategist/admin only)
-- ============================================================
CREATE TABLE IF NOT EXISTS career_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  category text,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_career_notes_strategist" ON career_notes;
CREATE POLICY "select_career_notes_strategist"
  ON career_notes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = strategist_id
    OR auth.uid() IN (
      SELECT sa.strategist_id FROM strategist_assignments sa
      WHERE sa.member_id = career_notes.member_id
      AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_career_notes_strategist" ON career_notes;
CREATE POLICY "insert_career_notes_strategist"
  ON career_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = career_notes.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_career_notes_strategist" ON career_notes;
CREATE POLICY "update_career_notes_strategist"
  ON career_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "delete_career_notes_strategist" ON career_notes;
CREATE POLICY "delete_career_notes_strategist"
  ON career_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = strategist_id);

-- ============================================================
-- FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategist_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_follow_ups_strategist" ON follow_ups;
CREATE POLICY "select_follow_ups_strategist"
  ON follow_ups FOR SELECT
  TO authenticated
  USING (
    auth.uid() = strategist_id
    OR auth.uid() = member_id
  );

DROP POLICY IF EXISTS "insert_follow_ups_strategist" ON follow_ups;
CREATE POLICY "insert_follow_ups_strategist"
  ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "update_follow_ups_strategist" ON follow_ups;
CREATE POLICY "update_follow_ups_strategist"
  ON follow_ups FOR UPDATE
  TO authenticated
  USING (auth.uid() = strategist_id)
  WITH CHECK (auth.uid() = strategist_id);

DROP POLICY IF EXISTS "delete_follow_ups_strategist" ON follow_ups;
CREATE POLICY "delete_follow_ups_strategist"
  ON follow_ups FOR DELETE
  TO authenticated
  USING (auth.uid() = strategist_id);

-- ============================================================
-- MEMBER FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS member_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_feedback" ON member_feedback;
CREATE POLICY "select_own_feedback"
  ON member_feedback FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = member_feedback.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_own_feedback" ON member_feedback;
CREATE POLICY "insert_own_feedback"
  ON member_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "delete_own_feedback" ON member_feedback;
CREATE POLICY "delete_own_feedback"
  ON member_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = member_id);

-- ============================================================
-- WHY WE APPLIED
-- ============================================================
CREATE TABLE IF NOT EXISTS why_we_applied (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer text NOT NULL,
  position_title text NOT NULL,
  location text,
  salary_text text,
  application_date date,
  current_status text,
  posting_link text,
  why_selected text,
  how_it_matches text,
  skills_highlighted text,
  resume_version_title text,
  cover_letter_title text,
  potential_challenges text,
  interview_prep_notes text,
  strategist_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE why_we_applied ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_why_we_applied" ON why_we_applied;
CREATE POLICY "select_own_why_we_applied"
  ON why_we_applied FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = why_we_applied.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_why_we_applied_strategist" ON why_we_applied;
CREATE POLICY "insert_why_we_applied_strategist"
  ON why_we_applied FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = why_we_applied.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_why_we_applied_strategist" ON why_we_applied;
CREATE POLICY "update_why_we_applied_strategist"
  ON why_we_applied FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = why_we_applied.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = why_we_applied.member_id
      AND strategist_assignments.is_active = true
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_member ON opportunities(member_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_member ON applications(member_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_member ON resume_versions(member_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_cover_letters_member ON cover_letters(member_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_career_notes_member ON career_notes(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_strategist ON follow_ups(strategist_id, due_date);
CREATE INDEX IF NOT EXISTS idx_member_feedback_member ON member_feedback(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_why_we_applied_member ON why_we_applied(member_id);
CREATE INDEX IF NOT EXISTS idx_why_we_applied_application ON why_we_applied(application_id);
CREATE INDEX IF NOT EXISTS idx_strategist_assignments_strategist ON strategist_assignments(strategist_id, is_active);
CREATE INDEX IF NOT EXISTS idx_strategist_assignments_member ON strategist_assignments(member_id, is_active);
