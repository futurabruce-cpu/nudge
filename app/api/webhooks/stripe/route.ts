import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhooks/stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  // Use any to bypass strict typing on subscriptions table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !stripeCustomerId || !stripeSubscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = subscription as any;
        const currentPeriodEnd = new Date(
          (subAny.current_period_end ?? 0) * 1000
        ).toISOString();

        const { error } = await db.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_sub_id: stripeSubscriptionId,
            status: "active",
            current_period_end: currentPeriodEnd,
          },
          { onConflict: "user_id" }
        );

        if (error) console.error("[webhooks/stripe] Failed to upsert subscription:", error);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = subscription as any;
        const currentPeriodEnd = new Date(
          (subAny.current_period_end ?? 0) * 1000
        ).toISOString();
        const status = subscription.status === "active" ? "active" : subscription.status;

        const { error } = await db
          .from("subscriptions")
          .update({ status, current_period_end: currentPeriodEnd })
          .eq("stripe_sub_id", subscription.id);

        if (error) console.error("[webhooks/stripe] Failed to update subscription:", error);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await db
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_sub_id", subscription.id);

        if (error) console.error("[webhooks/stripe] Failed to cancel subscription:", error);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[webhooks/stripe] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
