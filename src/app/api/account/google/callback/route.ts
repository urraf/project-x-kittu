import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { hitLimit } from "@/lib/auth/rate-limit";
import { GOOGLE_STATE_COOKIE, googleProfileFromCode, isGoogleSignInConfigured, safeNext } from "@/lib/auth/google";
import { setStudentCookie } from "@/lib/auth/student";
import { connectDB } from "@/lib/db/connect";
import { clientIp } from "@/lib/http";
import { logger } from "@/lib/logger";
import { Student } from "@/lib/models";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const fail = (reason: string) => {
  const res = NextResponse.redirect(absoluteUrl(`/account/login?error=${reason}`));
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/account/google", maxAge: 0 });
  return res;
};

/** Google redirects back here. Verifies state, reads the verified email, signs the student in (creating the account if new). */
export async function GET(req: NextRequest) {
  if (!isGoogleSignInConfigured()) return fail("google_off");
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return fail("google_cancelled");
  const code = sp.get("code");
  const state = sp.get("state") ?? "";
  const [savedState = "", savedNext = ""] = (req.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const ok = code && state && savedState && state.length === savedState.length && timingSafeEqual(Buffer.from(state), Buffer.from(savedState));
  if (!ok) return fail("google_state");

  const limit = await hitLimit(`google-login:${clientIp(req)}`, 20, 15 * 60_000);
  if (!limit.allowed) return fail("google_limit");

  try {
    const profile = await googleProfileFromCode(code);
    if (!profile.emailVerified) return fail("google_unverified");
    await connectDB();
    const now = new Date();
    const student = await Student.findOneAndUpdate(
      { email: profile.email },
      { $setOnInsert: { email: profile.email, name: profile.name, tokenVersion: 0 }, $set: { lastLoginAt: now, emailVerifiedAt: now } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
    if (!student) return fail("google_failed");
    logger.info("student.google_login", { studentId: String(student._id) });
    const res = NextResponse.redirect(absoluteUrl(safeNext(decodeURIComponent(savedNext))));
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/account/google", maxAge: 0 });
    await setStudentCookie(res, student);
    return res;
  } catch (error) {
    logger.error("student.google_login_failed", { error });
    return fail("google_failed");
  }
}
