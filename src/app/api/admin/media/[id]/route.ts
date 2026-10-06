import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { deleteMedia, updateMediaAlt } from "@/lib/services/media";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { alt } = z.object({ alt: z.string().max(300) }).parse(await readJson(req));
  return ok(await updateMediaAlt((await params).id, alt));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteMedia((await params).id);
  return ok({ deleted: true });
});
