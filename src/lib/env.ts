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
  get groqBaseUrl() {
    return (read("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
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
