/**
 * lib/supabase.ts
 * Supabase client setup for Nudge.
 *
 * Two clients are exported:
 *  - `supabase`        → anon/public client (uses user's JWT via cookies, respects RLS)
 *  - `supabaseAdmin`   → service-role client (bypasses RLS — cron/webhooks only)
 *
 * TODO: Set the following env vars in .env.local (and in your deployment):
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   ← NEVER expose client-side
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type InvoiceStatus =
  | "pending"
  | "chasing"
  | "paid"
  | "escalated"
  | "cancelled";

export interface Invoice {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string; // ISO date string
  status: InvoiceStatus;
  nudge_count: number;
  last_nudge_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_sub_id: string | null;
  status: "active" | "inactive" | "past_due" | "cancelled" | "trialing";
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Invoice, "id" | "created_at" | "updated_at">>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Subscription, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/**
 * Public client — use in API routes where you pass the user's auth token.
 * Respects Row Level Security.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // server-side: never persist sessions
    autoRefreshToken: false,
  },
});

/**
 * Admin client — use only in server-side code (cron, webhooks).
 * Bypasses RLS. Never expose the service role key to the browser.
 */
export function getSupabaseAdmin() {
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Create a Supabase client authenticated as the current user.
 * Pass the Authorization header from the incoming request.
 */
export function getSupabaseUser(authHeader: string | null) {
  if (!authHeader) throw new Error("Missing Authorization header");
  const token = authHeader.replace("Bearer ", "");
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
