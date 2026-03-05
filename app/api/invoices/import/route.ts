import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase";

export interface ImportRow {
  client_name: string;
  client_email: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  currency?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  // Try DD/MM/YYYY
  const dmy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Try MM/DD/YYYY
  const mdy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return null;
}

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "_").trim();
}

function getField(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    for (const key of Object.keys(row)) {
      if (normaliseKey(key) === alias) return row[key]?.trim() ?? "";
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ error: "CSV is empty or missing header row" }, { status: 400 });

    // Parse header
    const header = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
      return Object.fromEntries(header.map((h, i) => [h, values[i] ?? ""]));
    });

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, +1 for header

      const client_name   = getField(row, "client_name", "client", "name", "customer_name", "customer");
      const client_email  = getField(row, "client_email", "email", "customer_email", "billing_email");
      const invoice_number = getField(row, "invoice_number", "invoice_no", "invoice_#", "number", "ref");
      const amount_raw    = getField(row, "amount", "total", "invoice_amount", "value");
      const due_date_raw  = getField(row, "due_date", "due", "payment_due", "due_by");
      const currency      = getField(row, "currency", "currency_code") || "GBP";

      // Validate required fields
      if (!client_name || !client_email || !invoice_number || !amount_raw || !due_date_raw) {
        result.errors.push({ row: rowNum, reason: "Missing required fields (client name, email, invoice number, amount, due date)" });
        result.skipped++;
        continue;
      }

      // Validate email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
        result.errors.push({ row: rowNum, reason: `Invalid email: ${client_email}` });
        result.skipped++;
        continue;
      }

      // Parse amount
      const amount = parseFloat(amount_raw.replace(/[£$€,]/g, ""));
      if (isNaN(amount) || amount <= 0) {
        result.errors.push({ row: rowNum, reason: `Invalid amount: ${amount_raw}` });
        result.skipped++;
        continue;
      }

      // Parse date
      const due_date = parseDate(due_date_raw);
      if (!due_date) {
        result.errors.push({ row: rowNum, reason: `Could not parse due date: ${due_date_raw}` });
        result.skipped++;
        continue;
      }

      // Insert
      const { error } = await (supabase as any).from("invoices").insert({
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
      });

      if (error) {
        result.errors.push({ row: rowNum, reason: error.message });
        result.skipped++;
      } else {
        result.imported++;
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
