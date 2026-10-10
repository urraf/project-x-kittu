import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createTestimonial, listAdminTestimonials } from "@/lib/services/testimonials";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listAdminTestimonials());
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const t = await createTestimonial(await readJson(req));
  revalidateSite();
  return ok(t, { status: 201 });
});
