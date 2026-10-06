import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteMilestone, updateMilestone } from "@/lib/services/milestones";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const milestone = await updateMilestone((await params).id, await readJson(req));
  revalidateSite();
  return ok(milestone);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteMilestone((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
