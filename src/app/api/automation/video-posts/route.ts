import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertCronSecret } from "@/lib/auth/cron";
import { ConfigError } from "@/lib/env";
import { ApiError, clientIp, errorResponse, readJson } from "@/lib/http";
import { logger } from "@/lib/logger";
import { revalidateSite } from "@/lib/revalidate";
import { processPendingVideoPosts } from "@/lib/services/video-posts";
import { syncChannelVideos } from "@/lib/services/videos";

/**
 * External-cron entry point: pull new YouTube uploads, then write a companion
 * blog post for each video that doesn't have one yet.
 *
 *   POST /api/automation/video-posts
 *   Authorization: Bearer <CRON_SECRET>      (or header  x-cron-secret: <CRON_SECRET>)
 *   { "max"?: 1-5, "sync"?: boolean }        (body optional; defaults: max 1, sync true)
 *
 * Schedule it e.g. every 1–3 hours. Each call writes at most `max` articles
 * (about a minute each), newest videos first, and is safe to repeat.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  max: z.number().int().min(1).max(5).optional(),
  sync: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = clientIp(req);
  const respond = (res: NextResponse) => {
    res.headers.set("X-Request-Id", requestId);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  try {
    await assertCronSecret(req, ip, requestId);
    const body = bodySchema.parse(await readJson(req));

    let sync: Awaited<ReturnType<typeof syncChannelVideos>> | { error: string } | undefined;
    if (body.sync !== false) {
      try {
        sync = await syncChannelVideos();
      } catch (error) {
        logger.warn("video_posts.sync_failed", { requestId, error });
        sync = { error: "Couldn't reach YouTube; used the videos already saved." };
      }
    }

    const batch = await processPendingVideoPosts({ trigger: "cron", max: body.max ?? 1, budgetMs: 230_000, ip });
    if (batch.written.length || (sync && "added" in sync && sync.added)) revalidateSite();
    return respond(NextResponse.json({ ok: true, requestId, sync, ...batch }));
  } catch (err) {
    if (!(err instanceof ApiError) && !(err instanceof ConfigError) && !(err instanceof z.ZodError)) {
      logger.error("video_posts.error", { requestId, error: err });
    }
    return respond(errorResponse(err));
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: { code: "method_not_allowed", message: "Use POST with an Authorization: Bearer <CRON_SECRET> header." } },
    { status: 405, headers: { Allow: "POST" } },
  );
}
