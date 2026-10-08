import { z } from "zod";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { hitLimit, peekLimit, resetLimit } from "@/lib/auth/rate-limit";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { verifyAdminLogin } from "@/lib/services/admin-account";

export const dynamic = "force-dynamic";

const IP_LIMIT = 8; // failed attempts per window per IP
const GLOBAL_LIMIT = 40; // failed attempts per window across all IPs
const WINDOW_MS = 15 * 60 * 1000;

const schema = z.object({
  email: z.string().max(200).optional(),
  password: z.string().min(1, "Enter your password").max(256),
  captchaAnswer: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== "", "Answer the math question"),
  captchaToken: z.string().min(10, "Captcha expired, please refresh").max(2000),
  next: z.string().max(500).optional(),
});

function safeNext(next?: string) {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.startsWith("/admin/login")) return "/admin";
  return next;
}

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const ipKey = `login:ip:${ip}`;
  const globalKey = "login:global";

  const [ipState, globalState] = await Promise.all([peekLimit(ipKey, IP_LIMIT), peekLimit(globalKey, GLOBAL_LIMIT)]);
  const blocked = !ipState.allowed ? ipState : !globalState.allowed ? globalState : null;
  if (blocked) {
    const minutes = Math.max(1, Math.ceil(blocked.retryAfterSec / 60));
    logger.warn("auth.login_blocked", { ip });
    throw tooMany(`Too many sign-in attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} and try again.`, blocked.retryAfterSec);
  }

  const body = schema.parse(await readJson(req));
  const fail = async () => {
    await Promise.all([hitLimit(ipKey, IP_LIMIT, WINDOW_MS), hitLimit(globalKey, GLOBAL_LIMIT, WINDOW_MS)]);
  };

  const captcha = await verifyCaptcha(body.captchaToken, body.captchaAnswer);
  if (!captcha.ok) {
    await fail();
    const message =
      captcha.reason === "expired" || captcha.reason === "reused" || captcha.reason === "invalid"
        ? "The math question expired. A new one has been loaded."
        : "That answer to the math question isn't right.";
    throw new ApiError(400, message, "captcha_failed");
  }

  const login = await verifyAdminLogin(body.email, body.password);
  if (!login.ok) {
    await fail();
    logger.warn("auth.login_failed", { ip });
    // Same message for a wrong email or a wrong password: never reveal which.
    throw new ApiError(401, login.emailRequired ? "Incorrect email or password." : "Incorrect password.", "invalid_credentials");
  }

  await resetLimit(ipKey);
  const { token, expiresAt } = await createSession({ ip, userAgent: req.headers.get("user-agent") ?? undefined });
  logger.info("auth.login_success", { ip });

  const res = ok({ redirect: safeNext(body.next) }, { headers: { "Cache-Control": "no-store" } });
  setSessionCookie(res, token, expiresAt);
  return res;
});
