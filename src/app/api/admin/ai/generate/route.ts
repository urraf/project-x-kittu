import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { automationErrorToApi, generateAndSavePost } from "@/lib/services/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  topic: z.string().trim().max(300).optional(),
  category: z.string().trim().max(60).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  notes: z.string().trim().max(1500).optional(),
});

/** Generates an AI draft (never auto-published) for the admin to review. */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const input = schema.parse(await readJson(req));
  try {
    const result = await generateAndSavePost({ generate: input, status: "draft", source: "ai" });
    return ok({ post: result.post, warnings: result.warnings }, { status: 201 });
  } catch (err) {
    throw automationErrorToApi(err);
  }
});
