/** Pure text helpers. Safe for client and server. */

export function slugify(input: string, maxLength = 90): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "post";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|blockquote|div|figcaption)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function readingTimeMinutes(words: number, wpm = 220): number {
  return Math.max(1, Math.round(words / wpm));
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

const ACRONYMS = new Set([
  "MEXT", "METI", "OIST", "CERN", "KAIST", "GIST", "GKS", "EPFL", "ETH", "ISTA", "MAECI", "NUS", "IRIS", "NSUT", "IIT",
  "UTRIP", "UTSIP", "WIPO", "UNIL", "HCL", "ISRO", "LPA", "CGPA", "GPA", "JEE", "AI", "ML", "IELTS", "TOEFL", "USA", "UK", "EU",
  "FAQ", "PHD", "MS", "MSC", "BTECH", "JASSO", "DAAD", "AGMEN", "HENNGE", "G30", "SOP", "LOR", "CV",
]);

/** Softens SHOUTY words (YouTube style) to Title Case, keeping real acronyms. */
function calmCaps(s: string) {
  return s.replace(/\b[A-Z][A-Z']{2,}\b/g, (w) => (ACRONYMS.has(w.replace(/'/g, "")) ? w : w[0] + w.slice(1).toLowerCase()));
}

/** Strip decorative emoji / flags and shouty caps from YouTube-style titles for calmer UI. */
export function cleanTitle(title: string): string {
  return calmCaps(title.replace(/(\s*#[\p{L}\d_-]+)+\s*$/u, ""))
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([:!?])/g, "$1")
    .replace(/\s*\|\s*/g, " | ")
    .trim();
}

export function formatDate(date: string | Date | undefined | null, style: "long" | "short" = "long"): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", style === "long"
    ? { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }
    : { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Kolkata" });
}

export function formatCompact(n: number | undefined | null): string {
  if (n == null) return "";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDuration(sec: number | undefined | null): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(date: string | Date | undefined | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [s, label] of units) {
    const v = Math.floor(Math.abs(diff) / s);
    if (v >= 1) return diff >= 0 ? `${v} ${label}${v > 1 ? "s" : ""} ago` : `in ${v} ${label}${v > 1 ? "s" : ""}`;
  }
  return "just now";
}

/** Token-set Jaccard similarity, used for duplicate-title detection. */
export function titleSimilarity(a: string, b: string): number {
  const stop = new Set(["the", "a", "an", "to", "for", "of", "in", "and", "how", "your", "you", "is", "on", "with", "my", "i"]);
  const tokens = (s: string) =>
    new Set(
      cleanTitle(s)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1 && !stop.has(t)),
    );
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}
