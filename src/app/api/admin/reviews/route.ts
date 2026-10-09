import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { listAdminReviews } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listAdminReviews());
});
