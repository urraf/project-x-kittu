import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { importYouTubeTestimonials } from "@/lib/services/testimonials";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Picks the warmest top comments from recent videos as testimonials. */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const result = await importYouTubeTestimonials({ maxVideos: 40, perVideo: 2 });
  if (result.added) revalidateSite();
  return ok(result);
});
