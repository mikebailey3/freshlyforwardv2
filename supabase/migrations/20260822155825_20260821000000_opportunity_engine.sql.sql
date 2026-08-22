-- ============================================================
-- SCRAPED_JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS scraped_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'indeed',
  external_id text NOT NULL,
  title text NOT NULL,
  company text NOT NULL DEFAULT '',
  location text,
  description text NOT NULL DEFAULT '',
  salary_text text,
  employment_type text,
  posting_url text NOT NULL,
  posted_at date,
  search_query text,
  is_active boolean NOT NULL DEFAULT true,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_scraped_jobs_active ON scraped_jobs(is_active, scraped_at DESC);

ALTER TABLE scraped_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_scraped_jobs" ON scraped_jobs;
CREATE POLICY "authenticated_read_scraped_jobs"
  ON scraped_jobs FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- JOB_MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scraped_job_id uuid NOT NULL REFERENCES scraped_jobs(id) ON DELETE CASCADE,
  fresh_fit_score integer NOT NULL CHECK (fresh_fit_score BETWEEN 0 AND 100),
  matched_skills text[] NOT NULL DEFAULT '{}',
  missing_skills text[] NOT NULL DEFAULT '{}',
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  promoted_opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, scraped_job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_matches_member ON job_matches(member_id, fresh_fit_score DESC);

ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_job_matches" ON job_matches;
CREATE POLICY "select_own_job_matches"
  ON job_matches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = member_id
    OR auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = job_matches.member_id
      AND strategist_assignments.is_active = true
    )
  );

DROP POLICY IF EXISTS "member_dismiss_own_job_matches" ON job_matches;
CREATE POLICY "member_dismiss_own_job_matches"
  ON job_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "strategist_promote_job_matches" ON job_matches;
CREATE POLICY "strategist_promote_job_matches"
  ON job_matches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = job_matches.member_id
      AND strategist_assignments.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT strategist_id FROM strategist_assignments
      WHERE strategist_assignments.member_id = job_matches.member_id
      AND strategist_assignments.is_active = true
    )
  );