import "server-only";
import { connectDB } from "@/lib/db/connect";
import { RateLimit } from "@/lib/models";

/**
 * Fixed-window rate limiter backed by MongoDB (works across serverless
 * instances, documents expire automatically via a TTL index).
 */

export type RateLimitState = { allowed: boolean; remaining: number; retryAfterSec: number };

export async function peekLimit(key: string, limit: number): Promise<RateLimitState> {
  await connectDB();
  const now = Date.now();
  const doc = await RateLimit.findById(key).lean();
  if (!doc || doc.resetAt.getTime() <= now) return { allowed: true, remaining: limit, retryAfterSec: 0 };
  const retryAfterSec = Math.ceil((doc.resetAt.getTime() - now) / 1000);
  return { allowed: doc.count < limit, remaining: Math.max(0, limit - doc.count), retryAfterSec };
}

export async function hitLimit(key: string, limit: number, windowMs: number): Promise<RateLimitState> {
  await connectDB();
  const now = new Date();
  let doc = await RateLimit.findOneAndUpdate(
    { _id: key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  ).lean();

  if (!doc) {
    const resetAt = new Date(now.getTime() + windowMs);
    doc = await RateLimit.findOneAndUpdate(
      { _id: key },
      { $set: { count: 1, resetAt, expiresAt: new Date(resetAt.getTime() + 60_000) } },
      { upsert: true, returnDocument: "after" },
    ).lean();
  }

  const count = doc!.count;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.ceil((doc!.resetAt.getTime() - now.getTime()) / 1000),
  };
}

export async function resetLimit(key: string) {
  await connectDB();
  await RateLimit.deleteOne({ _id: key });
}
