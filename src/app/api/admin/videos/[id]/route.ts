import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteVideo, updateVideo } from "@/lib/services/videos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const video = await updateVideo((await params).id, await readJson(req));
  revalidateSite();
  return ok(video);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteVideo((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
