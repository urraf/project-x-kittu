import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { hitLimit, peekLimit } from "@/lib/auth/rate-limit";
import { ConfigError, env } from "@/lib/env";
import { tooMany, unauthorized } from "@/lib/http";
import { logger } from "@/lib/logger";

function digest(v: string) {
  return createHash("sha256").update(v).digest();
}

function secretMatches(req: NextRequest, secret: string) {
  const auth = req.headers.get("authorization");
  const provided = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : req.headers.get("x-cron-secret")?.trim();
  if (!provided) return false;
  return timingSafeEqual(digest(provided), digest(secret));
}

/**
 * Guards external-cron endpoints: `Authorization: Bearer <CRON_SECRET>` (or
 * `x-cron-secret`). Repeated bad attempts from one IP are rate limited.
 */
export async function assertCronSecret(req: NextRequest, ip: string, requestId: string) {
  const secret = env.cronSecret;
  if (!secret || secret.length < 24) throw new ConfigError("CRON_SECRET is not configured (min 24 characters).");

  const badKey = `cron-auth:${ip}`;
  const state = await peekLimit(badKey, 10);
  if (!state.allowed) throw tooMany("Too many unauthorized attempts.", state.retryAfterSec);

  if (!secretMatches(req, secret)) {
    await hitLimit(badKey, 10, 60 * 60 * 1000);
    logger.warn("automation.unauthorized", { ip, requestId });
    throw unauthorized("Invalid or missing cron secret.");
  }
}
