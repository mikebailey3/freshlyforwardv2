/*
# Blog System ("The Forward Feed")

## Overview
Adds a lightweight CMS for FreshlyForward's content marketing blog, branded
"The Forward Feed" across the site (homepage widget, member dashboard card,
public listing/detail pages, and a staff admin panel).

## New table: blog_posts
Plain long-form content stored as a single `content` text column (rendered
as paragraphs client-side) rather than a heavy rich-text/JSON structure --
matches the scope of what's actually needed here (YAGNI).

Status lifecycle:
  - 'draft'     -- not visible anywhere except to staff
  - 'scheduled' -- has a future published_at; hidden from the public until
                   that timestamp passes (checked at query time, no cron
                   needed)
  - 'published' -- live once published_at <= now()

## Access
- Public (anon + authenticated): read-only, published posts only.
- Staff (admin OR an active strategist): full read of every post regardless
  of status, plus create/update/delete. This matches the ask that both
  Admins and Career Strategists can manage articles.
*/

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'FreshlyForward Updates'
    CHECK (category IN ('Job Search Tips', 'Interview Prep', 'Career Growth', 'FreshlyForward Updates')),
  cover_image_url text,
  read_time_minutes int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- updated_at trigger (generic helper, reusable by future tables)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
DROP POLICY IF EXISTS "public_read_published_posts" ON blog_posts;
CREATE POLICY "public_read_published_posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS "staff_read_all_posts" ON blog_posts;
CREATE POLICY "staff_read_all_posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM strategist_assignments sa
      WHERE sa.strategist_id = auth.uid() AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "staff_write_posts" ON blog_posts;
CREATE POLICY "staff_write_posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM strategist_assignments sa
      WHERE sa.strategist_id = auth.uid() AND sa.is_active = true
    )
  )
  WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM strategist_assignments sa
      WHERE sa.strategist_id = auth.uid() AND sa.is_active = true
    )
  );

-- ============================================================
-- SEED: a few launch posts so the widget isn't empty on day one
-- ============================================================
INSERT INTO blog_posts (slug, title, excerpt, content, category, read_time_minutes, status, author_name, published_at) VALUES
  (
    '5-ways-to-make-your-resume-stand-out',
    '5 Ways to Make Your Resume Stand Out in 2026',
    'Simple changes that can help you get noticed by hiring managers.',
    E'Hiring managers spend seconds, not minutes, on a first pass. Here is how to earn a second look.\n\nLead with impact, not duties. Every bullet should answer "so what?" -- use numbers wherever you can.\n\nCut anything older than 10-15 years unless it is directly relevant. Recruiters care about your trajectory, not your whole history.\n\nMatch the language of the job posting. Applicant tracking systems and human reviewers both respond to shared vocabulary.\n\nKeep formatting simple and scannable. One page for most roles, clear section headers, no dense paragraphs.\n\nProofread out loud. Typos are one of the fastest ways to lose credibility before anyone reads your experience.',
    'Job Search Tips',
    5,
    'published',
    'Mike Bailey',
    now() - interval '12 days'
  ),
  (
    'how-to-ace-your-next-interview',
    'How to Ace Your Next Interview',
    'Preparation tips that will help you walk in with confidence.',
    E'Confidence in an interview comes from preparation, not personality. Here is what actually moves the needle.\n\nResearch the company''s recent news, not just its website. Bring up something specific and current.\n\nPrepare three stories in a STAR format (Situation, Task, Action, Result) that you can adapt to almost any behavioral question.\n\nPrepare two or three thoughtful questions for the interviewer that show you have been thinking about the role, not just the paycheck.\n\nDo a mock interview out loud, even alone, so your answers do not come out for the first time live.\n\nFollow up within 24 hours with a short, specific thank-you note referencing something from the conversation.',
    'Interview Prep',
    6,
    'published',
    'Dezaray Bailey',
    now() - interval '5 days'
  ),
  (
    'whats-new-at-freshlyforward',
    E'What''s New at FreshlyForward',
    'Updates, new features, and improvements to your experience.',
    E'We are always shipping improvements based on member feedback. Here is what recently landed.\n\nYour Career Profile is now fully editable right from your dashboard, and your Search Readiness score updates the moment you save changes.\n\nWe added The Forward Feed -- the blog you are reading right now -- with fresh job search strategy, interview guidance, and platform updates.\n\nStrategists now have a clearer view of assigned members, and the admin team has new tools to support members faster.\n\nMore updates are on the way. If there is something you would love to see, tell your Career Strategist -- we build around real member requests.',
    'FreshlyForward Updates',
    3,
    'published',
    'FreshlyForward Team',
    now() - interval '1 days'
  )
ON CONFLICT (slug) DO NOTHING;
