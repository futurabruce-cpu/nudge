/**
 * app/api/cron/nudge/route.ts
 * GET /api/cron/nudge — automated invoice chasing cron endpoint
 *
 * Secured via CRON_SECRET header. Set this to a long random string and
 * pass it from your cron provider (Vercel Cron, GitHub Actions, etc.).
 *
 * TODO: Set env var CRON_SECRET=<long-random-string>
 * TODO: Configure your cron provider to hit GET /api/cron/nudge daily,
 *       passing header: Authorization: Bearer <CRON_SECRET>
 *
 * Schedule logic (days since due_date):
 *   nudge_count 0 → send nudge 1 at day 3  (polite)
 *   nudge_count 1 → send nudge 2 at day 7  (firm)
 *   nudge_count 2 → send nudge 3 at day 14 (final notice)
 *   nudge_count 3 → send nudge 4 at day 30 (accountant referral)
 *   nudge_count 4+ → escalate status, no further emails
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { sendNudgeEmail, getNudgeLevel } from "@/lib/email";
import type { NudgeLevel } from "@/lib/email";
import type { Invoice } from "@/lib/supabase";

// Days overdue thresholds — must match lib/email.ts schedule
const NUDGE_SCHEDULE: Record<number, number> = {
  1: 3,   // nudge_count 0 → send at day 3
  2: 7,   // nudge_count 1 → send at day 7
  3: 14,  // nudge_count 2 → send at day 14
  4: 30,  // nudge_count 3 → send at day 30
};

export async function GET(req: NextRequest) {
  // ---------------------------------------------------------------------------
  // Auth: verify CRON_SECRET
  // ---------------------------------------------------------------------------
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/nudge] CRON_SECRET env var not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---------------------------------------------------------------------------
  // Fetch invoices eligible for nudging (pending or chasing, not paid/cancelled)
  // ---------------------------------------------------------------------------
  const supabase = createAdminSupabaseClient();

  const { data: invoices, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .in("status", ["pending", "chasing"])
    .lt("nudge_count", 4); // don't re-process fully escalated invoices here

  if (fetchError) {
    console.error("[cron/nudge] Failed to fetch invoices:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ message: "No invoices to process", processed: 0 });
  }

  // ---------------------------------------------------------------------------
  // Process each invoice
  // ---------------------------------------------------------------------------
  const results = {
    processed: 0,
    nudged: 0,
    escalated: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{
      invoiceId: string;
      invoiceNumber: string;
      action: string;
      nudgeLevel?: number;
      error?: string;
    }>,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const invoice of invoices as Invoice[]) {
    results.processed++;

    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysSinceDue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Not yet overdue — skip
    if (daysSinceDue < 3) {
      results.skipped++;
      results.details.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        action: "skipped",
      });
      continue;
    }

    // Determine if a nudge is due
    const nudgeLevel = getNudgeLevel(invoice);

    if (nudgeLevel === null) {
      // Already sent all nudges but count < 4 — shouldn't normally happen
      results.skipped++;
      results.details.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        action: "skipped (no nudge due)",
      });
      continue;
    }

    // ---------------------------------------------------------------------------
    // Send email
    // ---------------------------------------------------------------------------
    try {
      const emailResult = await sendNudgeEmail(invoice, nudgeLevel as NudgeLevel);
      const newNudgeCount = invoice.nudge_count + 1;
      const shouldEscalate = newNudgeCount >= 4;

      // Update invoice regardless of email success so we don't spam on failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("invoices")
        .update({
          nudge_count: newNudgeCount,
          last_nudge_sent_at: new Date().toISOString(),
          status: shouldEscalate
            ? "escalated"
            : invoice.status === "pending"
            ? "chasing" // first nudge upgrades status from pending → chasing
            : invoice.status,
        })
        .eq("id", invoice.id);

      if (updateError) {
        console.error(`[cron/nudge] Failed to update invoice ${invoice.id}:`, updateError);
      }

      if (emailResult.success) {
        results.nudged++;
        if (shouldEscalate) results.escalated++;
        results.details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          action: shouldEscalate ? "escalated" : "nudged",
          nudgeLevel,
        });
      } else {
        results.errors++;
        console.error(
          `[cron/nudge] Email failed for invoice ${invoice.id}:`,
          emailResult.error
        );
        results.details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          action: "email_failed",
          nudgeLevel,
          error: emailResult.error,
        });
      }
    } catch (err) {
      results.errors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[cron/nudge] Unexpected error for invoice ${invoice.id}:`, err);
      results.details.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        action: "error",
        error: message,
      });
    }
  }

  console.log("[cron/nudge] Run complete:", results);
  return NextResponse.json(results);
}
