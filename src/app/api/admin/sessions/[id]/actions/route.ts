import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { cancelSession, duplicateSession, sendFeedbackRequestsNow } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ action: z.enum(["duplicate", "cancel", "send-feedback"]) });

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const { action } = schema.parse(await readJson(req));
  const result = action === "duplicate" ? await duplicateSession(id) : action === "cancel" ? await cancelSession(id) : await sendFeedbackRequestsNow(id);
  revalidateSite();
  return ok(result);
});
