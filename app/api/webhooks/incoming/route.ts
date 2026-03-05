/**
 * POST /api/webhooks/incoming?token=<webhook_token>
 *
 * Zapier / Make / n8n / any HTTP webhook can POST invoice data here.
 * Auth: the token in the query string is HMAC-SHA256(userId, WEBHOOK_SECRET).
 * Users find their personal URL in Settings → Webhook.
 *
 * Accepted payload (flexible field names):
 * {
 *   client_name:     string   (or: client, customer, customer_name)
 *   client_email:    string   (or: email, customer_email, billing_email)
 *   invoice_number:  string   (or: invoice_no, number, ref)
 *   amount:          number   (or: total, invoice_amount — strips £$€,)
 *   due_date:        string   (or: due, payment_due — YYYY-MM-DD or DD/MM/YYYY)
 *   currency?:       string   (default: GBP)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deriveWebhookToken, getField, parseDate } from "@/lib/webhook";

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    // Look up which user owns this token
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const user = users.find(u => deriveWebhookToken(u.id) === token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse body
    const body: Record<string, unknown> = await req.json();

    const client_name    = getField(body, "client_name", "client", "customer_name", "customer");
    const client_email   = getField(body, "client_email", "email", "customer_email", "billing_email");
    const invoice_number = getField(body, "invoice_number", "invoice_no", "number", "ref", "invoice_number");
    const amount_raw     = getField(body, "amount", "total", "invoice_amount", "value");
    const due_date_raw   = getField(body, "due_date", "due", "payment_due", "due_by");
    const currency       = getField(body, "currency", "currency_code") || "GBP";

    // Validate
    const missing = [];
    if (!client_name)    missing.push("client_name");
    if (!client_email)   missing.push("client_email");
    if (!invoice_number) missing.push("invoice_number");
    if (!amount_raw)     missing.push("amount");
    if (!due_date_raw)   missing.push("due_date");

    if (missing.length) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return NextResponse.json({ error: `Invalid email: ${client_email}` }, { status: 400 });
    }

    const amount = parseFloat(String(amount_raw).replace(/[£$€,]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: `Invalid amount: ${amount_raw}` }, { status: 400 });
    }

    const due_date = parseDate(due_date_raw);
    if (!due_date) {
      return NextResponse.json({ error: `Could not parse due_date: ${due_date_raw}` }, { status: 400 });
    }

    // Insert
    const { data: invoice, error: insertError } = await (supabaseAdmin as any)
      .from("invoices")
      .insert({
        user_id: user.id,
        client_name,
        client_email,
        invoice_number,
        amount,
        currency: currency.toUpperCase(),
        due_date,
        status: "pending",
        nudge_count: 0,
        last_nudge_sent_at: null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err: unknown) {
    console.error("[webhook/incoming]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
