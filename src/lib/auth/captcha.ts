import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db/connect";
import { CaptchaNonce } from "@/lib/models";
import { env } from "@/lib/env";
import { signPurposeToken, verifyPurposeToken } from "@/lib/auth/token";

/**
 * Stateless math CAPTCHA.
 * The signed token carries only an HMAC of the answer (never the answer
 * itself), expires after a few minutes, and each nonce can be used once.
 */

/** Separate purposes keep login and comment challenges from being interchangeable. */
export type CaptchaPurpose = "captcha" | "comment-captcha";
const TTL_SECONDS = 5 * 60;

function answerDigest(nonce: string, answer: number) {
  return createHmac("sha256", `captcha-answer:${env.authSecret}`).update(`${nonce}:${answer}`).digest();
}

export async function createCaptcha(purpose: CaptchaPurpose = "captcha") {
  const kind = randomInt(0, 3);
  let a: number, b: number, answer: number, op: string;
  if (kind === 0) {
    a = randomInt(3, 25);
    b = randomInt(2, 20);
    answer = a + b;
    op = "+";
  } else if (kind === 1) {
    a = randomInt(12, 40);
    b = randomInt(2, 11);
    answer = a - b;
    op = "−";
  } else {
    a = randomInt(2, 10);
    b = randomInt(2, 10);
    answer = a * b;
    op = "×";
  }
  const nonce = randomUUID();
  const token = await signPurposeToken(
    purpose,
    { n: nonce, h: answerDigest(nonce, answer).toString("base64url") },
    TTL_SECONDS,
  );
  return { question: `${a} ${op} ${b}`, token, expiresInSec: TTL_SECONDS };
}

export type CaptchaResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "reused" | "wrong" };

export async function verifyCaptcha(token: string, rawAnswer: string | number, purpose: CaptchaPurpose = "captcha"): Promise<CaptchaResult> {
  let claims: { n?: unknown; h?: unknown; exp?: number };
  try {
    claims = await verifyPurposeToken(purpose, token);
  } catch (err) {
    const code = (err as { code?: string }).code;
    return { ok: false, reason: code === "ERR_JWT_EXPIRED" ? "expired" : "invalid" };
  }
  if (typeof claims.n !== "string" || typeof claims.h !== "string") return { ok: false, reason: "invalid" };

  // Consume the nonce first: every challenge allows exactly one attempt.
  await connectDB();
  try {
    await CaptchaNonce.create({
      _id: claims.n,
      expiresAt: new Date((claims.exp ?? Date.now() / 1000 + TTL_SECONDS) * 1000 + 60_000),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: "reused" };
    throw err;
  }

  const answer = Number(String(rawAnswer).trim());
  if (!Number.isInteger(answer)) return { ok: false, reason: "wrong" };
  const expected = Buffer.from(claims.h, "base64url");
  const actual = answerDigest(claims.n, answer);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, reason: "wrong" };
  return { ok: true };
}
