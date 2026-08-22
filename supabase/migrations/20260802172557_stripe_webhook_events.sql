/*
# Stripe Webhook Events Table

## Overview
Creates a table to store Stripe webhook events for idempotent processing.
This ensures duplicate webhook deliveries do not cause double-processing.

## New Tables
1. `stripe_webhook_events` — Stores Stripe event IDs and payloads for deduplication

## Security
- RLS enabled but no client policies (only service role accesses this)
*/

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
