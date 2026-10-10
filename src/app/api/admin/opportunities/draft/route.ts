import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ok, readJson, route, tooMany } from "@/lib/http";
import { draftFromText } from "@/lib/services/opportunities";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** AI: turn a pasted announcement into a draft of the form (nothing is saved). */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const limit = await hitLimit("opportunity-ai", 40, 60 * 60_000);
  if (!limit.allowed) throw tooMany("The AI assistant is busy. Please try again in a few minutes.", limit.retryAfterSec);
  const { text } = z.object({ text: z.string().max(20000) }).parse(await readJson(req));
  return ok(await draftFromText(text));
});
