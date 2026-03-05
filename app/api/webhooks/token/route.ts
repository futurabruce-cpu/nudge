import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase";
import { deriveWebhookToken } from "@/lib/webhook";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseUser(req.headers.get("Authorization"));
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = deriveWebhookToken(user.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const webhookUrl = `${appUrl}/api/webhooks/incoming?token=${token}`;

    return NextResponse.json({ token, webhookUrl });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
