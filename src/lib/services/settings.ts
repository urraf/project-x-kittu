import "server-only";
import { cache } from "react";
import { connectDB } from "@/lib/db/connect";
import { Settings } from "@/lib/models";
import { logger } from "@/lib/logger";
import { logDataFailure } from "@/lib/safe";
import { DEFAULT_SETTINGS, settingsSchema, type SiteSettings } from "@/lib/validation/settings";

type Dict = Record<string, unknown>;

function isPlainObject(v: unknown): v is Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep merge where arrays and primitives in `override` replace `base`. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override === undefined ? base : override) as T;
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject((base as Dict)[k]) ? deepMerge((base as Dict)[k], v) : v;
  }
  return out as T;
}

async function loadSettings(): Promise<SiteSettings> {
  await connectDB();
  const doc = await Settings.findOne({ key: "site" }).lean();
  const merged = deepMerge(DEFAULT_SETTINGS, doc?.data ?? {});
  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) {
    logger.warn("settings.invalid_stored", { issues: parsed.error.issues.slice(0, 5) });
    return DEFAULT_SETTINGS;
  }
  return parsed.data;
}

/** Request-deduplicated settings. Falls back to defaults if the DB is unreachable. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await loadSettings();
  } catch (error) {
    logDataFailure("settings.fallback_defaults", "settings", error);
    return DEFAULT_SETTINGS;
  }
});

/** Strict loader for admin/automation paths where silently using defaults would hide a DB outage. */
export async function getSettingsStrict(): Promise<SiteSettings> {
  return loadSettings();
}

export async function updateSettings(patch: unknown): Promise<SiteSettings> {
  const current = await loadSettings();
  const next = settingsSchema.parse(deepMerge(current, patch));
  if (next.ai.maxWords < next.ai.minWords) next.ai.maxWords = next.ai.minWords + 300;
  await Settings.updateOne({ key: "site" }, { $set: { data: next } }, { upsert: true });
  return next;
}
