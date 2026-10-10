import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AutomationRun, type AutomationRunDoc } from "@/lib/models";
import { ConfigError, isGroqConfigured } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/lib/site";
import { generateArticle, ContentValidationError, type GenerateOptions } from "@/lib/ai/blog-generator";
import { GroqError } from "@/lib/ai/groq";
import { prepareCoverImage } from "@/lib/services/cover";
import { createPost, listRecentForAI } from "@/lib/services/posts";
import { getSettingsStrict } from "@/lib/services/settings";
import { listPublicVideos } from "@/lib/services/videos";
import { revalidateSite } from "@/lib/revalidate";
import type { AutomationRunDTO, PostFull } from "@/lib/types";

const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Shared: generate an article and save it as a post                   */
/* ------------------------------------------------------------------ */

export async function generateAndSavePost(opts: {
  generate: GenerateOptions;
  status: "draft" | "published";
  source: "ai" | "automation";
  runId?: Types.ObjectId;
}): Promise<{ post: PostFull; warnings: string[]; topic: string; model: string }> {
  const settings = await getSettingsStrict();
  const [recent, videos] = await Promise.all([
    listRecentForAI(60),
    listPublicVideos({ limit: 40 }).catch(() => []),
  ]);

  const article = await generateArticle(opts.generate, {
    settings,
    recent: recent.map((r) => ({ title: r.title, topic: r.generation?.topic })),
    videos: videos.map((v) => ({ youtubeId: v.youtubeId, title: v.title })),
  });

  const cover = await prepareCoverImage({
    title: article.title,
    category: article.category,
    imageQuery: article.imageQuery,
    imageAlt: article.imageAlt,
    relatedVideoId: article.relatedVideoId,
    // A video's companion post uses that video's thumbnail as its cover.
    strategy: opts.generate.video ? "video" : settings.automation.coverStrategy,
  });
  const warnings = [...article.warnings, ...cover.warnings];

  const post = await createPost(
    {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.contentHtml,
      category: article.category,
      tags: article.tags,
      coverImage: cover.image ?? null,
      seo: { title: article.seo.title, description: article.seo.description },
      status: opts.status,
      videoId: article.relatedVideoId,
      featured: false,
    },
    {
      source: opts.source,
      generation: { model: article.model, topic: article.topic, promptVersion: article.promptVersion, runId: opts.runId, warnings },
    },
  );
  if (opts.status === "published") revalidateSite();
  return { post, warnings, topic: article.topic, model: article.model };
}

/* ------------------------------------------------------------------ */
/* Automation runs                                                     */
/* ------------------------------------------------------------------ */

export function toRunDTO(r: AutomationRunDoc): AutomationRunDTO {
  return {
    id: String(r._id),
    idempotencyKey: r.idempotencyKey,
    trigger: r.trigger ?? "cron",
    status: r.status ?? "running",
    startedAt: new Date(r.startedAt ?? Date.now()).toISOString(),
    finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : undefined,
    durationMs: r.durationMs ?? undefined,
    topic: r.topic ?? undefined,
    postId: r.postId ? String(r.postId) : undefined,
    postSlug: r.postSlug ?? undefined,
    postStatus: r.postStatus ?? undefined,
    message: r.message ?? undefined,
    warnings: r.warnings ?? [],
  };
}

export async function listRuns(limit = 20) {
  await connectDB();
  // "Skipped" checks are internal bookkeeping; the Studio only shows real outcomes.
  const runs = await AutomationRun.find({ status: { $ne: "skipped" } }).sort({ startedAt: -1 }).limit(limit).lean<AutomationRunDoc[]>();
  return runs.map(toRunDTO);
}

/** IST calendar helpers (the client's audience and schedule are India-based). */
function istParts(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return { date: ist.toISOString().slice(0, 10), hour: ist.getUTCHours() };
}
function istStartOfDay(d = new Date()) {
  const { date } = istParts(d);
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 5.5 * 3600_000);
}

