/**
 * lib/email.ts
 * Resend email client + escalation email templates for Nudge.
 *
 * Escalation schedule (days since due_date):
 *   nudge_count 1 → Day  3  — Polite reminder
 *   nudge_count 2 → Day  7  — Firm reminder
 *   nudge_count 3 → Day 14  — Final notice
 *   nudge_count 4 → Day 30  — Accountant referral warning
 *
 * TODO: Set the following env vars:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *   NUDGE_FROM_EMAIL=nudge@yourdomain.com   (must be a verified Resend domain)
 *   NUDGE_APP_URL=https://yourdomain.com    (used for unsubscribe/pay links)
 */

import { Resend } from "resend";
import type { Invoice } from "./supabase";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
// TODO: Add RESEND_API_KEY to your environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.NUDGE_FROM_EMAIL ?? "nudge@example.com"; // TODO: set NUDGE_FROM_EMAIL
const APP_URL =
  process.env.NUDGE_APP_URL ?? "https://nudge.example.com"; // TODO: set NUDGE_APP_URL

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type NudgeLevel = 1 | 2 | 3 | 4;

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

function buildPoliteReminder(invoice: Invoice): {
  subject: string;
  html: string;
  text: string;
} {
  const amount = formatCurrency(invoice.amount, invoice.currency);
  const dueDate = formatDate(invoice.due_date);
  const subject = `Friendly reminder: Invoice ${invoice.invoice_number} — ${amount} overdue`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #2563eb;">Payment Reminder</h2>
      <p>Hi ${invoice.client_name},</p>
      <p>
        I hope this finds you well. I'm just following up on invoice
        <strong>${invoice.invoice_number}</strong> for <strong>${amount}</strong>,
        which was due on ${dueDate}.
      </p>
      <p>
        It may have slipped through the cracks — these things happen! Could you let me
        know when payment will be processed?
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Invoice Number</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${invoice.invoice_number}</strong></td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Amount Due</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${amount}</strong></td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Due Date</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${dueDate}</td>
        </tr>
      </table>
      <p>Please don't hesitate to reach out if you have any questions.</p>
      <p>Thanks,<br/>Nudge Automated Billing</p>
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        This is an automated reminder. If payment has already been sent, please ignore this email.
        <a href="${APP_URL}" style="color: #2563eb;">Manage invoice</a>
      </p>
    </div>
  `;

  const text = `Payment Reminder\n\nHi ${invoice.client_name},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} for ${amount} was due on ${dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nIf you have any questions, feel free to reply to this email.\n\nThanks,\nNudge Automated Billing`;

  return { subject, html, text };
}

function buildFirmReminder(invoice: Invoice): {
  subject: string;
  html: string;
  text: string;
} {
  const amount = formatCurrency(invoice.amount, invoice.currency);
  const dueDate = formatDate(invoice.due_date);
  const subject = `[Action Required] Invoice ${invoice.invoice_number} — ${amount} now 7 days overdue`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #d97706;">Second Payment Reminder</h2>
      <p>Hi ${invoice.client_name},</p>
      <p>
        I'm following up again on invoice <strong>${invoice.invoice_number}</strong> for
        <strong>${amount}</strong>, which was due on ${dueDate} and is now
        <strong>7 days overdue</strong>.
      </p>
      <p>
        Please arrange payment as soon as possible. If there's an issue with the invoice
        or payment terms, I'd appreciate hearing from you so we can resolve this quickly.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
        <tr style="background: #fef3c7;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Invoice Number</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${invoice.invoice_number}</strong></td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Amount Due</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${amount}</strong></td>
        </tr>
        <tr style="background: #fef3c7;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Original Due Date</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">Days Overdue</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #d97706;"><strong>7 days</strong></td>
        </tr>
      </table>
      <p>
        <strong>Please reply to this email or make payment immediately.</strong>
      </p>
      <p>Regards,<br/>Nudge Automated Billing</p>
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        This is an automated reminder. If payment has already been sent, please ignore this email.
      </p>
    </div>
  `;

  const text = `Second Payment Reminder\n\nHi ${invoice.client_name},\n\nThis is a follow-up on invoice ${invoice.invoice_number} for ${amount}, which was due on ${dueDate} and is now 7 days overdue.\n\nPlease arrange payment immediately or contact us if there's an issue.\n\nRegards,\nNudge Automated Billing`;

  return { subject, html, text };
}

