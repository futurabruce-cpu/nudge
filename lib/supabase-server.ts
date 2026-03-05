/**
 * lib/supabase-server.ts
 * Server-side Supabase clients for Nudge (Next.js App Router).
 *
 * Two helpers exported:
 *   createServerClient()  → cookie-based client for API routes/Server Components (respects RLS)
 *   createAdminClient()   → service-role client for cron/webhooks (bypasses RLS)
 *
 * TODO: Set these env vars in .env.local and your deployment:
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   ← NEVER expose client-side
 */

import { createServerClient as createSSRClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Cookie-based server client.
 * Reads the user session from cookies — use in API routes and Server Components.
 * Respects Row Level Security.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createSSRClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll may throw in read-only contexts (e.g. Server Components).
          // The session will still be read correctly.
        }
      },
    },
  });
}

/**
 * Service-role admin client.
 * Bypasses RLS — use ONLY in server-side cron jobs and webhooks.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminSupabaseClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
