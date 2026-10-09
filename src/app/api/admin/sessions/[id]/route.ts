import { requireAdmin } from "@/lib/auth/session";
import { notFound, ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteSession, getAdminSession, updateSession } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const data = await getAdminSession((await params).id);
  if (!data) throw notFound("Session not found");
  return ok(data);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const session = await updateSession((await params).id, await readJson(req));
  revalidateSite();
  return ok(session);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteSession((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
