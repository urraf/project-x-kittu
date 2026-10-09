import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteReview, updateReview } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const patch = z.object({ status: z.enum(["visible", "hidden"]).optional(), featured: z.boolean().optional() }).parse(await readJson(req));
  const review = await updateReview((await params).id, patch);
  revalidateSite();
  return ok(review);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteReview((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
