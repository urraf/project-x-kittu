import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createCategory, listAdminCategories } from "@/lib/services/opportunity-categories";

export const dynamic = "force-dynamic";

/** All opportunity categories (tree) with how many opportunities use each. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listAdminCategories());
});

/** Adds a category or subcategory. Body: { name, parentId? }. */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const c = await createCategory(await readJson(req));
  revalidateSite();
  return ok(c, { status: 201 });
});
