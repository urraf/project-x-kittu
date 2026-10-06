import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { deleteMessage, setMessageStatus } from "@/lib/services/messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { status } = z.object({ status: z.enum(["new", "read", "archived"]) }).parse(await readJson(req));
  return ok(await setMessageStatus((await params).id, status));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteMessage((await params).id);
  return ok({ deleted: true });
});
