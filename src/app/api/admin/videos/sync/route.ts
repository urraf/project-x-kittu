import { requireAdmin } from "@/lib/auth/session";
import { ApiError, ok, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { revalidateSite } from "@/lib/revalidate";
import { syncChannelVideos } from "@/lib/services/videos";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = route(async (req) => {
  await requireAdmin(req);
  try {
    const summary = await syncChannelVideos();
    revalidateSite();
    return ok(summary);
  } catch (error) {
    logger.error("videos.sync_failed", { error });
    throw new ApiError(502, "Couldn't reach YouTube right now. Please try again in a minute.", "youtube_unavailable");
  }
});
