/*
# Phase 3 — Membership System, Onboarding, Career Concierge

## Overview
Creates the complete database schema for FreshlyForward's membership platform:
- Membership plans (admin-configurable)
- Member profiles (career profiles populated from questionnaire)
- Guided questionnaire responses (autosaved per section)
- Career timeline events
- Document uploads (resume, cover letter, etc.)
- Stripe customer/subscriptions linking
- Discount/promo codes
- Friday progress reports
- Messages between members and career strategists
- Mock interview scheduling
- Career success workspace items
- Onboarding progress tracking

## New Tables
1. `membership_plans` — Configurable plans (admin can edit pricing, enable/disable, feature, archive)
2. `member_profiles` — Career profiles linked to auth.users, populated from questionnaire
3. `questionnaire_responses` — Autosaved questionnaire data per section
4. `career_timeline` — Timeline events for each member
5. `member_documents` — Uploaded documents (resume, cover letter, etc.)
6. `stripe_customers` — Links Stripe customer IDs to auth users
7. `discount_codes` — Promo/founding member discount codes
8. `friday_reports` — Weekly Friday progress reports
9. `messages` — Direct messages between members and career strategists
10. `mock_interviews` — Scheduled mock interviews
11. `career_success_items` — Career Success workspace items (coming soon features)
12. `onboarding_progress` — Tracks onboarding step completion

## Security
- RLS enabled on all tables
- Owner-scoped policies using auth.uid() for member data
- Public read on membership_plans (so pricing page works without auth)
- Admin-only write on membership_plans (via service role / admin check)
- Public read on discount_codes for validation at checkout
*/

-- ============================================================
-- MEMBERSHIP PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  stripe_price_id text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  promotional_text text,
  is_featured boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_membership_plans" ON membership_plans;
CREATE POLICY "public_read_membership_plans"
  ON membership_plans FOR SELECT
  TO anon, authenticated
  USING (is_enabled = true AND is_archived = false);

DROP POLICY IF EXISTS "admin_write_membership_plans" ON membership_plans;
CREATE POLICY "admin_write_membership_plans"
  ON membership_plans FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'));

-- ============================================================
-- MEMBER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES membership_plans(id),
  status text NOT NULL DEFAULT 'pending_onboarding',
  -- Career snapshot
  headline text,
  summary text,
  -- Personal info
  full_name text,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  -- Employment history (JSON array)
  employment_history jsonb DEFAULT '[]'::jsonb,
  -- Education (JSON array)
  education jsonb DEFAULT '[]'::jsonb,
  -- Credentials
  certifications jsonb DEFAULT '[]'::jsonb,
  -- Skills
  skills jsonb DEFAULT '[]'::jsonb,
  -- Job preferences
  preferred_jobs jsonb DEFAULT '[]'::jsonb,
  jobs_to_avoid jsonb DEFAULT '[]'::jsonb,
  preferred_industries jsonb DEFAULT '[]'::jsonb,
  -- Compensation
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'USD',
  preferred_benefits jsonb DEFAULT '[]'::jsonb,
  -- Availability
  schedule_preference text,
  max_commute_minutes integer,
  remote_preference text,
  willing_to_relocate boolean,
  travel_willingness text,
  work_style text,
  -- Career goals
  career_goals text,
  strengths text,
  weaknesses text,
  jobs_enjoyed text,
  jobs_not_enjoyed text,
  motivators text,
  biggest_challenge text,
  -- Authorization
  application_authorized boolean NOT NULL DEFAULT false,
  electronic_consent boolean NOT NULL DEFAULT false,
  consent_date timestamptz,
  -- Search readiness
  search_readiness_score integer NOT NULL DEFAULT 0,
  -- Onboarding
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamptz,
  -- Stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text DEFAULT 'none',
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON member_profiles;
CREATE POLICY "select_own_profile"
  ON member_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON member_profiles;
CREATE POLICY "insert_own_profile"
  ON member_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON member_profiles;
CREATE POLICY "update_own_profile"
  ON member_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- QUESTIONNAIRE RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_complete boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, section_key)
);

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_questionnaire" ON questionnaire_responses;
CREATE POLICY "select_own_questionnaire"
  ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_questionnaire" ON questionnaire_responses;
CREATE POLICY "insert_own_questionnaire"
  ON questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_questionnaire" ON questionnaire_responses;
CREATE POLICY "update_own_questionnaire"
  ON questionnaire_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_questionnaire" ON questionnaire_responses;
CREATE POLICY "delete_own_questionnaire"
  ON questionnaire_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- CAREER TIMELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS career_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_description text,
  event_date timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_timeline" ON career_timeline;
CREATE POLICY "select_own_timeline"
  ON career_timeline FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_timeline" ON career_timeline;
CREATE POLICY "insert_own_timeline"
  ON career_timeline FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_timeline" ON career_timeline;
CREATE POLICY "update_own_timeline"
  ON career_timeline FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_timeline" ON career_timeline;
CREATE POLICY "delete_own_timeline"
  ON career_timeline FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- MEMBER DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  storage_bucket text NOT NULL DEFAULT 'member-documents',
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON member_documents;
CREATE POLICY "select_own_documents"
  ON member_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON member_documents;
CREATE POLICY "insert_own_documents"
  ON member_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON member_documents;
CREATE POLICY "delete_own_documents"
  ON member_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  stripe_coupon_id text,
  max_redemptions integer,
  times_redeemed integer NOT NULL DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_founding_member boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_discounts" ON discount_codes;
CREATE POLICY "public_read_active_discounts"
  ON discount_codes FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ============================================================
-- FRIDAY REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS friday_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  opportunities_reviewed integer DEFAULT 0,
  applications_submitted integer DEFAULT 0,
  interviews_scheduled integer DEFAULT 0,
  next_steps text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE friday_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON friday_reports;
CREATE POLICY "select_own_reports"
  ON friday_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reports" ON friday_reports;
CREATE POLICY "insert_own_reports"
  ON friday_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'member',
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- MOCK INTERVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  focus_area text,
  status text NOT NULL DEFAULT 'scheduled',
  feedback text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_interviews" ON mock_interviews;
CREATE POLICY "select_own_interviews"
  ON mock_interviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_interviews" ON mock_interviews;
CREATE POLICY "insert_own_interviews"
  ON mock_interviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_interviews" ON mock_interviews;
CREATE POLICY "update_own_interviews"
  ON mock_interviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CAREER SUCCESS ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS career_success_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_coming_soon boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_success_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_success_items" ON career_success_items;
CREATE POLICY "public_read_success_items"
  ON career_success_items FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ============================================================
-- ONBOARDING PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'welcome',
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_onboarding" ON onboarding_progress;
CREATE POLICY "select_own_onboarding"
  ON onboarding_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_onboarding" ON onboarding_progress;
CREATE POLICY "insert_own_onboarding"
  ON onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_onboarding" ON onboarding_progress;
CREATE POLICY "update_own_onboarding"
  ON onboarding_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_membership_plans_sort ON membership_plans(sort_order) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_member_profiles_user ON member_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_user_section ON questionnaire_responses(user_id, section_key);
CREATE INDEX IF NOT EXISTS idx_career_timeline_user ON career_timeline(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_documents_user ON member_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_friday_reports_user ON friday_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_user ON mock_interviews(user_id, scheduled_at DESC);