export type AutomationResult =
  | { httpStatus: number; status: "published" | "drafted"; runId: string; post: { id: string; title: string; slug: string; url: string; status: string }; warnings: string[]; durationMs: number }
  | { httpStatus: number; status: "skipped" | "duplicate" | "locked" | "dry_run"; reason: string; runId?: string; post?: { id?: string; slug?: string; url?: string }; nextEligibleAt?: string };

export type AutomationRequest = {
  trigger: "cron" | "manual";
  idempotencyKey?: string;
  ip?: string;
  force?: boolean;
  dryRun?: boolean;
  generate?: GenerateOptions;
  publish?: boolean;
};

function duplicateResult(existing: AutomationRunDoc): AutomationResult {
  return {
    httpStatus: 200,
    status: "duplicate",
    reason: "This request was already processed (idempotent replay). No new post was created.",
    runId: String(existing._id),
    post: {
      id: existing.postId ? String(existing.postId) : undefined,
      slug: existing.postSlug ?? undefined,
      url: existing.postSlug ? absoluteUrl(`/blog/${existing.postSlug}`) : undefined,
    },
  };
}

async function logSkip(trigger: "cron" | "manual", reason: string, ip?: string) {
  await AutomationRun.create({
    idempotencyKey: `skip:${randomUUID()}`,
    trigger,
    status: "skipped",
    finishedAt: new Date(),
    durationMs: 0,
    message: reason,
    ip,
  }).catch(() => {});
}

