/** Old opportunity "type" values → the category they became (old links like ?type=internship keep working). */
const LEGACY_TYPE: Record<string, string> = {
  internship: "internships",
  scholarship: "scholarships",
  fellowship: "fellowships",
  research: "research-programs",
  exchange: "exchange-programs",
  "summer-school": "summer-schools",
  conference: "conferences",
  competition: "competitions",
  job: "jobs",
};

export const legacyTypeToCategorySlug = (type?: string | null) => (type ? LEGACY_TYPE[type] : undefined);