function buildFinalNotice(invoice: Invoice): {
  subject: string;
  html: string;
  text: string;
} {
  const amount = formatCurrency(invoice.amount, invoice.currency);
  const dueDate = formatDate(invoice.due_date);
  const subject = `FINAL NOTICE: Invoice ${invoice.invoice_number} — ${amount} — 14 days overdue`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #dc2626;">⚠️ Final Payment Notice</h2>
      <p>Hi ${invoice.client_name},</p>
      <p>
        Despite two previous reminders, invoice <strong>${invoice.invoice_number}</strong> for
        <strong>${amount}</strong> remains unpaid. This invoice was due on ${dueDate}
        and is now <strong>14 days overdue</strong>.
      </p>
      <p style="color: #dc2626; font-weight: bold;">
        This is a final notice before this matter is referred to a debt recovery specialist.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
        <tr style="background: #fee2e2;">
          <td style="padding: 12px; border: 1px solid #fca5a5;">Invoice Number</td>
          <td style="padding: 12px; border: 1px solid #fca5a5;"><strong>${invoice.invoice_number}</strong></td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #fca5a5;">Amount Due</td>
          <td style="padding: 12px; border: 1px solid #fca5a5;"><strong>${amount}</strong></td>
        </tr>
        <tr style="background: #fee2e2;">
          <td style="padding: 12px; border: 1px solid #fca5a5;">Original Due Date</td>
          <td style="padding: 12px; border: 1px solid #fca5a5;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #fca5a5;">Days Overdue</td>
          <td style="padding: 12px; border: 1px solid #fca5a5; color: #dc2626;"><strong>14 days</strong></td>
        </tr>
      </table>
      <p>
        <strong>Payment must be received within 7 days to avoid escalation.</strong>
      </p>
      <p>Regards,<br/>Nudge Automated Billing</p>
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        This is an automated final notice. If payment has already been arranged, please contact us immediately.
      </p>
    </div>
  `;

  const text = `FINAL PAYMENT NOTICE\n\nHi ${invoice.client_name},\n\nDespite two previous reminders, invoice ${invoice.invoice_number} for ${amount} remains unpaid (due ${dueDate}, now 14 days overdue).\n\nThis is a final notice. Payment must be received within 7 days to avoid referral to a debt recovery specialist.\n\nRegards,\nNudge Automated Billing`;

  return { subject, html, text };
}

function buildAccountantReferral(invoice: Invoice): {
  subject: string;
  html: string;
  text: string;
} {
  const amount = formatCurrency(invoice.amount, invoice.currency);
  const dueDate = formatDate(invoice.due_date);
  const subject = `Debt Recovery Notice: Invoice ${invoice.invoice_number} — ${amount} referred for collection`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">Debt Recovery Notice</h2>
      <p>Hi ${invoice.client_name},</p>
      <p>
        Invoice <strong>${invoice.invoice_number}</strong> for <strong>${amount}</strong>
        (due ${dueDate}) is now <strong>30 days overdue</strong>.
      </p>
      <p>
        After multiple attempts to resolve this matter, this invoice has been
        <strong>referred to an accountant/debt recovery specialist</strong>
        for formal collection proceedings.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
        <tr style="background: #ede9fe;">
          <td style="padding: 12px; border: 1px solid #c4b5fd;">Invoice Number</td>
          <td style="padding: 12px; border: 1px solid #c4b5fd;"><strong>${invoice.invoice_number}</strong></td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #c4b5fd;">Amount Due</td>
          <td style="padding: 12px; border: 1px solid #c4b5fd;"><strong>${amount}</strong></td>
        </tr>
        <tr style="background: #ede9fe;">
          <td style="padding: 12px; border: 1px solid #c4b5fd;">Original Due Date</td>
          <td style="padding: 12px; border: 1px solid #c4b5fd;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #c4b5fd;">Days Overdue</td>
          <td style="padding: 12px; border: 1px solid #c4b5fd; color: #7c3aed;"><strong>30+ days</strong></td>
        </tr>
      </table>
      <p>
        To stop further action and potential additional fees, please arrange payment
        <strong>immediately</strong>. Contact us directly to discuss settlement.
      </p>
      <p>Regards,<br/>Nudge Automated Billing</p>
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        This is a formal notice. Please do not ignore this communication.
      </p>
    </div>
  `;

  const text = `Debt Recovery Notice\n\nHi ${invoice.client_name},\n\nInvoice ${invoice.invoice_number} for ${amount} (due ${dueDate}) is now 30+ days overdue.\n\nThis invoice has been referred to an accountant/debt recovery specialist for formal collection proceedings.\n\nTo stop further action, please arrange payment immediately.\n\nRegards,\nNudge Automated Billing`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Send the appropriate escalation email based on nudge level.
 * nudge_count is the CURRENT count before this send — we bump it externally.
 */
export async function sendNudgeEmail(
  invoice: Invoice,
  nudgeLevel: NudgeLevel
): Promise<EmailResult> {
  let template: { subject: string; html: string; text: string };

  switch (nudgeLevel) {
    case 1:
      template = buildPoliteReminder(invoice);
      break;
    case 2:
      template = buildFirmReminder(invoice);
      break;
    case 3:
      template = buildFinalNotice(invoice);
      break;
    case 4:
      template = buildAccountantReferral(invoice);
      break;
    default:
      return { success: false, error: `Unknown nudge level: ${nudgeLevel}` };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: invoice.client_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Determine which nudge level should be sent for an invoice,
 * based on days since due_date.
 * Returns null if no nudge is due yet.
 */
export function getNudgeLevel(invoice: Invoice): NudgeLevel | null {
  const today = new Date();
  const due = new Date(invoice.due_date);
  const daysSinceDue = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Not yet overdue
  if (daysSinceDue < 3) return null;

  const nudgeCount = invoice.nudge_count;

  // Already sent all 4 nudges
  if (nudgeCount >= 4) return null;

  // Determine the next nudge level and whether it's time
  const schedule: Record<NudgeLevel, number> = {
    1: 3,   // day 3
    2: 7,   // day 7
    3: 14,  // day 14
    4: 30,  // day 30
  };

  const nextLevel = (nudgeCount + 1) as NudgeLevel;
  const requiredDays = schedule[nextLevel];

  if (daysSinceDue >= requiredDays) {
    return nextLevel;
  }

  return null;
}
