import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: invoices, error } = await supabase
      .from("invoices").select("*").eq("user_id", user.id).order("due_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invoices });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { client_name, client_email, invoice_number, amount, due_date, currency } = body;

    if (!client_name || !client_email || !invoice_number || !amount || !due_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoice, error } = await (supabase as any).from("invoices").insert({
      user_id: user.id, client_name, client_email, invoice_number,
      amount: Number(amount), currency: currency ?? "GBP", due_date,
      status: "pending", nudge_count: 0, last_nudge_sent_at: null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
