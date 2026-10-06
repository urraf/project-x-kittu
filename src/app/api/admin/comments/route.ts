import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { listAdminComments } from "@/lib/services/engagement";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  return ok(await listAdminComments({ status: sp.get("status") ?? "all", page: Math.max(1, Number(sp.get("page")) || 1) }));
});
