import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { isGroqConfigured } from "@/lib/env";
import { ok, readJson, route } from "@/lib/http";
import { getSettingsStrict } from "@/lib/services/settings";
import { postsByVideo, processPendingVideoPosts, videoPostStats } from "@/lib/services/video-posts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Which videos have a companion blog post, and how many are still waiting. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const [stats, posts, settings] = await Promise.all([videoPostStats(), postsByVideo(), getSettingsStrict()]);
  return ok({ ...stats, posts: Object.fromEntries(posts), aiReady: isGroqConfigured(), autoEnabled: settings.automation.videoPosts });
});

const schema = z.object({ youtubeId: z.string().regex(/^[\w-]{11}$/).optional() });

/** Writes the article for one video (the given one, or the newest still waiting). */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const { youtubeId } = schema.parse(await readJson(req));
  return ok(await processPendingVideoPosts({ trigger: "manual", max: 1, youtubeId, budgetMs: 60_000 }));
});
