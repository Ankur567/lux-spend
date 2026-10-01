import "server-only";
import { headers } from "next/headers";
import { AppError } from "./errors";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Pluggable rate limiter. The default in-memory store is per server instance,
 * which is adequate for a two-person app. For multi-region deployments swap in
 * a shared store (e.g. Upstash Redis) implementing the same interface.
 */
export interface RateLimiter {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const recent = (this.buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(now);
    this.buckets.set(key, recent);
    if (this.buckets.size > 10_000) this.sweep(now, windowMs);
    return { allowed, remaining: Math.max(0, limit - recent.length), resetAt: (recent[0] ?? now) + windowMs };
  }

  private sweep(now: number, windowMs: number) {
    for (const [key, hits] of this.buckets) {
      if (hits.every((t) => now - t >= windowMs)) this.buckets.delete(key);
    }
  }
}

const globalForLimiter = globalThis as unknown as { __rateLimiter?: RateLimiter };
export const rateLimiter: RateLimiter = (globalForLimiter.__rateLimiter ??= new MemoryRateLimiter());

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  inviteJoin: { limit: 10, windowMs: 15 * 60_000 },
  webhook: { limit: 120, windowMs: 60_000 },
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function enforceRateLimit(action: keyof typeof RATE_LIMITS, discriminator = ""): Promise<void> {
  const { limit, windowMs } = RATE_LIMITS[action];
  const ip = await clientIp();
  const result = await rateLimiter.hit(`${action}:${ip}:${discriminator}`, limit, windowMs);
  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
}
