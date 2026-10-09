import "server-only";
import { connectDB } from "@/lib/db/connect";
import { EmailLog } from "@/lib/models";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email over HTTPS (Brevo or Resend). HTTPS APIs work on hosts
 * that block SMTP ports (e.g. Render's free plan). Every attempt is logged in
 * the EmailLog collection so delivery problems are visible in the admin panel.
 */

export type EmailMessage = { to: string; toName?: string; subject: string; html: string; text: string; replyTo?: string; kind: string };

export function emailProvider(): "brevo" | "resend" | null {
  if (env.brevoApiKey) return "brevo";
  if (env.resendApiKey) return "resend";
  return null;
}

export function isEmailConfigured() {
  return Boolean(emailProvider() && env.emailFrom);
}

function parseFrom(from: string) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1]!.replace(/^"|"$/g, ""), email: m[2]! } : { name: "Life of KittuKun", email: from.trim() };
}

async function sendViaBrevo(msg: EmailMessage) {
  const from = parseFrom(env.emailFrom!);
  const res = await fetch(`${env.brevoApiBase}/smtp/email`, {
    method: "POST",
    headers: { "api-key": env.brevoApiKey!, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: from,
      to: [{ email: msg.to, ...(msg.toName ? { name: msg.toName } : {}) }],
      subject: msg.subject,
      htmlContent: msg.html,
      textContent: msg.text,
      ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendViaResend(msg: EmailMessage) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Sends an email. Never throws: failures are logged and reported as false. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const provider = emailProvider();
  await connectDB().catch(() => {});
  if (!provider || !env.emailFrom) {
    logger.warn("email.not_configured", { kind: msg.kind, to: msg.to });
    // Local development only: show the email in the terminal so codes and passwords can be tested.
    if (!env.isProduction) console.info(`\n──── Email (not sent: no email service set up) ────\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n────────────────────────────────────────────────\n`);
    await EmailLog.create({ to: msg.to, subject: msg.subject, kind: msg.kind, status: "skipped", error: "Email sending is not set up" }).catch(() => {});
    return false;
  }
  try {
    await (provider === "brevo" ? sendViaBrevo(msg) : sendViaResend(msg));
    await EmailLog.create({ to: msg.to, subject: msg.subject, kind: msg.kind, status: "sent", provider }).catch(() => {});
    logger.info("email.sent", { kind: msg.kind, provider });
    return true;
  } catch (error) {
    logger.error("email.failed", { kind: msg.kind, provider, error });
    await EmailLog.create({ to: msg.to, subject: msg.subject, kind: msg.kind, status: "failed", provider, error: (error as Error).message.slice(0, 900) }).catch(() => {});
    return false;
  }
}

export async function recentEmailProblems(limit = 5) {
  await connectDB();
  return EmailLog.find({ status: { $ne: "sent" } }).sort({ createdAt: -1 }).limit(limit).lean();
}
