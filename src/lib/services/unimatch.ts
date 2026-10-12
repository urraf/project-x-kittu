import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { University, type UniversityDoc } from "@/lib/models";
import { FIELDS, REGIONS, TAG_LABELS, fieldLabel, regionLabel, type FieldId, type UniversityTag } from "@/lib/universities/catalog";

/**
 * JapanUniMatch: ranks universities for a student profile with a transparent,
 * rules-based score (the client's design):
 *   field fit 30 · academic profile 25 · experience 20 · funding 15 · language 10
 * plus small adjustments for region and city preferences. It is a fit score,
 * not an admission probability, and only states program details that an admin
 * has verified.
 */

export const matchInputSchema = z.object({
  degree: z.enum(["bachelor", "master", "phd", "research", "exchange"]),
  field: z.enum(FIELDS.map((f) => f.id) as [FieldId, ...FieldId[]]),
  cgpa: z.coerce.number().min(0).max(100),
  cgpaScale: z.coerce.number().refine((v) => [4, 5, 10, 100].includes(v), "Pick a scale"),
  experience: z.enum(["none", "internship", "industry", "publication", "multiple"]).default("none"),
  englishTest: z.enum(["none", "ielts", "toefl", "duolingo"]).default("none"),
  englishScore: z.coerce.number().min(0).max(160).optional(),
  jlpt: z.enum(["none", "N5", "N4", "N3", "N2", "N1"]).default("none"),
  language: z.enum(["english", "either"]).default("english"),
  funding: z.enum(["full", "partial", "self"]).default("full"),
  region: z.enum(["any", ...REGIONS.map((r) => r.id)] as [string, ...string[]]).default("any"),
  city: z.enum(["any", "big", "small"]).default("any"),
  includeWomen: z.boolean().default(false),
});
export type MatchInput = z.infer<typeof matchInputSchema>;

export type MatchResult = {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  region: string;
  tags: string[];
  score: number;
  /** Unrounded score, for sorting. */
  exact: number;
  label: "Strong match" | "Good match" | "Worth exploring" | "Long shot";
  band: "reach" | "match" | "safe";
  breakdown: { field: number; academic: number; experience: number; funding: number; language: number };
  reasons: string[];
  checks: string[];
  verifiedPrograms: { name: string; degree: string; language: string; url: string }[];
  website: string;
};

const RELATED: Partial<Record<FieldId, FieldId[]>> = {
  cs: ["eng", "sci"],
  eng: ["cs", "sci"],
  sci: ["eng", "agri", "med", "cs"],
  agri: ["sci"],
  med: ["sci"],
  biz: ["soc"],
  soc: ["biz", "hum"],
  hum: ["soc", "edu", "arts"],
  arts: ["hum"],
  edu: ["hum", "soc"],
};

const GRAD = new Set(["master", "phd", "research"]);

/** CGPA as a percentage, plus an "effective" percentage that credits research output for graduate applicants. */
function academicLevel(input: MatchInput) {
  const pct = Math.min(100, (input.cgpa / input.cgpaScale) * 100);
  const bonus = !GRAD.has(input.degree) ? 0 : input.experience === "publication" || input.experience === "multiple" ? 5 : input.experience === "internship" ? 2 : 0;
  return { pct: Math.round(pct), effective: pct + bonus };
}

/** Typical academic bar per selectivity tier, as a CGPA percentage. A guide, not a cut-off. */
const TIER_TARGET = { 1: 86, 2: 74, 3: 60 } as const;

/** Rough English-test bands most English-taught programs ask for. */
function englishOk(input: MatchInput): "ok" | "low" | "none" {
  if (input.englishTest === "none" || input.englishScore === undefined) return "none";
  const s = input.englishScore;
  if (input.englishTest === "ielts") return s >= 6.0 ? "ok" : "low";
  if (input.englishTest === "toefl") return s >= 79 ? "ok" : "low";
  return s >= 105 ? "ok" : "low"; // Duolingo
}

type Doc = UniversityDoc & { _id: unknown };

