/**
 * lib/stripe.ts
 * Stripe client setup for Nudge.
 *
 * TODO: Set these env vars in .env.local and your deployment:
 *   STRIPE_SECRET_KEY=sk_live_xxxx   (or sk_test_xxxx for testing)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
 *   STRIPE_WEBHOOK_SECRET=whsec_xxxx  (from Stripe dashboard → Webhooks)
 *   STRIPE_PRICE_ID=price_xxxx        (your subscription price ID)
 */

import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Server-side Stripe client (secret key — never expose to browser)
// ---------------------------------------------------------------------------
if (!process.env.STRIPE_SECRET_KEY) {
  // Warn at import time so misconfiguration is caught early.
  // Not thrown so that Next.js can still build with placeholder envs.
  console.warn("[nudge/stripe] Missing env var: STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  // TODO: Update apiVersion when you upgrade the stripe package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2026-02-25.clover" as any,
  typescript: true,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stripe Price ID for the Nudge subscription plan. */
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
// TODO: Create a product + price in Stripe dashboard and set STRIPE_PRICE_ID.

/** Webhook signing secret — used to verify incoming Stripe events. */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
// TODO: Set STRIPE_WEBHOOK_SECRET from your Stripe dashboard → Webhooks.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve or create a Stripe customer for a given user.
 * Stores the customer ID in the `subscriptions` table via the admin client.
 *
 * TODO: Wire this up in your billing/checkout API route.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // TODO: Check subscriptions table for existing stripe_customer_id first.
  // If found, return it. Otherwise create a new customer and persist the ID.

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { supabase_user_id: userId },
  });

  return customer.id;
}

/**
 * Construct a Stripe webhook event from a raw request.
 * Use in your /api/webhooks/stripe route.
 *
 * TODO: Create app/api/webhooks/stripe/route.ts to handle:
 *   - checkout.session.completed  → activate subscription
 *   - customer.subscription.updated / deleted → update subscription status
 *   - invoice.payment_failed → mark subscription as past_due
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing env var: STRIPE_WEBHOOK_SECRET");
  }
  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}
