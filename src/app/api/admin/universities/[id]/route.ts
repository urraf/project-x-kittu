import { requireAdmin } from "@/lib/auth/session";
import { notFound, ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteUniversity, getAdminUniversity, updateUniversity } from "@/lib/services/universities";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const u = await getAdminUniversity((await params).id);
  if (!u) throw notFound("University not found");
  return ok(u);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const u = await updateUniversity((await params).id, await readJson(req));
  revalidateSite();
  return ok(u);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteUniversity((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
