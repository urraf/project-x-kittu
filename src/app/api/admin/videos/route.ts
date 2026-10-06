import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { addVideoByUrl, listAdminVideos } from "@/lib/services/videos";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  return ok(await listAdminVideos({ q: sp.get("q") ?? undefined, series: sp.get("series") ?? undefined }));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const { url, series } = z.object({ url: z.string().min(5).max(500), series: z.string().optional() }).parse(await readJson(req));
  const video = await addVideoByUrl(url, series);
  revalidateSite();
  return ok(video, { status: 201 });
});