export async function runAutomation(req: AutomationRequest): Promise<AutomationResult> {
  await connectDB();
  const settings = await getSettingsStrict();
  const auto = settings.automation;
  const now = new Date();

  // 1. Feature switch (manual runs from the dashboard bypass it).
  if (req.trigger === "cron" && !auto.enabled && !req.force) {
    await logSkip(req.trigger, "Automation is disabled in settings", req.ip);
    return { httpStatus: 200, status: "skipped", reason: "Automation is disabled in admin settings." };
  }
  if (!isGroqConfigured()) throw new ConfigError("GROQ_API_KEY is not configured on the server.");

  // 2. Concurrency lock: only one run at a time. Stale runs are released.
  await AutomationRun.updateMany(
    { status: "running", startedAt: { $lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) } },
    { $set: { status: "failed", finishedAt: now, message: "Timed out (lock released)" } },
  );
  const active = await AutomationRun.findOne({ status: "running" }).lean<AutomationRunDoc>();
  if (active) {
    return { httpStatus: 409, status: "locked", reason: "Another generation run is in progress.", runId: String(active._id) };
  }

  // 3. Idempotency key. Default = one slot per (day ÷ maxPerDay) in IST, so a
  //    retried cron call for the same slot can never create a second post.
  const { date, hour } = istParts(now);
  const slot = Math.floor(hour / Math.max(1, Math.floor(24 / auto.maxPerDay)));
  const key = (req.idempotencyKey?.trim() || `${req.trigger}:${date}:slot-${slot}${req.trigger === "manual" ? `:${randomUUID()}` : ""}`).slice(0, 200);
  const replay = await AutomationRun.findOne({ idempotencyKey: key, status: "succeeded" }).lean<AutomationRunDoc>();
  if (replay) return duplicateResult(replay);

  // 4. Publishing rules (cron only, unless forced).
  if (req.trigger === "cron" && !req.force) {
    // Video companion posts (key "video:…") run on their own schedule and don't count here.
    const topicRuns = { status: "succeeded" as const, idempotencyKey: { $not: /^video:/ } };
    const last = await AutomationRun.findOne(topicRuns).sort({ startedAt: -1 }).lean<AutomationRunDoc>();
    if (last?.startedAt && auto.minHoursBetweenRuns > 0) {
      const next = new Date(new Date(last.startedAt).getTime() + auto.minHoursBetweenRuns * 3600_000);
      if (next > now) {
        const reason = `Last post was generated less than ${auto.minHoursBetweenRuns}h ago.`;
        await logSkip(req.trigger, reason, req.ip);
        return { httpStatus: 200, status: "skipped", reason, nextEligibleAt: next.toISOString() };
      }
    }
    const today = await AutomationRun.countDocuments({ ...topicRuns, startedAt: { $gte: istStartOfDay(now) } });
    if (today >= auto.maxPerDay) {
      const reason = `Daily limit of ${auto.maxPerDay} automated post(s) reached.`;
      await logSkip(req.trigger, reason, req.ip);
      return { httpStatus: 200, status: "skipped", reason };
    }
  }

  if (req.dryRun) {
    return { httpStatus: 200, status: "dry_run", reason: `Checks passed. A real run would use idempotency key "${key}".` };
  }

  const isLockConflict = (err: unknown) =>
    (err as { code?: number }).code === 11000 && Boolean((err as { keyPattern?: Record<string, unknown> }).keyPattern?.status);
  const locked = (): AutomationResult => ({ httpStatus: 409, status: "locked", reason: "Another generation run is in progress." });

  let run: AutomationRunDoc | null = null;
  try {
    run = (await AutomationRun.create({ idempotencyKey: key, trigger: req.trigger, status: "running", startedAt: now, ip: req.ip })).toObject() as AutomationRunDoc;
  } catch (err) {
    if (isLockConflict(err)) return locked();
    if ((err as { code?: number }).code !== 11000) throw err;
    const existing = await AutomationRun.findOne({ idempotencyKey: key }).lean<AutomationRunDoc>();
    if (existing?.status === "succeeded") {
      return duplicateResult(existing);
    }
    if (existing?.status === "running") {
      return { httpStatus: 409, status: "locked", reason: "This request is already being processed.", runId: String(existing._id) };
    }
    // A failed run for this key may be retried: claim it atomically.
    try {
      run = await AutomationRun.findOneAndUpdate(
        { idempotencyKey: key, status: { $in: ["failed", "skipped"] } },
        { $set: { status: "running", startedAt: now, ip: req.ip }, $unset: { message: 1, finishedAt: 1 } },
        { returnDocument: "after" },
      ).lean<AutomationRunDoc>();
    } catch (e) {
      if (isLockConflict(e)) return locked();
      throw e;
    }
    if (!run) return { httpStatus: 409, status: "locked", reason: "This request is already being processed." };
  }

  // 5. Generate → cover → validate → save → publish.
  const started = Date.now();
  const status = req.publish === false || auto.publishMode === "draft" ? "draft" : "published";
  try {
    const result = await generateAndSavePost({
      generate: req.generate ?? {},
      status,
      source: "automation",
      runId: run._id,
    });
    const durationMs = Date.now() - started;
    await AutomationRun.updateOne(
      { _id: run._id },
      {
        $set: {
          status: "succeeded",
          finishedAt: new Date(),
          durationMs,
          topic: result.topic,
          postId: result.post.id,
          postSlug: result.post.slug,
          postStatus: result.post.status,
          model: result.model,
          warnings: result.warnings,
          message: `Created "${result.post.title}"`,
        },
      },
    );
    logger.info("automation.succeeded", { runId: String(run._id), slug: result.post.slug, status, durationMs });
    return {
      httpStatus: 201,
      status: status === "published" ? "published" : "drafted",
      runId: String(run._id),
      post: { id: result.post.id, title: result.post.title, slug: result.post.slug, url: absoluteUrl(`/blog/${result.post.slug}`), status: result.post.status },
      warnings: result.warnings,
      durationMs,
    };
  } catch (err) {
    const message =
      err instanceof GroqError || err instanceof ContentValidationError || err instanceof ApiError
        ? err.message
        : "Unexpected error during generation";
    await AutomationRun.updateOne(
      { _id: run._id },
      { $set: { status: "failed", finishedAt: new Date(), durationMs: Date.now() - started, message } },
    );
    logger.error("automation.failed", { runId: String(run._id), error: err });
    throw err;
  }
}

/** Maps generation errors to HTTP responses suitable for a cron service. */
export function automationErrorToApi(err: unknown): unknown {
  if (err instanceof GroqError) return new ApiError(502, `AI provider error: ${err.message}`, "ai_provider_error");
  if (err instanceof ContentValidationError) return new ApiError(502, `Generated content failed validation: ${err.message}`, "ai_validation_failed");
  return err;
}
