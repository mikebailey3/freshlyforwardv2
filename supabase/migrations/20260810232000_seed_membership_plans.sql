/*
# Seed Membership Plans

## Purpose
The `membership_plans` table was created in phase3 but never seeded, and
`stripe_price_id` / `stripe_product_id` were never populated. That left the
public pricing page with nothing to render and checkout with no real Stripe
price to charge against. It also meant the feature_entitlement_system
migration's plan_features seed (which looks plans up by slug) had nothing
to attach to.

This migration seeds the four real FreshlyForward plans with their Stripe
product/price IDs so that:
  1. The pricing page has real data to display
  2. Checkout creates real Stripe sessions instead of falling back to dev mode
  3. plan_features / feature_entitlement_system can resolve slugs correctly

Idempotent via ON CONFLICT (slug) DO UPDATE, safe to re-run.
*/

INSERT INTO membership_plans
  (slug, name, description, price_cents, interval, stripe_price_id, stripe_product_id,
   features, badge, promotional_text, is_featured, is_enabled, is_archived, sort_order)
VALUES
  (
    'career-kickstart',
    'Career Kickstart',
    'A personalized career-start package designed to strengthen your job search. Includes a professional resume review and optimization, career-goal assessment, personalized job-search strategy, and recommendations from a FreshlyForward Career Strategist.',
    4900,
    'one-time',
    'price_1U31z92ZEWovO3fFi85CqNwH',
    'prod_V36pwdH8PbWaoS',
    '["Professional resume review & optimization","Career-goal assessment","Personalized job-search strategy","Recommendations from a Career Strategist"]'::jsonb,
    'One-time',
    NULL,
    false,
    true,
    false,
    0
  ),
  (
    'founding-member',
    'Founding Member',
    'Early-access Career Success Membership with personalized career guidance, hand-selected opportunities, hand-crafted applications, professional cover letters, weekly progress reports, and direct access to a Career Strategist.',
    3900,
    'month',
    'price_1U31z82ZEWovO3fFyUC9z7mj',
    'prod_V36Ukm3MXyBugM',
    '["Personalized career guidance","Hand-selected opportunities","Hand-crafted applications","Professional cover letters","Weekly progress reports","Direct access to a Career Strategist"]'::jsonb,
    NULL,
    NULL,
    false,
    true,
    false,
    1
  ),
  (
    'career-growth',
    'Career Growth',
    'Everything in Founding Member, plus weekly 30-minute mock interviews, deeper interview prep, resume updates, priority messaging, and career strategy reviews.',
    9900,
    'month',
    'price_1U32JY2ZEWovO3fF9tS0jxYS',
    'prod_V38azMCU2P9lhx',
    '["Everything in Founding Member","Weekly 30-minute mock interviews","Deeper interview prep","Resume updates","Priority messaging","Career strategy reviews"]'::jsonb,
    'Most Popular',
    NULL,
    true,
    true,
    false,
    2
  ),
  (
    'career-concierge',
    'Career Concierge',
    'Everything in Career Growth, plus workplace success coaching, promotion planning, compensation coaching, leadership development, quarterly career reviews, career roadmap, and ongoing resume maintenance.',
    19900,
    'month',
    'price_1U32Lc2ZEWovO3fF1FYzzxRo',
    'prod_V38cgsYX3VE2Ym',
    '["Everything in Career Growth","Workplace success coaching","Promotion planning & compensation coaching","Leadership development","Quarterly career reviews","Career roadmap","Ongoing resume maintenance"]'::jsonb,
    NULL,
    NULL,
    false,
    true,
    false,
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  is_featured = EXCLUDED.is_featured,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
