/*
# Feature Entitlement System

## Purpose
Creates a centralized, admin-configurable entitlement system that controls which features
each membership plan includes. This is the single source of truth for feature access —
the frontend and edge functions both read from these tables.

## New Tables

### `features`
- `id` (uuid, PK)
- `feature_key` (text, unique) — e.g. "mock_interviews", "promotion_planning"
- `display_name` (text) — human-readable name shown in UI
- `description` (text) — what the feature does
- `icon` (text) — icon name for UI
- `sort_order` (int) — display ordering
- `visibility` (text) — "visible" | "locked" | "hidden" — controls how locked features appear
- `is_coming_soon` (boolean) — marks features not yet available
- `upgrade_title` (text) — modal title copy
- `upgrade_body` (text) — modal body copy
- `upgrade_cta` (text) — button label copy
- `created_at`, `updated_at` (timestamps)

### `plan_features`
- `id` (uuid, PK)
- `plan_id` (uuid, FK → membership_plans)
- `feature_id` (uuid, FK → features)
- `is_enabled` (boolean, default true) — allows admin to toggle a feature on/off per plan
- `created_at` (timestamp)
- Unique constraint on (plan_id, feature_id)

## SECURITY DEFINER Function

### `has_feature_access(p_user_id uuid, p_feature_key text)`
Returns boolean. Checks the user's active plan (from member_profiles → membership_plans)
and whether that plan includes the given feature via plan_features.
Only grants access if subscription_status is in the allowed set:
  active, trialing, past_due
(past_due gives a grace period; paused, canceled, unpaid do NOT grant access)

## Seeded Data
- 20 features with the exact feature keys from the spec
- plan_features rows linking features to plans per the business model:
  - Founding Member: 8 features
  - Career Growth: 13 features (8 + 5)
  - Career Concierge: 22 features (13 + 9)

## RLS
- `features`: readable by all authenticated users (so the UI can show locked features)
- `plan_features`: readable by all authenticated users, writable only by admin role
  (admin check via app_metadata)
- Both tables: INSERT/UPDATE/DELETE restricted to admin role only

## Notes
1. The `has_feature_access` function is SECURITY DEFINER so it can read
   member_profiles and plan_features regardless of the caller's RLS context.
2. Subscription status access rules:
   - active: full access
   - trialing: full access (if ever enabled in Stripe)
   - past_due: full access (grace period — Stripe retries payment)
   - paused: NO access
   - canceled: NO access
   - unpaid: NO access
3. The one-time "Career Kickstart" product does NOT create a subscription,
   so it will not grant ongoing access to any features.
*/

-- ============================================================
-- FEATURES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Sparkles',
  sort_order int DEFAULT 0,
  visibility text DEFAULT 'locked' CHECK (visibility IN ('visible', 'locked', 'hidden')),
  is_coming_soon boolean DEFAULT false,
  upgrade_title text,
  upgrade_body text,
  upgrade_cta text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_features" ON features;
CREATE POLICY "authenticated_read_features"
  ON features FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_features" ON features;
CREATE POLICY "admin_insert_features"
  ON features FOR INSERT
  TO authenticated WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_update_features" ON features;
CREATE POLICY "admin_update_features"
  ON features FOR UPDATE
  TO authenticated USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  ) WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_delete_features" ON features;
CREATE POLICY "admin_delete_features"
  ON features FOR DELETE
  TO authenticated USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- ============================================================
-- PLAN_FEATURES JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (plan_id, feature_id)
);

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_plan_features" ON plan_features;
CREATE POLICY "authenticated_read_plan_features"
  ON plan_features FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_plan_features" ON plan_features;
CREATE POLICY "admin_insert_plan_features"
  ON plan_features FOR INSERT
  TO authenticated WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_update_plan_features" ON plan_features;
CREATE POLICY "admin_update_plan_features"
  ON plan_features FOR UPDATE
  TO authenticated USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  ) WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_delete_plan_features" ON plan_features;
CREATE POLICY "admin_delete_plan_features"
  ON plan_features FOR DELETE
  TO authenticated USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- ============================================================