function scoreOne(u: Doc, input: MatchInput, effective: number): MatchResult | null {
  const tags = (u.tags ?? []) as UniversityTag[];
  const fields = (u.fields ?? []) as FieldId[];
  const has = (t: UniversityTag) => tags.includes(t);
  const sgu = has("sgu-a") || has("sgu-b");
  const global = sgu || has("g30");
  const research = has("research") || (u.tier ?? 3) === 1;
  const tier = (u.tier ?? 3) as 1 | 2 | 3;

  // Eligibility
  if (input.degree === "bachelor" && has("grad-only")) return null;
  if (has("women") && !input.includeWomen) return null;

  const verified = (u.programs ?? []).filter((p) => u.lastVerifiedAt && (p.degree === input.degree || (input.degree === "research" && p.degree === "master")));
  const verifiedEnglish = verified.filter((p) => p.language === "english");

  const reasons: string[] = [];
  const checks: string[] = [];

  // 1. Field fit (30)
  let field = 0;
  if (fields.includes(input.field)) {
    field = 30;
    reasons.push(`${fields.length >= 7 ? "Large university that includes" : "Focused university with strengths in"} ${fieldLabel(input.field)}.`);
  } else if ((RELATED[input.field] ?? []).some((f) => fields.includes(f))) {
    field = 16;
    reasons.push(`Strong in related areas: ${(RELATED[input.field] ?? []).filter((f) => fields.includes(f)).map((f) => fieldLabel(f)).join(", ")}.`);
  } else if (fields.length >= 7) field = 8;
  if (field === 0) return null; // no academic fit at all

  // 2. Academic profile (25): distance from the tier's usual bar. Falling short costs more than exceeding it.
  const d = effective - TIER_TARGET[tier];
  const academic = d >= 0 ? 25 - Math.min(8, d * 0.35) : Math.max(2, 25 + d * 1.5);
  const band: MatchResult["band"] = d >= 10 ? "safe" : d >= -4 ? "match" : "reach";

  // 3. Experience (20)
  let experience: number;
  if (!GRAD.has(input.degree)) experience = 14;
  else if (research) experience = { none: 6, internship: 14, industry: 12, publication: 20, multiple: 20 }[input.experience];
  else experience = { none: 12, internship: 16, industry: 16, publication: 18, multiple: 18 }[input.experience];
  if (GRAD.has(input.degree) && research && input.experience === "none") checks.push("Research labs here look for research experience. A project, internship or paper will strengthen your application.");

  // 4. Funding (15)
  let funding: number;
  if (input.funding === "full") {
    funding = has("funded") ? 15 : u.type === "national" ? (has("sgu-a") ? 15 : sgu || research ? 14 : 12) : u.type === "public" ? (research ? 11 : 10) : global ? 8 : 4;
    if (has("funded")) reasons.push("Admitted PhD students are funded by the institution.");
    else if (u.type === "national" && GRAD.has(input.degree)) checks.push("MEXT University Recommendation: ask the international office whether this university runs it for your intake.");
    else if (u.type === "private" && !global) checks.push("Private university: full scholarships are limited, so check fee waivers and JASSO support first.");
  } else if (input.funding === "partial") funding = u.type === "private" ? (global ? 13 : 10) : 15;
  else funding = u.type === "private" ? 12 : 15;
  if (u.type === "national" && input.funding !== "full") reasons.push("National university: lower, standard tuition (around ¥535,800 a year; check the current fee).");
  if (u.type === "public" && input.funding !== "full") reasons.push("Public university: tuition is usually similar to national universities (check the current fee).");

  // 5. Language (10)
  let language: number;
  const jlptHigh = input.jlpt === "N1" || input.jlpt === "N2";
  if (input.language === "either" && jlptHigh) {
    language = 10;
  } else {
    if (input.degree === "bachelor") language = has("english-ug") ? 10 : global ? 5 : 1;
    else if (input.degree === "exchange") language = global ? 10 : 5;
    else language = global || has("grad-only") ? 10 : research ? 8 : u.type === "national" ? 6 : 3;
    if (input.language === "either" && input.jlpt === "N3") language = Math.max(language, 7);
    if (input.language === "either") language = Math.max(language, 4);
  }
  if (verifiedEnglish.length) language = 10;
  if (has("english-ug") && input.degree === "bachelor") reasons.push("Offers an English-taught bachelor's track.");
  if (sgu) reasons.push(`Part of Japan's ${has("sgu-a") ? "Top Global University project (Top type)" : "Top Global University project"}: more English-taught programs and international support.`);
  else if (has("g30")) reasons.push("A Global 30 university with English-taught degree programs.");
  if (input.degree === "bachelor" && !has("english-ug") && !(input.language === "either" && jlptHigh)) checks.push("Most bachelor's degrees here are taught in Japanese (usually JLPT N2 or higher).");

  // English test check (for English-taught routes)
  const eng = englishOk(input);
  if (language >= 7 && !(input.language === "either" && jlptHigh)) {
    if (eng === "none") checks.push("Plan an English test: many English-taught programs ask for IELTS 6.0–6.5 or TOEFL iBT 79–80 (check the program).");
    else if (eng === "low") checks.push("Your English score may be below the usual minimum (IELTS 6.0–6.5 / TOEFL iBT 79–80). Check the program, or retake the test.");
  }

  if (GRAD.has(input.degree) && !has("grad-only") && research) checks.push("Contact a potential supervisor first: many graduate programs and the research-student route need informal acceptance.");
  if (has("grad-only")) reasons.push("Graduate-only institution focused on research.");

  let score = field + academic + experience + funding + language;
  // Tiny tie-breakers: international support and research strength.
  score += (global ? 0.6 : 0) + (research ? 0.4 : 0);

  // Preferences
  if (input.region !== "any") {
    if (u.region === input.region) { score += 6; reasons.push(`In your preferred region: ${regionLabel(u.region ?? "")}.`); }
    else score -= 8;
  }
  if (input.city === "big") score += u.city && /Tokyo|Osaka|Kyoto|Nagoya|Yokohama|Kobe|Fukuoka|Sapporo|Sendai|Hiroshima/.test(u.city) ? 4 : -2;
  if (input.city === "small") score += u.city && /Tokyo|Osaka|Yokohama|Nagoya/.test(u.city) ? -2 : 4;
  if (verifiedEnglish.length) { score += 3; reasons.unshift(`${verifiedEnglish.length} verified English-taught program${verifiedEnglish.length === 1 ? "" : "s"} for your degree.`); }

  const exact = Math.max(0, Math.min(100, score));
  score = Math.round(exact);
  // The label must agree with the academic band: a reach school is never called a "strong match".
  const label: MatchResult["label"] =
    band === "reach" ? (d >= -12 ? "Worth exploring" : "Long shot") : score >= 80 ? "Strong match" : score >= 65 ? "Good match" : "Worth exploring";
  if (band === "reach") checks.unshift("Ambitious for your current grades: keep it on your list, but apply to some match and safer choices too.");
  if (!verified.length) checks.push("Program details aren't verified on this site yet: confirm the exact degree, language and deadlines on the official admissions page.");

  return {
    id: String(u._id),
    slug: u.slug,
    name: u.name,
    type: u.type,
    city: u.city ?? "",
    region: u.region ?? "",
    tags: tags.filter((t) => t in TAG_LABELS),
    score,
    exact,
    label,
    band,
    breakdown: { field, academic: Math.round(academic), experience, funding, language },
    reasons: [...new Set(reasons)].slice(0, 4),
    checks: [...new Set(checks)].slice(0, 4),
    verifiedPrograms: verified.slice(0, 4).map((p) => ({ name: p.name, degree: p.degree ?? "", language: p.language ?? "", url: p.url ?? "" })),
    website: u.website ?? "",
  };
}

