import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { isGroqConfigured, env } from "@/lib/env";
import { ok, readJson, route } from "@/lib/http";
import { automationErrorToApi, listRuns, runAutomation } from "@/lib/services/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = route(async (req) => {
  await requireAdmin(req);
  return ok({ runs: await listRuns(25), aiReady: isGroqConfigured(), autoReady: isGroqConfigured() && Boolean(env.cronSecret) });
});

const schema = z.object({
  topic: z.string().trim().max(300).optional(),
  publish: z.boolean().optional(),
});

/** "Run now" from the dashboard: same pipeline as the cron endpoint, bypassing schedule rules. */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const body = schema.parse(await readJson(req));
  try {
    const { httpStatus, ...result } = await runAutomation({
      trigger: "manual",
      force: true,
      publish: body.publish,
      generate: body.topic ? { topic: body.topic } : {},
    });
    return ok(result, { status: httpStatus });
  } catch (err) {
    throw automationErrorToApi(err);
  }
});