-- HAS_FEATURE_ACCESS FUNCTION (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION has_feature_access(p_user_id uuid, p_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_subscription_status text;
  v_has_access boolean := false;
BEGIN
  -- Get the user's plan and subscription status
  SELECT mp.plan_id, mp.subscription_status
  INTO v_plan_id, v_subscription_status
  FROM member_profiles mp
  WHERE mp.user_id = p_user_id;

  -- No plan or no active subscription
  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  -- Only these statuses grant access
  IF v_subscription_status NOT IN ('active', 'trialing', 'past_due') THEN
    RETURN false;
  END IF;

  -- Check if the plan includes this feature
  SELECT EXISTS(
    SELECT 1
    FROM plan_features pf
    JOIN features f ON f.id = pf.feature_id
    WHERE pf.plan_id = v_plan_id
      AND f.feature_key = p_feature_key
      AND pf.is_enabled = true
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$;

GRANT EXECUTE ON FUNCTION has_feature_access(uuid, text) TO authenticated;

-- ============================================================
-- SEED FEATURES
-- ============================================================
INSERT INTO features (feature_key, display_name, description, icon, sort_order, visibility, upgrade_title, upgrade_body, upgrade_cta)
VALUES
  ('career_profile', 'Career Profile', 'Create and manage your professional career profile.', 'User', 1, 'visible', NULL, NULL, NULL),
  ('resume_support', 'Resume Support', 'Initial resume review and optimization.', 'FileText', 2, 'visible', NULL, NULL, NULL),
  ('job_search', 'Job Search', 'Access to job search tools and curated opportunities.', 'Search', 3, 'visible', NULL, NULL, NULL),
  ('hand_selected_opportunities', 'Hand-Selected Opportunities', 'Personally researched opportunities matching your criteria.', 'Briefcase', 4, 'visible', NULL, NULL, NULL),
  ('applications', 'Applications', 'Professionally crafted job applications submitted on your behalf.', 'FileText', 5, 'visible', NULL, NULL, NULL),
  ('cover_letters', 'Cover Letters', 'Custom cover letters for each application.', 'Mail', 6, 'visible', NULL, NULL, NULL),
  ('friday_reports', 'Friday Reports', 'Weekly progress reports every Friday.', 'FileText', 7, 'visible', NULL, NULL, NULL),
  ('direct_messaging', 'Direct Messaging', 'Message directly with your Career Strategist.', 'MessageSquare', 8, 'visible', NULL, NULL, NULL),
  ('mock_interviews', 'Mock Interviews', 'Practice interviews with your Career Strategist.', 'Video', 9, 'locked',
    'Unlock Mock Interviews',
    'Mock Interviews are included with Career Growth and Career Concierge memberships. Upgrade to practice with your Career Strategist, build confidence, and get expert feedback.',
    'Upgrade to Career Growth'),
  ('interview_preparation', 'Interview Preparation', 'Targeted prep materials and coaching for interviews.', 'GraduationCap', 10, 'locked',
    'Unlock Interview Preparation',
    'Interview Preparation is included with Career Growth and Career Concierge memberships. Upgrade to get targeted prep materials and coaching.',
    'Upgrade to Career Growth'),
  ('resume_updates', 'Resume Updates', 'Ongoing resume updates as your search evolves.', 'FileText', 11, 'locked',
    'Unlock Resume Updates',
    'Resume Updates are included with Career Growth and Career Concierge memberships. Upgrade to keep your resume current as your search evolves.',
    'Upgrade to Career Growth'),
  ('career_strategy_reviews', 'Career Strategy Reviews', 'Regular strategy reviews with your Career Strategist.', 'Compass', 12, 'locked',
    'Unlock Career Strategy Reviews',
    'Career Strategy Reviews are included with Career Growth and Career Concierge memberships. Upgrade to get regular strategy sessions.',
    'Upgrade to Career Growth'),
  ('priority_messaging', 'Priority Messaging', 'Faster response times from your Career Strategist.', 'Zap', 13, 'locked',
    'Unlock Priority Messaging',
    'Priority Messaging is included with Career Growth and Career Concierge memberships. Upgrade for faster response times.',
    'Upgrade to Career Growth'),
  ('workplace_success_coaching', 'Workplace Success Coaching', 'Personalized coaching for workplace success.', 'TrendingUp', 14, 'locked',
    'Unlock Workplace Success Coaching',
    'Workplace Success Coaching is available with Career Concierge. Upgrade to access personalized workplace coaching, promotion planning, salary guidance, leadership development, and long-term career support.',
    'Upgrade to Career Concierge'),
  ('promotion_planning', 'Promotion Planning', 'Build a personalized promotion roadmap.', 'TrendingUp', 15, 'locked',
    'Unlock Promotion Planning',
    'Promotion Planning is part of Career Concierge. Upgrade to build a personalized promotion roadmap with your Career Strategist.',
    'Upgrade to Career Concierge'),
  ('salary_coaching', 'Salary Coaching', 'Expert guidance on salary negotiation and growth.', 'DollarSign', 16, 'locked',
    'Unlock Salary Coaching',
    'Salary Coaching is part of Career Concierge. Upgrade to access expert salary negotiation guidance and compensation planning.',
    'Upgrade to Career Concierge'),
  ('leadership_development', 'Leadership Development', 'Develop leadership skills and presence.', 'Users', 17, 'locked',
    'Unlock Leadership Development',
    'Leadership Development is part of Career Concierge. Upgrade to access leadership coaching and development planning.',
    'Upgrade to Career Concierge'),
  ('career_roadmap', 'Career Roadmap', 'Long-term career path planning and visualization.', 'Map', 18, 'locked',
    'Unlock Career Roadmap',
    'Career Roadmap is part of Career Concierge. Upgrade to build a long-term career path with your Career Strategist.',
    'Upgrade to Career Concierge'),
  ('achievement_vault', 'Achievement Vault', 'Document and track your professional achievements.', 'Award', 19, 'locked',
    'Unlock Achievement Vault',
    'Achievement Vault is part of Career Concierge. Upgrade to document and track your professional achievements over time.',
    'Upgrade to Career Concierge'),
  ('resume_maintenance', 'Resume Maintenance', 'Ongoing resume maintenance after placement.', 'FileText', 20, 'locked',
    'Unlock Resume Maintenance',
    'Resume Maintenance is part of Career Concierge. Upgrade to keep your resume updated after placement.',
    'Upgrade to Career Concierge'),
  ('quarterly_career_reviews', 'Quarterly Career Reviews', 'In-depth career reviews every quarter.', 'CalendarCheck', 21, 'locked',
    'Unlock Quarterly Career Reviews',
    'Quarterly Career Reviews are part of Career Concierge. Upgrade to receive in-depth career reviews every quarter.',
    'Upgrade to Career Concierge'),
  ('priority_concierge_support', 'Priority Concierge Support', 'Highest priority support and response times.', 'Star', 22, 'locked',
    'Unlock Priority Concierge Support',
    'Priority Concierge Support is part of Career Concierge. Upgrade for the highest priority support and fastest response times.',
    'Upgrade to Career Concierge')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- SEED PLAN_FEATURES
-- ============================================================
-- Get plan IDs
DO $$
DECLARE
  v_founding uuid;
  v_growth uuid;
  v_concierge uuid;
  v_feature uuid;
BEGIN
  SELECT id INTO v_founding FROM membership_plans WHERE slug = 'founding-member';
  SELECT id INTO v_growth FROM membership_plans WHERE slug = 'career-growth';
  SELECT id INTO v_concierge FROM membership_plans WHERE slug = 'career-concierge';

  -- FOUNDING MEMBER (8 features)
  INSERT INTO plan_features (plan_id, feature_id)
  SELECT v_founding, f.id FROM features f
  WHERE f.feature_key IN (
    'career_profile', 'resume_support', 'job_search',
    'hand_selected_opportunities', 'applications', 'cover_letters',
    'friday_reports', 'direct_messaging'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- CAREER GROWTH (13 features = 8 founding + 5 growth)
  INSERT INTO plan_features (plan_id, feature_id)
  SELECT v_growth, f.id FROM features f
  WHERE f.feature_key IN (
    'career_profile', 'resume_support', 'job_search',
    'hand_selected_opportunities', 'applications', 'cover_letters',
    'friday_reports', 'direct_messaging',
    'mock_interviews', 'interview_preparation', 'resume_updates',
    'career_strategy_reviews', 'priority_messaging'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- CAREER CONCIERGE (22 features = 13 growth + 9 concierge)
  INSERT INTO plan_features (plan_id, feature_id)
  SELECT v_concierge, f.id FROM features f
  WHERE f.feature_key IN (
    'career_profile', 'resume_support', 'job_search',
    'hand_selected_opportunities', 'applications', 'cover_letters',
    'friday_reports', 'direct_messaging',
    'mock_interviews', 'interview_preparation', 'resume_updates',
    'career_strategy_reviews', 'priority_messaging',
    'workplace_success_coaching', 'promotion_planning', 'salary_coaching',
    'leadership_development', 'career_roadmap', 'achievement_vault',
    'resume_maintenance', 'quarterly_career_reviews', 'priority_concierge_support'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;
END $$;
