import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { isGroqConfigured } from "@/lib/env";
import { ApiError, ok, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { revalidateSite } from "@/lib/revalidate";
import { getSettingsStrict } from "@/lib/services/settings";
import { processPendingVideoPosts } from "@/lib/services/video-posts";
import { syncChannelVideos } from "@/lib/services/videos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = route(async (req) => {
  await requireAdmin(req);
  let summary: Awaited<ReturnType<typeof syncChannelVideos>>;
  try {
    summary = await syncChannelVideos();
    revalidateSite();
  } catch (error) {
    logger.error("videos.sync_failed", { error });
    throw new ApiError(502, "Couldn't reach YouTube right now. Please try again in a minute.", "youtube_unavailable");
  }

  // New uploads get their companion blog post written in the background.
  const settings = await getSettingsStrict();
  const blogsQueued = summary.added > 0 && settings.automation.videoPosts && isGroqConfigured() ? Math.min(summary.added, 3) : 0;
  if (blogsQueued) {
    after(() =>
      processPendingVideoPosts({ trigger: "manual", max: blogsQueued, budgetMs: 280_000 }).catch((error) => logger.error("video_posts.after_sync_failed", { error })),
    );
  }
  return ok({ ...summary, blogsQueued });
});
