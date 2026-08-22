/*
# Badge System

## Purpose
Implements the FreshlyForward Badge System spec: membership badges (status/tier)
and achievement badges (milestones), stored durably per-member and displayed
across the profile header, sidebar, messages, and admin members list.

## New Tables

### `badges`
Reference table of every badge that can be earned. Two `badge_type`s:
  - 'membership'  -- Founding Member, Career Growth, Concierge Member,
                     Lifetime Founding, Alumni (shield-shaped, status badges)
  - 'achievement' -- Search Ready, First Step, Interview Secured, Offer Earned,
                     Hired!, 30/90 Days Forward, Moving Up, Goal Achieved,
                     Career Builder, One Year Forward (circular, milestone badges)

### `member_badges`
Join table recording which badges a member has actually earned, and when.
Badges are additive/historical -- once earned, never automatically revoked
(a member who downgrades their plan keeps a "Founding Member" badge they
earned while on that plan; only a manual admin action would remove it).

## New member_profiles columns
- `is_lifetime_founding` (boolean) -- admin-toggled special status
- `is_alumni` (boolean) -- admin-toggled, member successfully completed their
  career journey (typically after landing a role and no longer needing FF)

## Automation
Badges are awarded automatically via triggers wherever we already have the
data to know a milestone was hit:
  - membership badges sync off member_profiles.plan_id / subscription_status
  - 'first-step' off onboarding_completed
  - 'search-ready' off search_readiness_score reaching 100
  - 'interview-secured' / 'offer-earned' / 'hired' off applications.status

A generic `award_badge(uuid, text)` SECURITY DEFINER function is exposed for
milestones that need to be triggered from application code or by a strategist/
admin (e.g. 30/90 Days Forward, Moving Up, Goal Achieved, Career Builder,
One Year Forward -- these depend on dates or judgment calls outside the DB).

## RLS
- `badges`: readable by all authenticated users
- `member_badges`: members can read their own; strategists/admins can read all
  for their assigned members; only admins can write directly (automation uses
  SECURITY DEFINER functions, which bypass RLS by design)
*/

-- ============================================================
-- MEMBER_PROFILES: special manual status flags
-- ============================================================
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS is_lifetime_founding boolean DEFAULT false;
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS is_alumni boolean DEFAULT false;

-- ============================================================
-- BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  badge_type text NOT NULL CHECK (badge_type IN ('membership', 'achievement')),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Award',
  color_scheme text DEFAULT 'green',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_badges" ON badges;
CREATE POLICY "authenticated_read_badges"
  ON badges FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_badges" ON badges;
CREATE POLICY "admin_write_badges"
  ON badges FOR ALL
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- MEMBER_BADGES JOIN TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS member_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_member_badges" ON member_badges;
CREATE POLICY "select_own_member_badges"
  ON member_badges FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM strategist_assignments sa
      WHERE sa.member_id = member_badges.user_id
        AND sa.strategist_id = auth.uid()
        AND sa.is_active = true
    )
  );

