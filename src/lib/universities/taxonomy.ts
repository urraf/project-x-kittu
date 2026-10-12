/** Shared labels for university fields, regions and tags (safe to import in client components). */

export const FIELDS = [
  { id: "eng", label: "Engineering & technology" },
  { id: "cs", label: "Computer science & AI" },
  { id: "sci", label: "Natural sciences" },
  { id: "med", label: "Medicine & health" },
  { id: "agri", label: "Agriculture & environment" },
  { id: "biz", label: "Business & economics" },
  { id: "soc", label: "Law, policy & social sciences" },
  { id: "hum", label: "Humanities, languages & Japanese studies" },
  { id: "arts", label: "Arts & design" },
  { id: "edu", label: "Education" },
] as const;
export type FieldId = (typeof FIELDS)[number]["id"];

export const REGIONS = [
  { id: "hokkaido-tohoku", label: "Hokkaido & Tohoku" },
  { id: "kanto", label: "Tokyo & Kanto" },
  { id: "chubu", label: "Chubu & Hokuriku" },
  { id: "kansai", label: "Kansai (Kyoto, Osaka, Kobe)" },
  { id: "chugoku-shikoku", label: "Chugoku & Shikoku" },
  { id: "kyushu-okinawa", label: "Kyushu & Okinawa" },
] as const;
export type RegionId = (typeof REGIONS)[number]["id"];

export const TAGS = ["sgu-a", "sgu-b", "g30", "english-ug", "research", "grad-only", "women", "funded"] as const;
export type UniversityTag = (typeof TAGS)[number];

export const TAG_LABELS: Record<UniversityTag, string> = {
  "sgu-a": "Top Global University (A)",
  "sgu-b": "Top Global University (B)",
  g30: "Global 30",
  "english-ug": "English bachelor's track",
  research: "Research-intensive",
  "grad-only": "Graduate school only",
  women: "Women's university",
  funded: "Funded PhD",
};

export const fieldLabel = (id: string) => FIELDS.find((f) => f.id === id)?.label ?? id;
export const regionLabel = (id: string) => REGIONS.find((r) => r.id === id)?.label ?? id;
