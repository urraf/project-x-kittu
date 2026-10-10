import { requireAdmin } from "@/lib/auth/session";
import { notFound, ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteOpportunity, getAdminOpportunity, updateOpportunity } from "@/lib/services/opportunities";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const o = await getAdminOpportunity((await params).id);
  if (!o) throw notFound("Opportunity not found");
  return ok(o);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const o = await updateOpportunity((await params).id, await readJson(req));
  revalidateSite();
  return ok(o);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteOpportunity((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
