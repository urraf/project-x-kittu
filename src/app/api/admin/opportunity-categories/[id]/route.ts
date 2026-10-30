import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deleteCategory, moveCategory, updateCategory } from "@/lib/services/opportunity-categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Rename / change parent ({ name, parentId }) or reorder ({ move: "up" | "down" }). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const id = (await params).id;
  const body = (await readJson(req)) as Record<string, unknown>;
  const move = z.object({ move: z.enum(["up", "down"]) }).safeParse(body);
  const result = move.success ? await moveCategory(id, move.data.move) : await updateCategory(id, body);
  revalidateSite();
  return ok(result ?? { moved: true });
});

/** Deletes a category; its opportunities move to the parent category (if any). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  await deleteCategory((await params).id);
  revalidateSite();
  return ok({ deleted: true });
});
