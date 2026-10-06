import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { AdminAccount, Session } from "@/lib/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ConfigError, env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The admin password lives in MongoDB as a scrypt hash. Until it is changed
 * for the first time, ADMIN_PASSWORD_HASH from the environment is used as the
 * initial password.
 */

export async function getAdminPasswordHash(): Promise<{ hash: string; source: "database" | "env" }> {
  await connectDB();
  const account = await AdminAccount.findOne({ key: "admin" }).select("+passwordHash").lean<{ passwordHash: string }>();
  if (account?.passwordHash) return { hash: account.passwordHash, source: "database" };

  const envHash = env.adminPasswordHash?.replace(/^["']|["']$/g, "");
  if (!envHash) throw new ConfigError("No admin password is set. Set ADMIN_PASSWORD_HASH (npm run admin:hash-password) or run npm run admin:reset-password.");
  if (!envHash.startsWith("scrypt:")) {
    throw new ConfigError("ADMIN_PASSWORD_HASH must be a hash, not the password itself. Run `npm run admin:hash-password` and restart the server.");
  }
  return { hash: envHash, source: "env" };
}

export async function getAccountInfo() {
  await connectDB();
  const account = await AdminAccount.findOne({ key: "admin" }).lean<{ passwordChangedAt: Date }>();
  return { passwordChangedAt: account?.passwordChangedAt ? new Date(account.passwordChangedAt).toISOString() : null };
}

const COMMON = new Set(["password", "password123", "admin123", "admin@123", "qwerty123", "1234567890", "iloveyou", "letmein123", "welcome123"]);

export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters. A short phrase works well.")
  .max(128, "That's a little too long (max 128 characters).")
  .refine((p) => !COMMON.has(p.toLowerCase()), "That password is too common. Choose something less guessable.")
  .refine((p) => new Set(p).size >= 4, "Use a mix of different characters.");

/** Hashes and stores a new password. Optionally keeps one session signed in. */
export async function setAdminPassword(newPassword: string, opts: { keepSessionId?: string } = {}) {
  const hash = await hashPassword(newPassword);
  await connectDB();
  await AdminAccount.updateOne(
    { key: "admin" },
    { $set: { passwordHash: hash, passwordChangedAt: new Date() } },
    { upsert: true },
  );
  // Sign out every other device.
  const res = await Session.deleteMany(opts.keepSessionId ? { _id: { $ne: opts.keepSessionId } } : {});
  logger.info("auth.password_changed", { signedOutSessions: res.deletedCount });
  return { signedOutSessions: res.deletedCount };
}

export async function verifyAdminPassword(password: string) {
  const { hash } = await getAdminPasswordHash();
  return verifyPassword(password, hash);
}
