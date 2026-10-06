import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { getSettingsStrict, updateSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok(await getSettingsStrict());
});

export const PATCH = route(async (req) => {
  await requireAdmin(req);
  const settings = await updateSettings(await readJson(req));
  revalidateSite();
  return ok(settings);
});
