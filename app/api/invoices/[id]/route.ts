import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase";
import type { InvoiceStatus } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const allowedFields = ["status", "client_name", "client_email", "invoice_number", "amount", "currency", "due_date"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const validStatuses: InvoiceStatus[] = ["pending", "chasing", "paid", "escalated", "cancelled"];
    if (updates.status && !validStatuses.includes(updates.status as InvoiceStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoice, error } = await (supabase as any).from("invoices")
      .update(updates).eq("id", id).eq("user_id", user.id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invoice });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
