import "server-only";
import { cache } from "react";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Opportunity, OpportunityCategory, type OpportunityCategoryDoc } from "@/lib/models";
import { badRequest, conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sanitizePlain } from "@/lib/content/html";
import { slugify } from "@/lib/utils/text";
import { legacyTypeToCategorySlug } from "@/lib/opportunities/legacy";

export { legacyTypeToCategorySlug };

/**
 * Opportunity categories: an admin-managed list with one level of
 * subcategories (e.g. Scholarships → Masters scholarships). An opportunity can
 * be in several categories; filtering by a category includes its subcategories.
 */

export type CategoryDTO = { id: string; name: string; slug: string; parentId: string | null; order: number };
export type CategoryNode = CategoryDTO & { children: CategoryDTO[] };

/** Starting categories, created the first time categories are needed. The admin can rename, add or delete any of them. */
const DEFAULTS: { slug: string; name: string; children?: { slug: string; name: string }[] }[] = [
  { slug: "internships", name: "Internships", children: [{ slug: "international-internships", name: "International internships" }, { slug: "research-internships", name: "Research internships" }] },
  {
    slug: "scholarships",
    name: "Scholarships",
    children: [
      { slug: "undergraduate-scholarships", name: "Undergraduate scholarships" },
      { slug: "masters-scholarships", name: "Masters scholarships" },
      { slug: "phd-scholarships", name: "PhD scholarships" },
    ],
  },
  { slug: "fellowships", name: "Fellowships" },
  { slug: "research-programs", name: "Research programs" },
  { slug: "exchange-programs", name: "Exchange programs" },
  { slug: "summer-schools", name: "Summer schools" },
  { slug: "grants", name: "Grants" },
  { slug: "events", name: "Events", children: [{ slug: "conferences", name: "Conferences" }, { slug: "competitions", name: "Competitions" }] },
  { slug: "online-courses", name: "Online courses" },
  { slug: "training", name: "Training" },
  { slug: "jobs", name: "Jobs" },
];

/** A top-level category → the legacy type used for card artwork (kanji + colour). */
const ART_TYPE: Record<string, string> = {
  internships: "internship",
  scholarships: "scholarship",
  fellowships: "fellowship",
  "research-programs": "research",
  "exchange-programs": "exchange",
  "summer-schools": "summer-school",
  events: "conference",
  jobs: "job",
};

let ensured = false;
/**
 * Creates the default categories if there are none, and moves opportunities
 * that only have the old "type" into the matching category. Safe to call often.
 */
export async function ensureCategories() {
  if (ensured) return;
  await connectDB();
  if (!(await OpportunityCategory.exists({}))) {
    let order = 0;
    for (const top of DEFAULTS) {
      const parent = await OpportunityCategory.findOneAndUpdate({ slug: top.slug }, { $setOnInsert: { name: top.name, slug: top.slug, parent: null, order: order++ } }, { upsert: true, returnDocument: "after" });
      let childOrder = 0;
      for (const c of top.children ?? [])
        await OpportunityCategory.updateOne({ slug: c.slug }, { $setOnInsert: { name: c.name, slug: c.slug, parent: parent!._id, order: childOrder++ } }, { upsert: true });
    }
    logger.info("opportunity_categories.seeded");
  }
  // Older opportunities: give them the category that matches their type.
  const legacy = await Opportunity.find({ $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }] }).select("type").lean<{ _id: Types.ObjectId; type?: string }[]>();
  if (legacy.length) {
    const bySlug = new Map((await OpportunityCategory.find().select("slug").lean<{ _id: Types.ObjectId; slug: string }[]>()).map((c) => [c.slug, c._id]));
    for (const o of legacy) {
      const id = bySlug.get(legacyTypeToCategorySlug(o.type) ?? "") ?? bySlug.get("internships");
      if (id) await Opportunity.updateOne({ _id: o._id }, { $set: { categories: [id] } });
    }
    logger.info("opportunity_categories.migrated", { count: legacy.length });
  }
  ensured = true;
}

const toDTO = (c: OpportunityCategoryDoc): CategoryDTO => ({ id: String(c._id), name: c.name, slug: c.slug, parentId: c.parent ? String(c.parent) : null, order: c.order ?? 0 });

/** All categories as a tree (top level in order, each with its subcategories). Deduplicated per request. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  await ensureCategories();
  const all = (await OpportunityCategory.find().sort({ order: 1, name: 1 }).lean<OpportunityCategoryDoc[]>()).map(toDTO);
  return all.filter((c) => !c.parentId).map((top) => ({ ...top, children: all.filter((c) => c.parentId === top.id) }));
});

/** id → category, plus id → its top-level category (for labels and artwork). */
export async function categoryIndex() {
  const tree = await getCategoryTree();
  const byId = new Map<string, CategoryDTO & { root: CategoryDTO }>();
  for (const top of tree) {
    byId.set(top.id, { ...top, root: top });
    for (const c of top.children) byId.set(c.id, { ...c, root: top });
  }
  return { tree, byId, bySlug: new Map([...byId.values()].map((c) => [c.slug, c])) };
}

/** Legacy "type" for an opportunity in these categories (keeps card artwork and old links working). */
export function artTypeFor(categoryIds: string[], index: Awaited<ReturnType<typeof categoryIndex>>) {
  const first = categoryIds.map((id) => index.byId.get(id)).find(Boolean);
  return (first && ART_TYPE[first.root.slug]) || first?.root.slug || "internship";
}

