import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_ID, getOrCreateStripeCustomer } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_ID env var" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // Get or create a Stripe customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      user.email ?? "",
      user.user_metadata?.full_name
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: stripeCustomerId,
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] Error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
