import { z } from "zod";
import { hitLimit, peekLimit, resetLimit } from "@/lib/auth/rate-limit";
import { requireAdmin } from "@/lib/auth/session";
import { ApiError, ok, readJson, route, tooMany } from "@/lib/http";
import { newPasswordSchema, setAdminPassword, verifyAdminPassword } from "@/lib/services/admin-account";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "The new passwords don't match." })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "Choose a password different from your current one." });

const KEY = "password-change";

export const POST = route(async (req) => {
  const session = await requireAdmin(req);
  const state = await peekLimit(KEY, 5);
  if (!state.allowed) throw tooMany("Too many attempts. Please wait a few minutes and try again.", state.retryAfterSec);

  const body = schema.parse(await readJson(req));
  if (!(await verifyAdminPassword(body.currentPassword))) {
    await hitLimit(KEY, 5, 15 * 60 * 1000);
    throw new ApiError(400, "Your current password isn't right.", "wrong_password", [{ path: "currentPassword", message: "Your current password isn't right." }]);
  }

  await resetLimit(KEY);
  const { signedOutSessions } = await setAdminPassword(body.newPassword, { keepSessionId: session.sid });
  return ok({ changed: true, signedOutSessions });
});
