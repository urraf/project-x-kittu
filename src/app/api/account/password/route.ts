import { z } from "zod";
import { getStudent, setStudentCookie } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, ok, readJson, route, tooMany, unauthorized } from "@/lib/http";
import { changeStudentPassword, passwordField } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

/** Change password from the student panel. Other devices are signed out; this one stays signed in. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const student = await getStudent();
  if (!student) throw unauthorized("Please log in again.");
  const limit = await hitLimit(`student-pw:${student._id}`, 10, 15 * 60_000);
  if (!limit.allowed) throw tooMany("Too many attempts. Please wait a few minutes.", limit.retryAfterSec);
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1, "Enter your current password").max(128), newPassword: passwordField }).parse(await readJson(req));
  const updated = await changeStudentPassword(student._id, currentPassword, newPassword);
  const res = ok({ changed: true });
  await setStudentCookie(res, updated!);
  return res;
});
