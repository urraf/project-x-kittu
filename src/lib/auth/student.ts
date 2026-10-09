import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Student, type StudentDoc } from "@/lib/models";
import { env } from "@/lib/env";
import { signPurposeToken, verifyPurposeToken } from "@/lib/auth/token";

/**
 * Student sign-in: email + password. A signed, httpOnly cookie identifies the
 * student for 30 days. It carries the account's tokenVersion, so changing the
 * password signs out every other device.
 */

export const STUDENT_COOKIE = env.isProduction ? "__Host-kk_student" : "kk_student";
/** Readable by the browser, holds no secret: only lets the header show "My account". */
export const SIGNED_IN_HINT_COOKIE = "kk_signed_in";
const SESSION_DAYS = 30;

export async function setStudentCookie(res: NextResponse, student: { _id: Types.ObjectId | string; tokenVersion?: number | null }) {
  const token = await signPurposeToken("student", { sid: String(student._id), v: student.tokenVersion ?? 0 }, SESSION_DAYS * 86400);
  const base = { secure: env.isProduction, sameSite: "lax" as const, path: "/", maxAge: SESSION_DAYS * 86400 };
  res.cookies.set(STUDENT_COOKIE, token, { ...base, httpOnly: true });
  res.cookies.set(SIGNED_IN_HINT_COOKIE, "1", { ...base, httpOnly: false });
}

export function clearStudentCookie(res: NextResponse) {
  const base = { secure: env.isProduction, sameSite: "lax" as const, path: "/", maxAge: 0 };
  res.cookies.set(STUDENT_COOKIE, "", { ...base, httpOnly: true });
  res.cookies.set(SIGNED_IN_HINT_COOKIE, "", { ...base, httpOnly: false });
}

/** The signed-in student, or null. */
export async function getStudent(): Promise<StudentDoc | null> {
  const store = await cookies();
  const raw = store.get(STUDENT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const claims = await verifyPurposeToken<{ sid?: string; v?: number }>("student", raw);
    if (!claims.sid || !Types.ObjectId.isValid(claims.sid)) return null;
    await connectDB();
    const student = await Student.findById(claims.sid).lean<StudentDoc>();
    if (!student || (student.tokenVersion ?? 0) !== (claims.v ?? 0)) return null;
    return student;
  } catch {
    return null;
  }
}
