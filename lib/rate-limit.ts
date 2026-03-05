/**
 * Simple in-memory rate limiter.
 * Limits requests per IP per time window.
 * For production scale, replace with Redis.
 */

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requests.get(ip);

  if (!record || now > record.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}
