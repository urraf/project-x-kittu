import { z } from "zod";
import { hitLimit, peekLimit, resetLimit } from "@/lib/auth/rate-limit";
import { requireAdmin } from "@/lib/auth/session";
import { ApiError, ok, readJson, route, tooMany } from "@/lib/http";
import { emailSchema, getAdminEmail, setAdminEmail, verifyAdminPassword } from "@/lib/services/admin-account";

export const dynamic = "force-dynamic";

const schema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1, "Enter your current password").max(256),
});

const KEY = "account-change";

/** Changes the admin login email. Requires the current password. */
export const POST = route(async (req) => {
  const session = await requireAdmin(req);
  const state = await peekLimit(KEY, 5);
  if (!state.allowed) throw tooMany("Too many attempts. Please wait a few minutes and try again.", state.retryAfterSec);

  const body = schema.parse(await readJson(req));
  if (!(await verifyAdminPassword(body.currentPassword))) {
    await hitLimit(KEY, 5, 15 * 60 * 1000);
    throw new ApiError(400, "Your current password isn't right.", "wrong_password", [{ path: "currentPassword", message: "Your current password isn't right." }]);
  }
  if ((await getAdminEmail()) === body.newEmail) {
    throw new ApiError(422, "That's already your login email.", "validation_error", [{ path: "newEmail", message: "That's already your login email." }]);
  }

  await resetLimit(KEY);
  const result = await setAdminEmail(body.newEmail, { keepSessionId: session.sid });
  return ok({ email: result.email, signedOutSessions: result.signedOutSessions });
});
