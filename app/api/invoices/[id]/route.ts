/**
 * app/api/invoices/[id]/route.ts
 * PATCH  /api/invoices/:id  — update invoice (e.g. mark as paid, change status)
 * DELETE /api/invoices/:id  — delete an invoice
 *
 * Authentication: cookie-based Supabase session.
 * RLS ensures users can only modify their own invoices.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { InvoiceStatus } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/invoices/:id
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Allowlist the fields that can be updated via this endpoint
    const allowedFields: string[] = [
      "status",
      "client_name",
      "client_email",
      "invoice_number",
      "amount",
      "currency",
      "due_date",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate status if provided
    const validStatuses: InvoiceStatus[] = [
      "pending",
      "chasing",
      "paid",
      "escalated",
      "cancelled",
    ];
    if (updates.status && !validStatuses.includes(updates.status as InvoiceStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // RLS ensures user can only update their own invoices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoice, error } = await (supabase as any)
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id) // belt-and-suspenders: explicit user_id check
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/invoices/:id]", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoice });
  } catch (err) {
    console.error("[PATCH /api/invoices/:id] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/invoices/:id
// ---------------------------------------------------------------------------
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/invoices/:id]", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/invoices/:id] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
