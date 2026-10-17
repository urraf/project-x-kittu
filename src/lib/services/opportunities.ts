import "server-only";
import { cache } from "react";
import { Types, type PipelineStage } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Opportunity, type OpportunityDoc } from "@/lib/models";
import { badRequest, notFound } from "@/lib/http";
import { sanitizePlain } from "@/lib/content/html";
import { slugify } from "@/lib/utils/text";
import { imageSchema } from "@/lib/validation/post";
import { groqChat, parseJsonObject } from "@/lib/ai/groq";
import { isGroqConfigured } from "@/lib/env";
import { COUNTRIES, DEGREE_LEVELS, FUNDING_TYPES, OPPORTUNITY_TYPES } from "@/lib/opportunities/constants";
import type { ImageDTO } from "@/lib/types";

// Mongoose 9 query typings are very strict; these dynamic filters are built from validated input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;

const PAGE_SIZE = 24;
const DAY = 86400_000;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A deadline date ("2027-01-15") means "until the end of that day in India". */
export const deadlineFromDate = (date: string) => new Date(`${date}T23:59:59+05:30`);
export const dateFromDeadline = (d: Date | string) => new Date(new Date(d).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export type OpportunityDTO = {
  id: string;
  title: string;
  slug: string;
  type: string;
  organization: string;
  country: string;
  location: string;
  funding: string;
  deadline?: string;
  rolling: boolean;
  /** Whole days left (0 = closes today); undefined when rolling/no deadline. */
  daysLeft?: number;
  closed: boolean;
  period: string;
  degreeLevels: string[];
  fields: string[];
  summary: string;
  description: string;
  eligibility: string;
  benefits: string;
  applyUrl: string;
  sourceUrl: string;
  coverImage?: ImageDTO;
  status: "draft" | "published";
  featured: boolean;
  views: number;
  updatedAt: string;
};

function toDTO(o: OpportunityDoc): OpportunityDTO {
  const deadline = o.deadline ? new Date(o.deadline) : null;
  const msLeft = deadline ? deadline.getTime() - Date.now() : null;
  return {
    id: String(o._id),
    title: o.title,
    slug: o.slug,
    type: o.type,
    organization: o.organization ?? "",
    country: o.country ?? "",
    location: o.location ?? "",
    funding: o.funding ?? "",
    deadline: deadline?.toISOString(),
    rolling: Boolean(o.rolling),
    daysLeft: msLeft !== null && msLeft >= 0 ? Math.floor(msLeft / DAY) : undefined,
    closed: Boolean(deadline && msLeft !== null && msLeft < 0 && !o.rolling),
    period: o.period ?? "",
    degreeLevels: o.degreeLevels ?? [],
    fields: o.fields ?? [],
    summary: o.summary ?? "",
    description: o.description ?? "",
    eligibility: o.eligibility ?? "",
    benefits: o.benefits ?? "",
    applyUrl: o.applyUrl ?? "",
    sourceUrl: o.sourceUrl ?? "",
    coverImage: o.coverImage?.url ? { url: o.coverImage.url, alt: o.coverImage.alt ?? "", mediaId: o.coverImage.mediaId ? String(o.coverImage.mediaId) : undefined, width: o.coverImage.width ?? undefined, height: o.coverImage.height ?? undefined, blurDataURL: o.coverImage.blurDataURL ?? undefined, credit: o.coverImage.credit?.name ? { name: o.coverImage.credit.name, url: o.coverImage.credit.url ?? undefined } : undefined } : undefined,
    status: o.status as OpportunityDTO["status"],
    featured: Boolean(o.featured),
    views: o.views ?? 0,
    updatedAt: new Date(o.updatedAt).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Public search                                                       */
/* ------------------------------------------------------------------ */

export const searchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.string().max(40).optional().catch(undefined),
  country: z.string().max(60).optional().catch(undefined),
  funding: z.string().max(40).optional().catch(undefined),
  deadline: z.enum(["7", "30", "90", "rolling"]).optional().catch(undefined),
  level: z.string().max(30).optional().catch(undefined),
  sort: z.enum(["deadline", "newest"]).optional().catch(undefined),
  closed: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});
export type SearchParams = z.infer<typeof searchSchema>;

const openFilter = (now: Date): Filter => ({ $or: [{ deadline: { $gte: now } }, { deadline: null }, { rolling: true }] });

export async function searchOpportunities(params: SearchParams) {
  await connectDB();
  const now = new Date();
  const and: Filter[] = [{ status: "published" }];
  if (!params.closed) and.push(openFilter(now));
  if (params.type) and.push({ type: params.type });
  if (params.country) and.push({ country: params.country });
  if (params.funding) and.push({ funding: params.funding });
  if (params.level) and.push({ degreeLevels: { $in: [params.level, "any"] } });
  if (params.deadline === "rolling") and.push({ $or: [{ rolling: true }, { deadline: null }] });
  else if (params.deadline) and.push({ deadline: { $gte: now, $lte: new Date(now.getTime() + Number(params.deadline) * DAY) } });
  if (params.q) {
    const rx = { $regex: escapeRegex(params.q), $options: "i" };
    and.push({ $or: [{ title: rx }, { organization: rx }, { summary: rx }, { fields: rx }, { location: rx }] });
  }
  const match = { $and: and };
  const page = params.page ?? 1;
  const sort: PipelineStage.Sort["$sort"] =
    params.sort === "newest"
      ? { featured: -1, createdAt: -1 }
      : // Soonest deadline first; open/rolling ones after those with a date.
        { _hasDeadline: 1, deadline: 1, featured: -1, createdAt: -1 };
  const [docs, total] = await Promise.all([
    Opportunity.aggregate<OpportunityDoc>([
      { $match: match },
      { $addFields: { _hasDeadline: { $cond: [{ $and: [{ $ifNull: ["$deadline", false] }, { $gte: ["$deadline", now] }] }, 0, 1] } } },
      { $sort: sort },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
      { $project: { _hasDeadline: 0 } },
    ]),
    Opportunity.countDocuments(match),
  ]);
  return { items: docs.map(toDTO), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** For the homepage: what closes soonest. */
export async function closingSoon(limit = 4) {
  return (await searchOpportunities({ sort: "deadline" })).items.slice(0, limit);
}

export async function opportunityCounts() {
  await connectDB();
  const now = new Date();
  const rows = await Opportunity.aggregate<{ _id: string; n: number }>([{ $match: { status: "published", ...openFilter(now) } }, { $group: { _id: "$type", n: { $sum: 1 } } }]);
  return { total: rows.reduce((t, r) => t + r.n, 0), byType: Object.fromEntries(rows.map((r) => [r._id, r.n])) as Record<string, number> };
}

/** Counts a view; wrapped in React's per-request cache so metadata + page count once. */
export const getPublicOpportunity = cache(async (slug: string) => {
  await connectDB();
  const doc = await Opportunity.findOneAndUpdate({ slug, status: "published" }, { $inc: { views: 1 } }, { returnDocument: "after" }).lean<OpportunityDoc>();
  return doc ? toDTO(doc) : null;
});

export async function relatedOpportunities(o: OpportunityDTO, limit = 3) {
  await connectDB();
  const docs = await Opportunity.find({ status: "published", _id: { $ne: o.id }, $or: [{ type: o.type }, { country: o.country }], ...openFilter(new Date()) })
    .sort({ deadline: 1 })
    .limit(limit)
    .lean<OpportunityDoc[]>();
  return docs.map(toDTO);
}

export async function listOpportunitySlugs() {
  await connectDB();
  return Opportunity.find({ status: "published" }).select("slug updatedAt").lean<{ slug: string; updatedAt: Date }[]>();
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\//.test(v), "Must start with https://")
  .default("");

export const opportunityInputSchema = z
  .object({
    title: z.string().trim().min(3, "Add a title").max(160),
    type: z.string().trim().min(1, "Pick a type").max(40),
    organization: z.string().trim().max(140).default(""),
    country: z.string().trim().min(1, "Pick a country").max(60),
    location: z.string().trim().max(120).default(""),
    funding: z.string().trim().min(1, "Pick a funding type").max(40),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").or(z.literal("")).default(""),
    rolling: z.boolean().default(false),
    period: z.string().trim().max(80).default(""),
    degreeLevels: z.array(z.string().trim().max(30)).max(8).default([]),
    fields: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    summary: z.string().trim().max(320).default(""),
    description: z.string().trim().max(6000).default(""),
    eligibility: z.string().trim().max(3000).default(""),
    benefits: z.string().trim().max(3000).default(""),
    applyUrl: httpsUrl,
    sourceUrl: httpsUrl,
    coverImage: imageSchema.nullable().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
    featured: z.boolean().default(false),
  })
  .refine((v) => v.status !== "published" || v.applyUrl, { path: ["applyUrl"], message: "Add the official link students should use to apply" })
  .refine((v) => v.rolling || v.deadline || v.status === "draft", { path: ["deadline"], message: "Add the deadline, or mark it as rolling" });

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base, 90) || "opportunity";
  let candidate = root;
  for (let i = 2; await Opportunity.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) candidate = `${root}-${i}`;
  return candidate;
}

function fields(input: z.infer<typeof opportunityInputSchema>) {
  return {
    title: sanitizePlain(input.title),
    type: input.type,
    organization: sanitizePlain(input.organization),
    country: sanitizePlain(input.country),
    location: sanitizePlain(input.location),
    funding: input.funding,
    deadline: input.deadline ? deadlineFromDate(input.deadline) : null,
    rolling: input.rolling,
    period: sanitizePlain(input.period),
    degreeLevels: input.degreeLevels,
    fields: input.fields.map(sanitizePlain),
    summary: sanitizePlain(input.summary),
    description: sanitizePlain(input.description),
    eligibility: sanitizePlain(input.eligibility),
    benefits: sanitizePlain(input.benefits),
    applyUrl: input.applyUrl,
    sourceUrl: input.sourceUrl,
    status: input.status,
    featured: input.featured,
  };
}

export type AdminListFilter = { q?: string; view?: "all" | "live" | "closed" | "draft"; page?: number };

export async function listAdminOpportunities({ q = "", view = "all", page = 1 }: AdminListFilter) {
  await connectDB();
  const now = new Date();
  const filter: Filter = {};
  if (view === "draft") filter.status = "draft";
  if (view === "live") Object.assign(filter, { status: "published", ...openFilter(now) });
  if (view === "closed") Object.assign(filter, { deadline: { $lt: now }, rolling: { $ne: true } });
  if (q.trim()) {
    const rx = { $regex: escapeRegex(q.trim().slice(0, 100)), $options: "i" };
    filter.$and = [{ $or: [{ title: rx }, { organization: rx }, { country: rx }] }];
  }
  const [docs, total] = await Promise.all([Opportunity.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean<OpportunityDoc[]>(), Opportunity.countDocuments(filter)]);
  return { items: docs.map(toDTO), total, page, pages: Math.max(1, Math.ceil(total / 50)) };
}

export async function getAdminOpportunity(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Opportunity.findById(id).lean<OpportunityDoc>();
  return doc ? toDTO(doc) : null;
}

export async function createOpportunity(raw: unknown) {
  const input = opportunityInputSchema.parse(raw);
  await connectDB();
  const doc = await Opportunity.create({ ...fields(input), coverImage: input.coverImage ?? undefined, slug: await uniqueSlug(input.title) });
  return toDTO(doc.toObject() as OpportunityDoc);
}

export async function updateOpportunity(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Opportunity not found");
  const input = opportunityInputSchema.parse(raw);
  await connectDB();
  const doc = await Opportunity.findByIdAndUpdate(
    id,
    { $set: { ...fields(input), ...(input.coverImage ? { coverImage: input.coverImage } : {}) }, ...(input.coverImage ? {} : { $unset: { coverImage: 1 } }) },
    { returnDocument: "after", runValidators: true },
  ).lean<OpportunityDoc>();
  if (!doc) throw notFound("Opportunity not found");
  return toDTO(doc);
}

export async function deleteOpportunity(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Opportunity not found");
  await connectDB();
  const r = await Opportunity.deleteOne({ _id: id });
  if (!r.deletedCount) throw notFound("Opportunity not found");
}

/* ------------------------------------------------------------------ */
/* AI: fill the form from a pasted announcement                        */
/* ------------------------------------------------------------------ */

const extracted = z.object({
  title: z.string().max(200).nullish(),
  organization: z.string().max(200).nullish(),
  type: z.string().max(40).nullish(),
  country: z.string().max(80).nullish(),
  location: z.string().max(160).nullish(),
  funding: z.string().max(40).nullish(),
  deadline: z.string().max(20).nullish(),
  rolling: z.boolean().nullish(),
  period: z.string().max(120).nullish(),
  degreeLevels: z.array(z.string().max(30)).max(8).nullish(),
  fields: z.array(z.string().max(60)).max(12).nullish(),
  summary: z.string().max(600).nullish(),
  description: z.string().max(8000).nullish(),
  eligibility: z.string().max(4000).nullish(),
  benefits: z.string().max(4000).nullish(),
  applyUrl: z.string().max(2048).nullish(),
});

/**
 * Reads a pasted announcement and drafts the form. Only facts in the text are
 * used: anything not stated comes back empty for the admin to fill in.
 */
export async function draftFromText(text: string) {
  if (!isGroqConfigured()) throw badRequest("The AI assistant isn't connected yet. Fill the form manually.");
  const clipped = text.trim().slice(0, 12000);
  if (clipped.length < 80) throw badRequest("Paste the full announcement (at least a few sentences).");
  const ids = (list: readonly { id: string }[]) => list.map((x) => x.id).join(", ");
  const system = `You extract structured data about student opportunities from announcements. Use ONLY facts stated in the text. Never guess dates, amounts, links or requirements: if something is not stated, use null. Reply with one JSON object only.`;
  const user = `Return JSON with these keys:
title (official program name), organization, type (one of: ${ids(OPPORTUNITY_TYPES)}), country (prefer one of: ${COUNTRIES.join(", ")}), location (city/campus or "Online"),
funding (one of: ${ids(FUNDING_TYPES)}), deadline (YYYY-MM-DD, the application deadline, or null), rolling (true only if applications are explicitly rolling/open-ended),
period (program dates/duration as written), degreeLevels (array, from: ${ids(DEGREE_LEVELS)}), fields (array of short subject areas, e.g. "Engineering"),
summary (1-2 plain sentences, max 300 chars), description (plain text, 2-4 short paragraphs, neutral tone), eligibility (plain text, one requirement per line),
benefits (plain text, one benefit per line, amounts exactly as written), applyUrl (only a URL that appears in the text, else null).

ANNOUNCEMENT:
"""
${clipped}
"""`;
  const res = await groqChat({ messages: [{ role: "system", content: system }, { role: "user", content: user }], json: true, temperature: 0.1, maxTokens: 2200, timeoutMs: 60_000 });
  const data = extracted.parse(parseJsonObject(res.content));
  const pick = <T extends { id: string }>(list: readonly T[], v?: string | null) => (v && list.some((x) => x.id === v) ? v : "");
  const urlInText = data.applyUrl && clipped.includes(data.applyUrl.replace(/\/$/, "")) && /^https?:\/\//.test(data.applyUrl) ? data.applyUrl : "";
  const deadline = data.deadline && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline) && !Number.isNaN(Date.parse(data.deadline)) ? data.deadline : "";
  return {
    title: (data.title ?? "").slice(0, 160),
    organization: (data.organization ?? "").slice(0, 140),
    type: pick(OPPORTUNITY_TYPES, data.type),
    country: (data.country ?? "").slice(0, 60),
    location: (data.location ?? "").slice(0, 120),
    funding: pick(FUNDING_TYPES, data.funding),
    deadline,
    rolling: Boolean(data.rolling) && !deadline,
    period: (data.period ?? "").slice(0, 80),
    degreeLevels: (data.degreeLevels ?? []).filter((d) => DEGREE_LEVELS.some((x) => x.id === d)),
    fields: (data.fields ?? []).map((f) => f.slice(0, 40)).slice(0, 12),
    summary: (data.summary ?? "").slice(0, 320),
    description: (data.description ?? "").slice(0, 6000),
    eligibility: (data.eligibility ?? "").slice(0, 3000),
    benefits: (data.benefits ?? "").slice(0, 3000),
    applyUrl: urlInText,
  };
}
