import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hitLimit, peekLimit } from "@/lib/auth/rate-limit";
import { ConfigError, env } from "@/lib/env";
import { ApiError, clientIp, errorResponse, readJson, tooMany, unauthorized } from "@/lib/http";
import { logger } from "@/lib/logger";
import { automationErrorToApi, runAutomation } from "@/lib/services/automation";

/**
 * External-cron entry point for fully automated blog generation & publishing.
 *
 *   POST /api/automation/generate-post
 *   Authorization: Bearer <CRON_SECRET>      (or header  x-cron-secret: <CRON_SECRET>)
 *   Idempotency-Key: <optional unique key>   (defaults to one key per IST day-slot)
 *   Content-Type: application/json           (body optional)
 *   { "topic"?, "category"?, "keywords"?, "publish"?: boolean, "dryRun"?: boolean, "force"?: boolean }
 *
 * There is intentionally no scheduler inside the app; schedule this URL in
 * your cron service. Responses: 201 created · 200 skipped/duplicate/dry_run ·
 * 401 bad secret · 409 already running · 429 too many bad attempts ·
 * 502 AI provider/validation error · 503 not configured · 500 unexpected.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  topic: z.string().trim().max(300).optional(),
  category: z.string().trim().max(60).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  notes: z.string().trim().max(1500).optional(),
  publish: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

function digest(v: string) {
  return createHash("sha256").update(v).digest();
}

function secretMatches(req: NextRequest, secret: string) {
  const auth = req.headers.get("authorization");
  const provided = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : req.headers.get("x-cron-secret")?.trim();
  if (!provided) return false;
  return timingSafeEqual(digest(provided), digest(secret));
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = clientIp(req);
  const started = Date.now();
  const respond = (res: NextResponse) => {
    res.headers.set("X-Request-Id", requestId);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  try {
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

    const body = bodySchema.parse(await readJson(req));
    logger.info("automation.request", { requestId, ip, dryRun: body.dryRun ?? false, force: body.force ?? false });

    const { httpStatus, ...result } = await runAutomation({
      trigger: "cron",
      idempotencyKey: req.headers.get("idempotency-key") ?? undefined,
      ip,
      force: body.force,
      dryRun: body.dryRun,
      publish: body.publish,
      generate: { topic: body.topic, category: body.category, keywords: body.keywords, notes: body.notes },
    });

    logger.info("automation.response", { requestId, status: result.status, httpStatus, ms: Date.now() - started });
    return respond(NextResponse.json({ ok: httpStatus < 400, requestId, ...result }, { status: httpStatus }));
  } catch (err) {
    const mapped = automationErrorToApi(err);
    if (!(mapped instanceof ApiError) && !(mapped instanceof ConfigError) && !(mapped instanceof z.ZodError)) {
      logger.error("automation.error", { requestId, error: err });
    }
    return respond(errorResponse(mapped));
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: { code: "method_not_allowed", message: "Use POST with an Authorization: Bearer <CRON_SECRET> header." } },
    { status: 405, headers: { Allow: "POST" } },
  );
}
