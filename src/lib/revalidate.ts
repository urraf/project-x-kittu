import "server-only";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * Invalidates cached public pages after content changes. The site is small, so
 * revalidating the root layout (all public routes) keeps things simple and
 * always correct.
 */
export function revalidateSite() {
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    // revalidatePath throws outside a request context (e.g. scripts); that's fine.
    logger.debug("revalidate.skipped", { error });
  }
}
