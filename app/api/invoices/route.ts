/**
 * app/api/invoices/route.ts
 * GET  /api/invoices  — fetch all invoices for the authenticated user
 * POST /api/invoices  — create a new invoice
 *
 * Authentication: cookie-based Supabase session (set by @supabase/ssr).
 * RLS on the invoices table ensures users only see their own data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// ---------------------------------------------------------------------------
// GET /api/invoices
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("[GET /api/invoices]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[GET /api/invoices] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/invoices
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    const { client_name, client_email, invoice_number, amount, due_date, currency } = body;

    if (!client_name || !client_email || !invoice_number || !amount || !due_date) {
      return NextResponse.json(
        { error: "Missing required fields: client_name, client_email, invoice_number, amount, due_date" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoice, error } = await (supabase as any)
      .from("invoices")
      .insert({
        user_id: user.id, // always set from auth session — never trust client
        client_name,
        client_email,
        invoice_number,
        amount: Number(amount),
        currency: currency ?? "GBP",
        due_date,
        status: "pending",
        nudge_count: 0,
        last_nudge_sent_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/invoices]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
