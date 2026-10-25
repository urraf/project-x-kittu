import "server-only";

/**
 * Centralised, server-only access to environment configuration.
 * Nothing in this file may ever be imported by a client component.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function required(name: string): string {
  const value = read(name);
  if (!value) throw new ConfigError(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get mongoUri() {
    return required("MONGODB_URI");
  },
  /**
   * Database name. Uses MONGODB_DB, else the name inside MONGODB_URI, else
   * "lifeofkittukun". (A URI copied from Atlas often has no database name,
   * which would otherwise silently fall back to an empty "test" database.)
   */
  get mongoDb() {
    const explicit = read("MONGODB_DB");
    if (explicit) return explicit;
    const uri = read("MONGODB_URI") ?? "";
    const path = uri.replace(/^mongodb(\+srv)?:\/\/[^/]*/, "").split("?")[0]?.replace(/^\//, "") ?? "";
    return path ? undefined : "lifeofkittukun";
  },
  get authSecret() {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) throw new ConfigError("AUTH_SECRET must be at least 32 characters long");
    return secret;
  },
  /** Optional starting login email (until one is saved from the admin panel). */
  get adminEmail() {
    return read("ADMIN_EMAIL")?.toLowerCase();
  },
  get adminPasswordHash() {
    return read("ADMIN_PASSWORD_HASH");
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
  get groqApiKey() {
    return read("GROQ_API_KEY");
  },
  get groqModel() {
    return read("GROQ_MODEL") ?? "openai/gpt-oss-120b";
  },
  /** Reasoning effort for reasoning models (gpt-oss): low | medium | high. */
  get groqReasoningEffort() {
    const v = read("GROQ_REASONING_EFFORT");
    return v === "medium" || v === "high" ? v : "low";
  },
  /** Separate key/model for the website chat assistant (falls back to the main key). */
  get groqChatApiKey() {
    return read("GROQ_CHAT_API_KEY") ?? read("GROQ_API_KEY");
  },
  get groqChatModel() {
    return read("GROQ_CHAT_MODEL") ?? "openai/gpt-oss-120b";
  },
  get groqBaseUrl() {
    return (read("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
  },
  /* Payments (Razorpay) */
  get razorpayKeyId() {
    return read("RAZORPAY_KEY_ID");
  },
  get razorpayKeySecret() {
    return read("RAZORPAY_KEY_SECRET");
  },
  get razorpayWebhookSecret() {
    return read("RAZORPAY_WEBHOOK_SECRET");
  },
  /** Practice checkout with no real money. Ignored once real Razorpay keys are set. */
  get paymentsDemo() {
    return read("PAYMENTS_DEMO") === "true";
  },
  get razorpayApiBase() {
    return (read("RAZORPAY_API_BASE") ?? "https://api.razorpay.com/v1").replace(/\/$/, "");
  },
  /* Email (Brevo or Resend, both HTTPS APIs that work on Render's free plan) */
  get brevoApiKey() {
    return read("BREVO_API_KEY");
  },
  get brevoApiBase() {
    return (read("BREVO_API_BASE") ?? "https://api.brevo.com/v3").replace(/\/$/, "");
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  /** e.g. "Life of KittuKun <hello@yourdomain.com>" */
  /** Sender. Defaults to the Gmail account when Gmail SMTP is used. */
  /** Where student replies go (optional). Defaults to the public contact email in Studio → Settings. */
  get emailReplyTo() {
    return read("EMAIL_REPLY_TO");
  },
  get emailFrom() {
    return read("EMAIL_FROM") ?? (read("SMTP_USER") ? `Life of KittuKun <${read("SMTP_USER")}>` : undefined);
  },
  /** SMTP (e.g. Gmail with an App Password). Note: Render's free plan blocks SMTP ports; use Brevo there. */
  get smtpHost() {
    return read("SMTP_HOST") ?? (read("SMTP_USER")?.endsWith("@gmail.com") ? "smtp.gmail.com" : undefined);
  },
  get smtpPort() {
    return Number(read("SMTP_PORT") ?? 465);
  },
  get smtpUser() {
    return read("SMTP_USER");
  },
  get smtpPass() {
    return read("SMTP_PASS")?.replace(/\s+/g, "");
  },
  /** "Sign in with Google" for students: a Google OAuth *Web application* client. */
  get googleSignInClientId() {
    return read("GOOGLE_SIGNIN_CLIENT_ID");
  },
  get googleSignInClientSecret() {
    return read("GOOGLE_SIGNIN_CLIENT_SECRET");
  },
  /* Google Meet (optional): OAuth client + refresh token of the host's Google account */
  get googleClientId() {
    return read("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return read("GOOGLE_CLIENT_SECRET");
  },
  get googleRefreshToken() {
    return read("GOOGLE_REFRESH_TOKEN");
  },
  get googleCalendarId() {
    return read("GOOGLE_CALENDAR_ID") ?? "primary";
  },
  get youtubeApiKey() {
    return read("YOUTUBE_API_KEY");
  },
  get youtubeChannelId() {
    return read("YOUTUBE_CHANNEL_ID") ?? "UCz8-XtJDuxb19llG29p2h9A";
  },
  get unsplashAccessKey() {
    return read("UNSPLASH_ACCESS_KEY");
  },
  get maxUploadBytes() {
    const mb = Number(read("MAX_UPLOAD_MB") ?? 8);
    return Math.max(1, Math.min(mb, 9)) * 1024 * 1024;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export function isGroqConfigured() {
  return Boolean(read("GROQ_API_KEY"));
}
