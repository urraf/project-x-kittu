import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { suggestMetadata } from "@/lib/ai/blog-generator";
import { stripHtml } from "@/lib/utils/text";
import { getSettingsStrict } from "@/lib/services/settings";
import { automationErrorToApi } from "@/lib/services/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  content: z.string().min(50, "Write a bit more content first").max(500_000),
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const { title, content } = schema.parse(await readJson(req));
  try {
    return ok(await suggestMetadata(await getSettingsStrict(), title, stripHtml(content)));
  } catch (err) {
    throw automationErrorToApi(err);
  }
});
