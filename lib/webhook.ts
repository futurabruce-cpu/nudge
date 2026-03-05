import { createHmac } from "crypto";

/**
 * Derive a stable per-user webhook token from their user ID.
 * Rotating WEBHOOK_SECRET invalidates all existing tokens.
 */
export function deriveWebhookToken(userId: string): string {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing env var: WEBHOOK_SECRET");
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function verifyWebhookToken(token: string, userId: string): boolean {
  const expected = deriveWebhookToken(userId);
  return token === expected;
}

/**
 * Normalise an arbitrary object key to snake_case for field matching.
 */
export function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[\s\-]+/g, "_").trim();
}

/**
 * Extract a field from a payload trying multiple alias names.
 */
export function getField(payload: Record<string, unknown>, ...aliases: string[]): string {
  for (const alias of aliases) {
    for (const key of Object.keys(payload)) {
      if (normaliseKey(key) === alias) {
        const v = payload[key];
        return v != null ? String(v).trim() : "";
      }
    }
  }
  return "";
}

export function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const dmy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}
