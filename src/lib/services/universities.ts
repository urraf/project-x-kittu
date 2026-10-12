import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { University, type UniversityDoc } from "@/lib/models";
import { notFound } from "@/lib/http";
import { sanitizePlain } from "@/lib/content/html";
import { slugify } from "@/lib/utils/text";
import { imageSchema } from "@/lib/validation/post";
import { CATALOG, FIELDS, REGIONS, TAGS } from "@/lib/universities/catalog";
import type { ImageDTO } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PAGE_SIZE = 30;

export const UNIVERSITY_TYPES = [
  { id: "national", label: "National" },
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
] as const;
export const DEGREES = [
  { id: "bachelor", label: "Bachelor's" },
  { id: "master", label: "Master's" },
  { id: "phd", label: "PhD" },
  { id: "research", label: "Research student" },
  { id: "exchange", label: "Exchange" },
] as const;

export type ProgramDTO = { id: string; name: string; degree: string; field: string; language: "english" | "mixed" | "japanese"; intake: string; url: string; notes: string };
export type UniversityDTO = {
  id: string;
  name: string;
  slug: string;
  nameJa: string;
  type: "national" | "public" | "private";
  city: string;
  prefecture: string;
  region: string;
  fields: string[];
  tags: string[];
  tier: number;
  website: string;
  summary: string;
  strengths: string[];
  programs: ProgramDTO[];
  englishPrograms: number;
  scholarships: string;
  coverImage?: ImageDTO;
  lastVerifiedAt?: string;
  verified: boolean;
  status: "draft" | "published";
  featured: boolean;
  updatedAt: string;
};

function toDTO(u: UniversityDoc): UniversityDTO {
  const programs: ProgramDTO[] = (u.programs ?? []).map((p) => ({
    id: String((p as { _id?: Types.ObjectId })._id ?? ""),
    name: p.name,
    degree: p.degree ?? "master",
    field: p.field ?? "",
    language: (p.language ?? "english") as ProgramDTO["language"],
    intake: p.intake ?? "",
    url: p.url ?? "",
    notes: p.notes ?? "",
  }));
  return {
    id: String(u._id),
    name: u.name,
    slug: u.slug,
    nameJa: u.nameJa ?? "",
    type: u.type as UniversityDTO["type"],
    city: u.city ?? "",
    prefecture: u.prefecture ?? "",
    region: u.region ?? "",
    fields: u.fields ?? [],
    tags: u.tags ?? [],
    tier: u.tier ?? 3,
    website: u.website ?? "",
    summary: u.summary ?? "",
    strengths: u.strengths ?? [],
    programs,
    englishPrograms: programs.filter((p) => p.language === "english").length,
    scholarships: u.scholarships ?? "",
    coverImage: u.coverImage?.url ? { url: u.coverImage.url, alt: u.coverImage.alt ?? "", mediaId: u.coverImage.mediaId ? String(u.coverImage.mediaId) : undefined, width: u.coverImage.width ?? undefined, height: u.coverImage.height ?? undefined, blurDataURL: u.coverImage.blurDataURL ?? undefined, credit: u.coverImage.credit?.name ? { name: u.coverImage.credit.name, url: u.coverImage.credit.url ?? undefined } : undefined } : undefined,
    lastVerifiedAt: u.lastVerifiedAt ? new Date(u.lastVerifiedAt).toISOString() : undefined,
    verified: Boolean(u.lastVerifiedAt) && programs.length > 0,
    status: u.status as UniversityDTO["status"],
    featured: Boolean(u.featured),
    updatedAt: new Date(u.updatedAt).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

export const universitySearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(["national", "public", "private"]).optional().catch(undefined),
  degree: z.string().max(20).optional().catch(undefined),
  region: z.string().max(30).optional().catch(undefined),
  field: z.string().max(10).optional().catch(undefined),
  english: z.enum(["1"]).optional().catch(undefined),
  verified: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});
export type UniversitySearch = z.infer<typeof universitySearchSchema>;

