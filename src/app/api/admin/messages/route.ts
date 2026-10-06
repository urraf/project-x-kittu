import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { listMessages } from "@/lib/services/messages";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listMessages(req.nextUrl.searchParams.get("status") ?? undefined));
});
