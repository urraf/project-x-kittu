import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { deleteComment, updateComment } from "@/lib/services/engagement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  return ok(await updateComment((await params).id, await readJson(req)));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteComment((await params).id);
  return ok({ deleted: true });
});