/** A category and its subcategories, as ids to match against opportunities. */
export async function categoryIdsForFilter(slug: string) {
  const { bySlug, tree } = await categoryIndex();
  const c = bySlug.get(slug);
  if (!c) return null;
  const node = tree.find((t) => t.id === c.id);
  return [c.id, ...(node?.children.map((x) => x.id) ?? [])].map((id) => new Types.ObjectId(id));
}

/**
 * How many live opportunities are in each category. A top-level category's
 * count includes its subcategories (each opportunity counted once).
 */
export async function categoryCounts(match: Record<string, unknown>) {
  const { tree } = await categoryIndex();
  const rows = await Opportunity.find(match).select("categories").lean<{ categories?: Types.ObjectId[] }[]>();
  const counts: Record<string, number> = {};
  for (const top of tree) {
    const ids = new Set([top.id, ...top.children.map((c) => c.id)]);
    counts[top.id] = rows.filter((r) => r.categories?.some((id) => ids.has(String(id)))).length;
    for (const c of top.children) counts[c.id] = rows.filter((r) => r.categories?.some((id) => String(id) === c.id)).length;
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid category");
export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Add a name").max(60),
  parentId: objectId.nullable().default(null),
  order: z.number().int().min(0).max(1000).optional(),
});

async function uniqueSlug(name: string, excludeId?: string) {
  const root = slugify(name, 60) || "category";
  let slug = root;
  for (let i = 2; await OpportunityCategory.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${root}-${i}`;
  return slug;
}

async function checkParent(parentId: string | null, selfId?: string) {
  if (!parentId) return null;
  if (parentId === selfId) throw badRequest("A category can't be inside itself.", [{ path: "parentId", message: "Pick a different parent" }]);
  const parent = await OpportunityCategory.findById(parentId).lean<OpportunityCategoryDoc>();
  if (!parent) throw badRequest("That parent category no longer exists.", [{ path: "parentId", message: "Pick a parent" }]);
  if (parent.parent) throw badRequest("Subcategories can't have their own subcategories. Pick a top-level category as the parent.", [{ path: "parentId", message: "Pick a top-level category" }]);
  return parent._id;
}

/** Admin list: the tree plus how many opportunities (any status) use each category. */
export async function listAdminCategories() {
  await ensureCategories();
  const tree = await getCategoryTree();
  const usage = await Opportunity.aggregate<{ _id: Types.ObjectId; n: number }>([{ $unwind: "$categories" }, { $group: { _id: "$categories", n: { $sum: 1 } } }]);
  const used = Object.fromEntries(usage.map((u) => [String(u._id), u.n]));
  return tree.map((t) => ({ ...t, used: used[t.id] ?? 0, children: t.children.map((c) => ({ ...c, used: used[c.id] ?? 0 })) }));
}

export async function createCategory(raw: unknown) {
  const input = categoryInputSchema.parse(raw);
  await ensureCategories();
  const name = sanitizePlain(input.name);
  const parent = await checkParent(input.parentId);
  if (await OpportunityCategory.exists({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, parent })) throw conflict("A category with this name already exists here.");
  const last = await OpportunityCategory.findOne({ parent }).sort({ order: -1 }).select("order").lean<{ order?: number }>();
  const doc = await OpportunityCategory.create({ name, slug: await uniqueSlug(name), parent, order: input.order ?? (last?.order ?? -1) + 1 });
  return toDTO(doc.toObject() as OpportunityCategoryDoc);
}

export async function updateCategory(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Category not found");
  const input = categoryInputSchema.parse(raw);
  await connectDB();
  const parent = await checkParent(input.parentId, id);
  if (parent && (await OpportunityCategory.exists({ parent: id }))) throw badRequest("This category has subcategories, so it has to stay top-level. Move its subcategories first.", [{ path: "parentId", message: "Has subcategories" }]);
  const doc = await OpportunityCategory.findByIdAndUpdate(id, { $set: { name: sanitizePlain(input.name), parent, ...(input.order !== undefined ? { order: input.order } : {}) } }, { returnDocument: "after" }).lean<OpportunityCategoryDoc>();
  if (!doc) throw notFound("Category not found");
  return toDTO(doc);
}

/** Deletes a category. Its opportunities move to the parent category (or simply lose this one). */
export async function deleteCategory(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Category not found");
  await connectDB();
  const doc = await OpportunityCategory.findById(id).lean<OpportunityCategoryDoc>();
  if (!doc) throw notFound("Category not found");
  if (await OpportunityCategory.exists({ parent: id })) throw badRequest("Delete or move its subcategories first.");
  if (doc.parent) {
    await Opportunity.updateMany({ categories: doc._id }, { $addToSet: { categories: doc.parent } });
  }
  await Opportunity.updateMany({ categories: doc._id }, { $pull: { categories: doc._id } });
  await OpportunityCategory.deleteOne({ _id: id });
}

/** Moves a category up or down among its siblings. */
export async function moveCategory(id: string, direction: "up" | "down") {
  if (!Types.ObjectId.isValid(id)) throw notFound("Category not found");
  await connectDB();
  const doc = await OpportunityCategory.findById(id).lean<OpportunityCategoryDoc>();
  if (!doc) throw notFound("Category not found");
  const siblings = await OpportunityCategory.find({ parent: doc.parent ?? null }).sort({ order: 1, name: 1 }).lean<OpportunityCategoryDoc[]>();
  const i = siblings.findIndex((s) => String(s._id) === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return;
  [siblings[i], siblings[j]] = [siblings[j]!, siblings[i]!];
  await Promise.all(siblings.map((s, k) => OpportunityCategory.updateOne({ _id: s._id }, { $set: { order: k } })));
}
