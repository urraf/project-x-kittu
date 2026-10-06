import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Milestone, type MilestoneDoc } from "@/lib/models";
import { notFound } from "@/lib/http";
import { MILESTONE_KINDS } from "@/lib/site";
import { parseYouTubeId } from "@/lib/utils/youtube";
import type { MilestoneDTO } from "@/lib/types";

export const milestoneSchema = z.object({
  title: z.string().trim().min(2).max(140),
  period: z.string().trim().min(1, "Add a period, e.g. “2023” or “Summer 2024”").max(60),
  sortDate: z.coerce.date({ error: "Pick a date used for ordering" }),
  chapter: z.string().trim().max(60).default(""),
  location: z.string().trim().max(100).default(""),
  description: z.string().trim().max(3000).default(""),
  highlights: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  kind: z.enum(MILESTONE_KINDS).default("life"),
  image: z
    .object({ url: z.string().trim().max(2048).optional(), alt: z.string().trim().max(300).optional() })
    .optional(),
  videoId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? parseYouTubeId(v) : null)),
  published: z.boolean().default(true),
});

export function toMilestoneDTO(m: MilestoneDoc): MilestoneDTO {
  return {
    id: String(m._id),
    title: m.title,
    period: m.period,
    sortDate: new Date(m.sortDate).toISOString(),
    chapter: m.chapter ?? "",
    location: m.location ?? "",
    description: m.description ?? "",
    highlights: m.highlights ?? [],
    kind: m.kind ?? "life",
    image: m.image?.url ? { url: m.image.url, alt: m.image.alt ?? "" } : undefined,
    videoId: m.videoId ?? undefined,
    published: m.published !== false,
  };
}

export async function listMilestones({ includeUnpublished = false } = {}) {
  await connectDB();
  const docs = await Milestone.find(includeUnpublished ? {} : { published: true })
    .sort({ sortDate: 1 })
    .lean<MilestoneDoc[]>();
  return docs.map(toMilestoneDTO);
}

function toFields(input: z.infer<typeof milestoneSchema>) {
  return {
    ...input,
    image: input.image?.url ? input.image : undefined,
    videoId: input.videoId ?? undefined,
  };
}

export async function createMilestone(raw: unknown) {
  const input = milestoneSchema.parse(raw);
  await connectDB();
  const doc = await Milestone.create(toFields(input));
  return toMilestoneDTO(doc.toObject() as MilestoneDoc);
}

export async function updateMilestone(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Milestone not found");
  const input = milestoneSchema.parse(raw);
  await connectDB();
  const fields = toFields(input);
  const unset: Record<string, 1> = {};
  if (!fields.image) unset.image = 1;
  if (!fields.videoId) unset.videoId = 1;
  const doc = await Milestone.findByIdAndUpdate(
    id,
    { $set: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: "after", runValidators: true },
  ).lean<MilestoneDoc>();
  if (!doc) throw notFound("Milestone not found");
  return toMilestoneDTO(doc);
}

export async function deleteMilestone(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Milestone not found");
  await connectDB();
  const res = await Milestone.findByIdAndDelete(id);
  if (!res) throw notFound("Milestone not found");
}
