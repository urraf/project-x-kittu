import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteTestimonial, updateTestimonial } from "@/lib/services/testimonials";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const t = await updateTestimonial((await params).id, await readJson(req));
  revalidateSite();
  return ok(t);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteTestimonial((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
