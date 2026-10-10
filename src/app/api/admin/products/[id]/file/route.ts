import { requireAdmin } from "@/lib/auth/session";
import { badRequest, ok, route } from "@/lib/http";
import { attachProductFile } from "@/lib/services/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Upload (or replace) the private file buyers download. */
export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file to upload.");
  return ok(await attachProductFile((await params).id, file));
});