export async function searchUniversities(params: UniversitySearch) {
  await connectDB();
  const filter: Filter = { status: "published" };
  if (params.type) filter.type = params.type;
  if (params.degree) filter["programs.degree"] = params.degree;
  if (params.region) filter.region = params.region;
  if (params.field) filter.fields = params.field;
  if (params.english) filter.tags = { $in: ["english-ug", "sgu-a", "sgu-b", "g30"] };
  if (params.verified) Object.assign(filter, { lastVerifiedAt: { $ne: null }, "programs.0": { $exists: true } });
  if (params.q) {
    const rx = { $regex: escapeRegex(params.q), $options: "i" };
    filter.$or = [{ name: rx }, { nameJa: rx }, { city: rx }, { strengths: rx }, { "programs.name": rx }, { "programs.field": rx }];
  }
  const page = params.page ?? 1;
  const [docs, total] = await Promise.all([
    University.find(filter).sort({ featured: -1, lastVerifiedAt: -1, tier: 1, name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<UniversityDoc[]>(),
    University.countDocuments(filter),
  ]);
  return { items: docs.map(toDTO), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function universityStats() {
  await connectDB();
  const [total, verified, byType] = await Promise.all([
    University.countDocuments({ status: "published" }),
    University.countDocuments({ status: "published", lastVerifiedAt: { $ne: null }, "programs.0": { $exists: true } }),
    University.aggregate<{ _id: string; n: number }>([{ $match: { status: "published" } }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
  ]);
  return { total, verified, byType: Object.fromEntries(byType.map((r) => [r._id, r.n])) as Record<string, number> };
}

export async function getPublicUniversity(slug: string) {
  await connectDB();
  const doc = await University.findOne({ slug, status: "published" }).lean<UniversityDoc>();
  return doc ? toDTO(doc) : null;
}

export async function listUniversitySlugs() {
  await connectDB();
  return University.find({ status: "published" }).select("slug updatedAt").lean<{ slug: string; updatedAt: Date }[]>();
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const urlField = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\//.test(v), "Must start with https://")
  .default("");

export const universityInputSchema = z.object({
  name: z.string().trim().min(3, "Add the name").max(160),
  nameJa: z.string().trim().max(120).default(""),
  type: z.enum(["national", "public", "private"]),
  city: z.string().trim().max(80).default(""),
  // Recommender profile: optional, so API updates that omit it keep the existing values.
  prefecture: z.string().trim().max(40).optional(),
  region: z.enum(["", ...REGIONS.map((r) => r.id)] as [string, ...string[]]).optional(),
  fields: z.array(z.enum(FIELDS.map((f) => f.id) as [string, ...string[]])).max(10).optional(),
  tags: z.array(z.enum(TAGS)).max(8).optional(),
  tier: z.number().int().min(1).max(3).optional(),
  website: urlField,
  summary: z.string().trim().max(400).default(""),
  strengths: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  programs: z
    .array(
      z.object({
        name: z.string().trim().min(2, "Program name").max(200),
        degree: z.enum(["bachelor", "master", "phd", "research", "exchange"]),
        field: z.string().trim().max(80).default(""),
        language: z.enum(["english", "mixed", "japanese"]),
        intake: z.string().trim().max(60).default(""),
        url: urlField,
        notes: z.string().trim().max(400).default(""),
      }),
    )
    .max(60)
    .default([]),
  scholarships: z.string().trim().max(3000).default(""),
  coverImage: imageSchema.nullable().optional(),
  /** true = stamp today's date as "last verified" */
  markVerified: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("published"),
  featured: z.boolean().default(false),
});

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base, 100) || "university";
  let candidate = root;
  for (let i = 2; await University.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) candidate = `${root}-${i}`;
  return candidate;
}

function fields(input: z.infer<typeof universityInputSchema>) {
  return {
    name: sanitizePlain(input.name),
    nameJa: sanitizePlain(input.nameJa),
    type: input.type,
    city: sanitizePlain(input.city),
    ...(input.prefecture !== undefined ? { prefecture: sanitizePlain(input.prefecture) } : {}),
    ...(input.region !== undefined ? { region: input.region } : {}),
    ...(input.fields !== undefined ? { fields: input.fields } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.tier !== undefined ? { tier: input.tier } : {}),
    website: input.website,
    summary: sanitizePlain(input.summary),
    strengths: input.strengths.map(sanitizePlain),
    programs: input.programs.map((p) => ({ ...p, name: sanitizePlain(p.name), field: sanitizePlain(p.field), intake: sanitizePlain(p.intake), notes: sanitizePlain(p.notes) })),
    scholarships: sanitizePlain(input.scholarships),
    status: input.status,
    featured: input.featured,
    ...(input.markVerified ? { lastVerifiedAt: new Date() } : {}),
  };
}

export async function listAdminUniversities({ q = "", type, page = 1 }: { q?: string; type?: string; page?: number }) {
  await connectDB();
  const filter: Filter = {};
  if (type === "verified") Object.assign(filter, { lastVerifiedAt: { $ne: null } });
  else if (type === "unverified") filter.lastVerifiedAt = null;
  else if (type) filter.type = type;
  if (q.trim()) filter.$or = [{ name: { $regex: escapeRegex(q.trim().slice(0, 100)), $options: "i" } }, { city: { $regex: escapeRegex(q.trim().slice(0, 100)), $options: "i" } }];
  const [docs, total] = await Promise.all([University.find(filter).sort({ name: 1 }).skip((page - 1) * 50).limit(50).lean<UniversityDoc[]>(), University.countDocuments(filter)]);
  return { items: docs.map(toDTO), total, page, pages: Math.max(1, Math.ceil(total / 50)) };
}

export async function getAdminUniversity(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await University.findById(id).lean<UniversityDoc>();
  return doc ? toDTO(doc) : null;
}

export async function createUniversity(raw: unknown) {
  const input = universityInputSchema.parse(raw);
  await connectDB();
  const doc = await University.create({ ...fields(input), coverImage: input.coverImage ?? undefined, slug: await uniqueSlug(input.name) });
  return toDTO(doc.toObject() as UniversityDoc);
}

export async function updateUniversity(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("University not found");
  const input = universityInputSchema.parse(raw);
  await connectDB();
  const doc = await University.findByIdAndUpdate(
    id,
    { $set: { ...fields(input), ...(input.coverImage ? { coverImage: input.coverImage } : {}) }, ...(input.coverImage ? {} : { $unset: { coverImage: 1 } }) },
    { returnDocument: "after", runValidators: true },
  ).lean<UniversityDoc>();
  if (!doc) throw notFound("University not found");
  return toDTO(doc);
}

export async function deleteUniversity(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("University not found");
  await connectDB();
  const r = await University.deleteOne({ _id: id });
  if (!r.deletedCount) throw notFound("University not found");
}

/**
 * Adds universities from the catalog that aren't in the database yet, and fills
 * in the recommender profile (region, fields, tags, tier) for existing ones that
 * don't have it. Admin edits are never overwritten. Safe to run again.
 */
export async function importStarterUniversities() {
  await connectDB();
  const existing = new Map((await University.find().select("name region").lean<{ _id: Types.ObjectId; name: string; region?: string }[]>()).map((u) => [u.name.toLowerCase(), u]));
  let added = 0;
  let profiled = 0;
  for (const c of CATALOG) {
    const profile = { prefecture: c.prefecture, region: c.region, fields: c.fields, tags: c.tags, tier: c.tier };
    const found = existing.get(c.name.toLowerCase());
    if (!found) {
      await University.create({ name: c.name, type: c.type, city: c.city, ...profile, slug: await uniqueSlug(c.name), status: "published" });
      added++;
    } else if (!found.region) {
      await University.updateOne({ _id: found._id }, { $set: profile });
      profiled++;
    }
  }
  return { added, profiled, total: await University.countDocuments() };
}
