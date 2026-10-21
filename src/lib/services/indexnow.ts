import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * IndexNow: tells Bing, Yandex, Seznam and other search engines the moment a
 * page is published or updated, instead of waiting for them to re-crawl.
 * (Google doesn't support IndexNow; it picks changes up from the sitemap's
 * lastmod dates.) The key is derived from AUTH_SECRET, so there's nothing to
 * configure, and it is served at /indexnow-key.txt for verification.
 */
export function indexNowKey() {
  return createHash("sha256").update(`indexnow:${env.authSecret ?? "life-of-kittukun"}`).digest("hex").slice(0, 32);
}

const enabled = () => env.isProduction && SITE_URL.startsWith("https://") && !SITE_URL.includes("localhost");

/** Fire-and-forget: never slows down or breaks the save that triggered it. */
export function notifySearchEngines(paths: string[]) {
  if (!enabled() || !paths.length) return;
  const host = new URL(SITE_URL).host;
  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: indexNowKey(), keyLocation: absoluteUrl("/indexnow-key.txt"), urlList: paths.map((p) => absoluteUrl(p)) }),
    signal: AbortSignal.timeout(10_000),
  })
    .then((res) => logger.info("indexnow.sent", { status: res.status, urls: paths.length }))
    .catch((error) => logger.warn("indexnow.failed", { error }));
}

/** Announces a page (and its listing page) when it is published; returns the item unchanged. */
export function announceIfPublished<T extends { status?: string; slug?: string }>(item: T, section: "/blog" | "/store" | "/sessions" | "/opportunities" | "/universities"): T {
  if (item.status === "published" && item.slug) notifySearchEngines([`${section}/${item.slug}`, section, "/sitemap.xml"]);
  return item;
}
