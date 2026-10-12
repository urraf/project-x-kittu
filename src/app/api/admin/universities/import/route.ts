import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { importStarterUniversities } from "@/lib/services/universities";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Adds catalog universities and fills in missing profiles (never overwrites admin edits). */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const result = await importStarterUniversities();
  revalidateSite();
  return ok(result);
});
