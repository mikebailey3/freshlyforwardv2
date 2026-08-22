/*
# Opportunity Engine

## Overview
Adds an automated job-sourcing layer that sits *upstream* of the existing
hand-curated `opportunities` pipeline. Strategists still control what a
member actually sees as an "Opportunity" -- this just surfaces candidates
and pre-computes a "FreshFit" match score so strategists spend less time
hunting and more time reviewing high-signal matches.

## New Tables

### `scraped_jobs`
A shared pool of job postings pulled in by an external sync script
(`scripts/scrapeIndeed.ts` + `scripts/syncFreshFitScores.ts`, run out of
band via `npm run scrape:indeed` / `npm run sync:freshfit` -- NOT
client-side, since scraping requires a Node runtime and a service-role
key). Not member-scoped; one row per unique posting regardless of how
many members it might match.

### `job_matches`
Per-member FreshFit score against a scraped job, computed by
`src/lib/freshFitScore.ts` (pure, deterministic keyword/profile overlap
-- no LLM dependency, see that file for the full algorithm writeup).
Strategists can "promote" a high-scoring match into a real `opportunities`
row for that member with one click; `promoted_opportunity_id` tracks that
so it stops showing as a pending match once acted on.

## Security
- `scraped_jobs`: readable by any authenticated user (it's generic job
  posting data, not member-specific); write access is service-role only
  (no authenticated INSERT/UPDATE/DELETE policy -- the sync scripts use
  the Supabase service role key, which bypasses RLS entirely).
- `job_matches`: members read their own; strategists read matches for
  their assigned members (same pattern as every other member-scoped
  table in this schema). Writes are also service-role only (computed by
  the sync script), except `dismissed_at` which a member can set on
  their own rows, and `promoted_opportunity_id` which a strategist sets.

## IMPORTANT — data source disclaimer
Indeed's Terms of Service prohibit automated scraping, and they actively
defend against it (Cloudflare, rate limiting, IP bans, legal action
against repeat offenders). The scraper in `scripts/scrapeIndeed.ts` is a
best-effort, educational implementation with no bot-detection evasion --
it WILL break when Indeed changes its markup or blocks the request, and
using it against Indeed's ToS is a decision made knowingly by the site
owner, not something Code Puppy is validating as compliant. Swapping in
a licensed job aggregator API (Adzuna, JSearch, etc.) later only requires
changing the sync script -- `scraped_jobs` and everything downstream is
source-agnostic.
*/

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