DROP POLICY IF EXISTS "admin_write_member_badges" ON member_badges;
CREATE POLICY "admin_write_member_badges"
  ON member_badges FOR ALL
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- SEED BADGES
-- ============================================================
INSERT INTO badges (slug, badge_type, name, description, icon, color_scheme, sort_order) VALUES
  ('founding-member', 'membership', 'Founding Member', 'Joined during our founding period.', 'Leaf', 'green', 1),
  ('career-growth', 'membership', 'Career Growth', 'Active Career Growth Membership.', 'TrendingUp', 'green', 2),
  ('concierge-member', 'membership', 'Concierge Member', 'Premium Concierge Membership.', 'Gem', 'gold', 3),
  ('lifetime-founding', 'membership', 'Lifetime Founding', 'Original founding member with lifetime status.', 'Sparkles', 'navy', 4),
  ('alumni', 'membership', 'Alumni', 'Successfully completed their career journey.', 'CheckCircle2', 'silver', 5),

  ('search-ready', 'achievement', 'Search Ready', 'Reached 100% Search Readiness.', 'CheckCircle2', 'green', 10),
  ('first-step', 'achievement', 'First Step', 'Completed the Career Wizard.', 'FileText', 'green', 11),
  ('interview-secured', 'achievement', 'Interview Secured', 'Received your first interview.', 'MessageSquare', 'green', 12),
  ('offer-earned', 'achievement', 'Offer Earned', 'Received a job offer.', 'Briefcase', 'green', 13),
  ('hired', 'achievement', 'Hired!', 'Landed your new position.', 'Trophy', 'green', 14),
  ('30-days-forward', 'achievement', '30 Days Forward', 'Completed your first 30 days.', 'CalendarCheck', 'blue', 15),
  ('90-days-forward', 'achievement', '90 Days Forward', 'Completed your first 90 days.', 'CalendarCheck', 'blue', 16),
  ('moving-up', 'achievement', 'Moving Up', 'Received a promotion.', 'TrendingUp', 'purple', 17),
  ('goal-achieved', 'achievement', 'Goal Achieved', 'Achieved a major career goal.', 'Target', 'purple', 18),
  ('career-builder', 'achievement', 'Career Builder', 'Completed a Career Roadmap.', 'Star', 'gold', 19),
  ('one-year-forward', 'achievement', 'One Year Forward', 'Celebrated one year with FreshlyForward.', 'Medal', 'navy', 20)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- AWARD_BADGE FUNCTION (SECURITY DEFINER, generic entry point)
-- ============================================================
CREATE OR REPLACE FUNCTION award_badge(p_user_id uuid, p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_id uuid;
BEGIN
  SELECT id INTO v_badge_id FROM badges WHERE slug = p_slug AND is_active = true;
  IF v_badge_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO member_badges (user_id, badge_id)
  VALUES (p_user_id, v_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION award_badge(uuid, text) TO authenticated;

-- ============================================================
-- TRIGGER: sync membership badges off member_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION sync_membership_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_slug text;
BEGIN
  IF NEW.plan_id IS NOT NULL AND NEW.subscription_status IN ('active', 'trialing', 'past_due') THEN
    SELECT slug INTO v_plan_slug FROM membership_plans WHERE id = NEW.plan_id;

    IF v_plan_slug = 'founding-member' THEN
      PERFORM award_badge(NEW.user_id, 'founding-member');
    ELSIF v_plan_slug = 'career-growth' THEN
      PERFORM award_badge(NEW.user_id, 'career-growth');
    ELSIF v_plan_slug = 'career-concierge' THEN
      PERFORM award_badge(NEW.user_id, 'concierge-member');
    END IF;
  END IF;

  IF NEW.is_lifetime_founding = true THEN
    PERFORM award_badge(NEW.user_id, 'lifetime-founding');
  END IF;

  IF NEW.is_alumni = true THEN
    PERFORM award_badge(NEW.user_id, 'alumni');
  END IF;

  IF NEW.onboarding_completed = true THEN
    PERFORM award_badge(NEW.user_id, 'first-step');
  END IF;

  IF NEW.search_readiness_score >= 100 THEN
    PERFORM award_badge(NEW.user_id, 'search-ready');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_membership_badges ON member_profiles;
CREATE TRIGGER trg_sync_membership_badges
  AFTER INSERT OR UPDATE OF plan_id, subscription_status, is_lifetime_founding, is_alumni,
    onboarding_completed, search_readiness_score
  ON member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_membership_badges();

-- ============================================================
-- TRIGGER: sync achievement badges off applications.status
-- ============================================================
CREATE OR REPLACE FUNCTION sync_application_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('interview_requested', 'interview_scheduled') THEN
    PERFORM award_badge(NEW.member_id, 'interview-secured');
  ELSIF NEW.status = 'offer_received' THEN
    PERFORM award_badge(NEW.member_id, 'offer-earned');
  ELSIF NEW.status = 'offer_accepted' THEN
    PERFORM award_badge(NEW.member_id, 'hired');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_application_badges ON applications;
CREATE TRIGGER trg_sync_application_badges
  AFTER INSERT OR UPDATE OF status ON applications
  FOR EACH ROW
  EXECUTE FUNCTION sync_application_badges();

-- ============================================================
-- BACKFILL: run sync once for all existing member_profiles
-- (touches a watched column so the AFTER UPDATE OF trigger actually fires)
-- ============================================================
UPDATE member_profiles SET plan_id = plan_id;
