import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { importStarterUniversities } from "@/lib/services/universities";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Adds the starter list of universities (skips ones that already exist). */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const result = await importStarterUniversities();
  revalidateSite();
  return ok(result);
});
