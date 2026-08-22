ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id text;
