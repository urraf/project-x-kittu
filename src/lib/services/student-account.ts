import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Student, StudentOtp, type StudentDoc } from "@/lib/models";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, badRequest, conflict } from "@/lib/http";
import { logger } from "@/lib/logger";
import { otpEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/services/email";
import { sanitizePlain } from "@/lib/content/html";

/**
 * Student accounts: email + password.
 *  - Booking with a new email creates the account and emails a generated password.
 *  - Students can also sign up themselves; the email is confirmed with a 6-digit code.
 *  - Forgotten passwords are reset with a 6-digit code.
 */

const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export const emailField = z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address"));
export const passwordField = z.string().min(8, "Use at least 8 characters").max(128, "That password is too long");
export const codeField = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email");
export const phoneField = z.string().trim().max(30).refine((p) => /^[+\d][\d\s-]{6,}$/.test(p), "Enter a valid phone number");

/** Easy to read and type: no 0/O, 1/I/l. About 60 bits of randomness. */
export function generatePassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/* ------------------------------------------------------------------ */
/* One-time codes                                                      */
/* ------------------------------------------------------------------ */

type OtpPurpose = "signup" | "reset";
type SignupData = { name: string; phone: string; passwordHash: string };

// Keyed with AUTH_SECRET so a leaked database can't be brute-forced offline.
const hashCode = (purpose: OtpPurpose, email: string, code: string) => createHmac("sha256", env.authSecret).update(`${purpose}:${email}:${code}`).digest("hex");

async function issueOtp(purpose: OtpPurpose, email: string, data?: SignupData) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await StudentOtp.findOneAndUpdate(
    { _id: `${purpose}:${email}` },
    { $set: { codeHash: hashCode(purpose, email, code), attempts: 0, expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000), data: data ?? null } },
    { upsert: true },
  );
  return code;
}

/** Checks a code (max 5 tries). On success the code is used up and any sign-up data returned. */
async function checkOtp(purpose: OtpPurpose, email: string, code: string): Promise<{ data?: SignupData | null }> {
  const doc = await StudentOtp.findOneAndUpdate(
    { _id: `${purpose}:${email}`, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).lean<{ codeHash: string; attempts: number; data?: SignupData | null }>();
  if (!doc) throw badRequest("This code has expired. Request a new one.");
  const expected = Buffer.from(doc.codeHash, "hex");
  const actual = Buffer.from(hashCode(purpose, email, code), "hex");
  if (!timingSafeEqual(expected, actual)) {
    const left = OTP_MAX_ATTEMPTS - doc.attempts;
    throw badRequest(left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Request a new one.", [{ path: "code", message: "Wrong code" }]);
  }
  await StudentOtp.deleteOne({ _id: `${purpose}:${email}` });
  return { data: doc.data };
}

/* ------------------------------------------------------------------ */
/* Log in                                                              */
/* ------------------------------------------------------------------ */

// Verifying against a dummy hash keeps "no such account" as slow as "wrong password".
let dummyHash: Promise<string> | null = null;

export async function loginStudent(email: string, password: string) {
  await connectDB();
  const student = await Student.findOne({ email }).select("+passwordHash").lean<StudentDoc & { passwordHash?: string }>();
  if (!student?.passwordHash) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, student.passwordHash))) return null;
  await Student.updateOne({ _id: student._id }, { $set: { lastLoginAt: new Date() } });
  return student;
}

/* ------------------------------------------------------------------ */
/* Sign up (with email code)                                           */
/* ------------------------------------------------------------------ */

export const signupSchema = z.object({ name: z.string().trim().min(2, "Enter your name").max(100), email: emailField, phone: phoneField, password: passwordField });

export async function startSignup(input: z.infer<typeof signupSchema>) {
  await connectDB();
  const existing = await Student.findOne({ email: input.email }).select("+passwordHash").lean<{ passwordHash?: string }>();
  if (existing?.passwordHash) throw conflict("You already have an account with this email. Log in instead, or use “Forgot password”.");
  const code = await issueOtp("signup", input.email, { name: sanitizePlain(input.name), phone: input.phone, passwordHash: await hashPassword(input.password) });
  await sendEmail({ to: input.email, toName: input.name, kind: "student_signup_code", ...otpEmail({ name: input.name, code, purpose: "signup", minutes: OTP_MINUTES }) });
}

export async function completeSignup(email: string, code: string) {
  await connectDB();
  const { data } = await checkOtp("signup", email, code);
  if (!data?.passwordHash) throw badRequest("Please start the sign-up again.");
  // A student record may already exist from a booking that was never paid: claim it.
  const student = await Student.findOneAndUpdate(
    { email, passwordHash: { $exists: false } },
    { $set: { name: data.name, phone: data.phone, passwordHash: data.passwordHash, passwordSetAt: new Date(), emailVerifiedAt: new Date(), lastLoginAt: new Date() }, $setOnInsert: { email } },
    { upsert: true, returnDocument: "after" },
  )
    .lean<StudentDoc>()
    .catch((err: { code?: number }) => {
      if (err.code === 11000) throw conflict("You already have an account with this email. Log in instead.");
      throw err;
    });
  logger.info("student.signed_up", { student: String(student!._id) });
  return student!;
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

/** Emails a reset code if the account exists. Always looks the same to the caller. */
export async function startPasswordReset(email: string) {
  await connectDB();
  const student = await Student.findOne({ email }).lean<StudentDoc>();
  if (!student) return;
  const code = await issueOtp("reset", email);
  await sendEmail({ to: email, toName: student.name, kind: "student_reset_code", ...otpEmail({ name: student.name, code, purpose: "reset", minutes: OTP_MINUTES }) });
}

export async function completePasswordReset(email: string, code: string, newPassword: string) {
  await connectDB();
  await checkOtp("reset", email, code);
  const student = await Student.findOneAndUpdate(
    { email },
    { $set: { passwordHash: await hashPassword(newPassword), passwordSetAt: new Date(), emailVerifiedAt: new Date(), lastLoginAt: new Date() }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after" },
  ).lean<StudentDoc>();
  if (!student) throw badRequest("We couldn't find that account.");
  return student;
}

export async function changeStudentPassword(studentId: Types.ObjectId | string, currentPassword: string, newPassword: string) {
  await connectDB();
  const student = await Student.findById(studentId).select("+passwordHash").lean<StudentDoc & { passwordHash?: string }>();
  if (!student?.passwordHash || !(await verifyPassword(currentPassword, student.passwordHash))) {
    throw new ApiError(400, "Your current password isn't right.", "bad_request", [{ path: "currentPassword", message: "Incorrect password" }]);
  }
  if (currentPassword === newPassword) throw badRequest("Choose a password different from the current one.", [{ path: "newPassword", message: "Same as current" }]);
  return Student.findByIdAndUpdate(
    studentId,
    { $set: { passwordHash: await hashPassword(newPassword), passwordSetAt: new Date() }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after" },
  ).lean<StudentDoc>();
}

/**
 * Called when a booking is confirmed. If the student has no password yet (new
 * account), creates one and returns it so it can go in the confirmation email.
 * Atomic: two confirmations at once never produce two passwords.
 */
export async function ensureAccountPassword(studentId: Types.ObjectId | string): Promise<string | null> {
  const password = generatePassword();
  const updated = await Student.findOneAndUpdate(
    { _id: studentId, passwordHash: { $exists: false } },
    { $set: { passwordHash: await hashPassword(password), passwordSetAt: new Date() } },
  ).lean();
  return updated ? password : null;
}