export async function matchUniversities(raw: unknown) {
  const input = matchInputSchema.parse(raw);
  if (input.cgpa > input.cgpaScale) throw new z.ZodError([{ code: "custom", path: ["cgpa"], message: "CGPA can't be higher than the scale", input: input.cgpa }]);
  await connectDB();
  const docs = await University.find({ status: "published", region: { $ne: "" } }).lean<Doc[]>();
  const { pct, effective } = academicLevel(input);
  const scored = docs.map((u) => scoreOne(u, input, effective)).filter((r): r is MatchResult => r !== null);
  // Realistic options first: reach schools rank below comparable match/safe ones.
  const rank = (r: MatchResult) => r.exact - (r.band === "reach" ? 10 : 0);
  scored.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  // A balanced shortlist, like a counsellor would suggest: mostly good matches,
  // plus a few ambitious "reach" picks and a few safer options when they fit well.
  const pick = (band: MatchResult["band"], n: number) => scored.filter((r) => r.band === band && r.exact >= 50).slice(0, n);
  const chosen = new Set([...pick("match", 7), ...pick("reach", 3), ...pick("safe", 3)]);
  for (const r of scored) {
    if (chosen.size >= 13) break;
    chosen.add(r);
  }
  const results = [...chosen].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  const level = effective >= 85 ? "Excellent" : effective >= 75 ? "Good" : effective >= 65 ? "Fair" : "Developing";
  return {
    profile: { cgpaPercent: pct, level },
    considered: docs.length,
    results,
  };
}
