import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { markAllCommentsRead } from "@/lib/services/engagement";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await requireAdmin(req);
  await markAllCommentsRead();
  return ok({ done: true });
});
