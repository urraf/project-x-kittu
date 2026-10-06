import "server-only";
import { ConfigError } from "@/lib/env";
import { logger } from "@/lib/logger";

let warnedMissingConfig = false;

/**
 * Logs a data-loading failure. A missing configuration (e.g. no MONGODB_URI)
 * is reported once per process as a single readable line instead of a stack
 * trace on every query.
 */
export function logDataFailure(event: string, label: string, error: unknown) {
  if (error instanceof ConfigError) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      logger.warn("config.missing", {
        message: `${error.message}. The site is showing fallback content. Add it to .env.local (see .env.example / README) and restart the dev server.`,
      });
    }
    return;
  }
  logger.error(event, { label, error });
}

/**
 * Runs a public-page data loader and returns a fallback if it fails (e.g. the
 * database is briefly unreachable), so visitors see a graceful page, not a 500.
 */
export async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logDataFailure("public.data_failed", label, error);
    return fallback;
  }
}
