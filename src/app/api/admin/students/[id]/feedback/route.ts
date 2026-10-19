import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { sendFeedbackLink } from "@/lib/services/feedback";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Emails the student the one-time feedback link for one of their sessions or purchases. Body: { kind: "session" | "store", id }. */
export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  return ok(await sendFeedbackLink((await params).id, await readJson(req)));
});
