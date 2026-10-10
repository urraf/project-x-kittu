import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createProduct, listAdminProducts } from "@/lib/services/store";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await listAdminProducts());
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const product = await createProduct(await readJson(req));
  revalidateSite();
  return ok(product, { status: 201 });
});
