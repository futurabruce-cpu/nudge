-- Nudge - Supabase Schema
-- Users are handled by Supabase Auth (auth.users table)
-- This schema extends the auth layer with invoice tracking

-- Enable UUID extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Client info
  client_name      TEXT NOT NULL,
  client_email     TEXT NOT NULL,

  -- Invoice details
  invoice_number   TEXT NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency         CHAR(3) NOT NULL DEFAULT 'GBP',
  due_date         DATE NOT NULL,

  -- Workflow state
  -- pending    → invoice logged, not yet overdue
  -- chasing    → overdue, nudges are being sent
  -- paid       → marked paid by user, no further nudges
  -- escalated  → past day-30 final notice stage
  -- cancelled  → user cancelled the chase
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'chasing', 'paid', 'escalated', 'cancelled')),

  -- Nudge tracking
  nudge_count          INTEGER NOT NULL DEFAULT 0,
  last_nudge_sent_at   TIMESTAMPTZ,

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- Users can only see/modify their own invoices
-- ---------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (used by cron job)
-- The cron endpoint uses the service role key, which bypasses RLS automatically.

-- ---------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------
CREATE INDEX idx_invoices_user_id        ON public.invoices (user_id);
CREATE INDEX idx_invoices_status         ON public.invoices (status);
CREATE INDEX idx_invoices_due_date       ON public.invoices (due_date);
CREATE INDEX idx_invoices_last_nudge     ON public.invoices (last_nudge_sent_at);

-- ---------------------------------------------------------------
-- USER SUBSCRIPTIONS (mirrors Stripe state)
-- Populated/updated via Stripe webhook
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id  TEXT UNIQUE,
  stripe_sub_id       TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'inactive'
                      CHECK (status IN ('active', 'inactive', 'past_due', 'cancelled', 'trialing')),
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_subscriptions_user_id   ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_status    ON public.subscriptions (status);
