import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

// Tell Next.js not to parse the body — we need the raw bytes for signature verification
export const config = {
  api: { bodyParser: false },
};

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
          console.error("[webhooks/stripe] checkout.session.completed: missing required fields", {
            userId,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          break;
        }

        // Fetch the subscription to get the current_period_end
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const { error } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            status: "active",
            current_period_end: currentPeriodEnd,
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("[webhooks/stripe] Failed to upsert subscription:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const status = subscription.status === "active" ? "active" : subscription.status;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status,
            current_period_end: currentPeriodEnd,
          })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        if (error) {
          console.error("[webhooks/stripe] Failed to update subscription:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        if (error) {
          console.error("[webhooks/stripe] Failed to cancel subscription:", error);
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error("[webhooks/stripe] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
