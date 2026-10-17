import { Types } from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/connect";
import { ApiError, notFound, ok, readJson, route } from "@/lib/http";
import { Student } from "@/lib/models";
import { feedbackInviteEmail } from "@/lib/email/templates";
import { emailProvider, sendEmail } from "@/lib/services/email";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ note: z.string().trim().max(300).optional() });

/** Emails a student a personal link to share feedback (opens the contact form with "Feedback" selected). */
export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const id = (await params).id;
  if (!Types.ObjectId.isValid(id)) throw notFound("Student not found");
  const { note } = schema.parse(await readJson(req));
  await connectDB();
  const s = await Student.findById(id).select("name email").lean<{ name: string; email: string }>();
  if (!s) throw notFound("Student not found");
  if (!emailProvider()) throw new ApiError(503, "Email isn't set up yet, so this can't be sent. Add the email settings on the server first.", "email_not_configured");
  const url = absoluteUrl(`/contact?${new URLSearchParams({ topic: "feedback", name: s.name, email: s.email })}`);
  const sent = await sendEmail({ to: s.email, toName: s.name, ...feedbackInviteEmail({ name: s.name, feedbackUrl: url, note }), kind: "feedback_invite" });
  if (!sent) throw new ApiError(502, "The email couldn't be sent. Check the email settings or try again.", "email_failed");
  return ok({ sent: true });
});
