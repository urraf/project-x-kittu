/**
 * Static, non-secret site constants. Safe to import anywhere (client or server).
 * Editable content (bio, hero copy, socials…) lives in the Settings collection
 * and is managed from /admin/settings.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "Life of KittuKun";

export const SITE_DESCRIPTION =
  "Learn your way to Japan: live sessions, study material, a university finder and fully funded internships and scholarships (MEXT, OIST and more) for Indian students, by Chitranshu Rajput.";

export const BLOG_PAGE_SIZE = 9;

export const DEFAULT_CATEGORIES = [
  "Scholarships",
  "Internships",
  "Japan",
  "Korea",
  "Europe",
  "Career",
  "Student Life",
  "Travel",
] as const;

export const VIDEO_SERIES = [
  { id: "japan", label: "Japan" },
  { id: "korea", label: "Korea" },
  { id: "europe", label: "Europe" },
  { id: "global", label: "Global Opportunities" },
  { id: "career", label: "Career" },
  { id: "vlog", label: "Vlogs" },
] as const;

export type VideoSeries = (typeof VIDEO_SERIES)[number]["id"];

export const VIDEO_SERIES_IDS = VIDEO_SERIES.map((s) => s.id) as [VideoSeries, ...VideoSeries[]];

export function seriesLabel(id: string) {
  return VIDEO_SERIES.find((s) => s.id === id)?.label ?? "Videos";
}

export const MILESTONE_KINDS = ["education", "career", "travel", "achievement", "channel", "life"] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
