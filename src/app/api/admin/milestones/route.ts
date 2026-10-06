import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createMilestone, listMilestones } from "@/lib/services/milestones";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listMilestones({ includeUnpublished: true }));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const milestone = await createMilestone(await readJson(req));
  revalidateSite();
  return ok(milestone, { status: 201 });
});
