import { z } from "zod";
import { parseYouTubeId } from "@/lib/utils/youtube";

const str = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^(https?:\/\/|\/)/.test(v), "Must be a valid URL")
  .optional();

export const imageSchema = z.object({
  url: z.string().trim().min(1).max(2048).refine((v) => /^(https?:\/\/|\/)/.test(v), "Image must be a URL"),
  alt: str(300).default(""),
  mediaId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurDataURL: z.string().max(4000).optional(),
  credit: z.object({ name: str(120).optional(), url: optionalUrl }).optional(),
});

export const postInputSchema = z.object({
  title: str(180).min(3, "Title must be at least 3 characters"),
  slug: str(120).optional(),
  excerpt: str(400).default(""),
  content: z.string().max(500_000, "Content is too long").default(""),
  coverImage: imageSchema.nullable().optional(),
  thumbnail: imageSchema.nullable().optional(),
  category: str(60).min(1, "Pick a category").default("Stories"),
  tags: z
    .array(str(40).min(1))
    .max(15, "Use at most 15 tags")
    .default([])
    .transform((tags) => [...new Set(tags.map((t) => t.toLowerCase().replace(/^#/, "")))]),
  author: z.object({ name: str(80).optional(), avatar: optionalUrl, bio: str(400).optional() }).optional(),
  seo: z
    .object({
      title: str(90).optional(),
      description: str(200).optional(),
      canonicalUrl: optionalUrl,
      ogImage: optionalUrl,
      noIndex: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.union([z.coerce.date(), z.null()]).optional(),
  featured: z.boolean().default(false),
  videoId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v == null || v.trim() === "") return null;
      const id = parseYouTubeId(v);
      if (!id) {
        ctx.addIssue({ code: "custom", message: "Related video must be a YouTube URL or ID" });
        return z.NEVER;
      }
      return id;
    }),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const postPatchSchema = postInputSchema.partial();
export type PostPatch = z.infer<typeof postPatchSchema>;

export const postListQuerySchema = z.object({
  q: str(100).optional(),
  status: z.enum(["all", "draft", "published", "scheduled"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
