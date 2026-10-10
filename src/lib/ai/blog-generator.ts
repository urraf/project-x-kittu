import "server-only";
import { z } from "zod";
import { groqChat, GroqError, parseJsonObject } from "@/lib/ai/groq";
import { metadataPrompt, planPrompt, PROMPT_VERSION, writePrompt, type SourceVideo } from "@/lib/ai/prompts";
import { markdownToHtml } from "@/lib/content/html";
import { logger } from "@/lib/logger";
import { cleanTitle, countWords, slugify, titleSimilarity, truncate } from "@/lib/utils/text";
import type { SiteSettings } from "@/lib/validation/settings";

/* ------------------------------------------------------------------ */
/* Types & errors                                                      */
/* ------------------------------------------------------------------ */

export class ContentValidationError extends Error {
  constructor(
    message: string,
    public kind: "duplicate" | "too_short" | "structure" | "unsafe",
  ) {
    super(message);
    this.name = "ContentValidationError";
  }
}

export type GenerateOptions = {
  topic?: string;
  category?: string;
  keywords?: string[];
  notes?: string;
  /** Write a companion article for this YouTube video. */
  video?: SourceVideo;
};

export type GenerationContext = {
  settings: SiteSettings;
  recent: { title: string; topic?: string }[];
  videos: { youtubeId: string; title: string }[];
};

export type GeneratedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  markdown: string;
  wordCount: number;
  category: string;
  tags: string[];
  seo: { title: string; description: string };
  imageQuery: string;
  imageAlt: string;
  relatedVideoId: string | null;
  topic: string;
  model: string;
  promptVersion: string;
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* Topic selection                                                     */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Picks the configured topic that was used least recently (never-used first),
 * so automated posts rotate through the client's topic list.
 */
export function pickTopic(topics: string[], recent: { title: string; topic?: string }[]): string | null {
  if (!topics.length) return null;
  const lastUsedIndex = (topic: string) => {
    const t = norm(topic);
    const idx = recent.findIndex((r) => (r.topic && norm(r.topic) === t) || titleSimilarity(r.title, topic) >= 0.5);
    return idx === -1 ? Number.POSITIVE_INFINITY : idx;
  };
  const scored = topics.map((t) => ({ t, last: lastUsedIndex(t), r: Math.random() }));
  scored.sort((a, b) => b.last - a.last || a.r - b.r);
  return scored[0]!.t;
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

const planSchema = z.object({
  title: z.string().min(8),
  angle: z.string().default(""),
  category: z.string().default(""),
  tags: z.array(z.string()).default([]),
  excerpt: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  outline: z
    .array(z.object({ heading: z.string().min(2), points: z.array(z.string()).default([]) }))
    .min(3),
  imageQuery: z.string().default(""),
  imageAlt: z.string().default(""),
  relatedVideoId: z.string().nullable().optional(),
});

type Plan = z.infer<typeof planSchema>;

async function createPlan(opts: GenerateOptions, ctx: GenerationContext, topic: string | null, avoid: string[]) {
  const { system, user } = planPrompt({
    settings: ctx.settings,
    topic,
    category: opts.category,
    keywords: opts.keywords,
    notes: opts.notes,
    recentTitles: [...avoid, ...ctx.recent.map((r) => r.title)].slice(0, 50),
    videos: ctx.videos.slice(0, 40),
    sourceVideo: opts.video,
  });
  const res = await groqChat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    json: true,
    temperature: 0.85,
    maxTokens: 1800,
  });
  const parsed = planSchema.safeParse(parseJsonObject(res.content));
  if (!parsed.success) throw new GroqError(`AI plan was incomplete: ${parsed.error.issues[0]?.message}`, 502, true);
  return { plan: parsed.data, model: res.model };
}

/* ------------------------------------------------------------------ */
/* Post-processing & validation                                        */
/* ------------------------------------------------------------------ */

const PHRASE_FIXES: [RegExp, string][] = [
  [/\bin today'?s fast-paced world,?\s*/gi, ""],
  [/\bdelve into\b/gi, "dig into"],
  [/\bdelving into\b/gi, "digging into"],
  [/\bdelve\b/gi, "dig"],
  [/\bembark on (a|your) journey\b/gi, "start"],
  [/\bit'?s important to note that\s*/gi, ""],
  [/\bgame-changer\b/gi, "big deal"],
  [/\blook no further\.?\s*/gi, ""],
];

export function cleanMarkdown(md: string, settings: SiteSettings, title: string) {
  const warnings: string[] = [];
  let out = md.trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim();

  // Drop a leading H1 / repeated title.
  out = out.replace(/^#\s+.+\n+/, "");
  const firstLine = out.split("\n", 1)[0] ?? "";
  if (/^#{1,3}\s/.test(firstLine) && titleSimilarity(firstLine.replace(/^#+\s*/, ""), title) > 0.7) {
    out = out.slice(firstLine.length).trimStart();
  }
  // Any remaining H1s become H2s.
  out = out.replace(/^#\s+/gm, "## ");
  // "Conclusion" headings read as machine-written.
  out = out.replace(/^(#{2,3})\s*(in\s+)?conclusion:?\s*$/gim, "$1 Before you go");

  for (const [re, rep] of PHRASE_FIXES) out = out.replace(re, rep);

  const lower = out.toLowerCase();
  const leftovers = settings.ai.bannedPhrases.filter((p) => lower.includes(p.toLowerCase()));
  if (leftovers.length) warnings.push(`Contains phrases from the avoid list: ${leftovers.join(", ")}`);

  if (/\bas an ai\b|\blanguage model\b/i.test(out)) {
    throw new ContentValidationError("Generated text referenced being an AI", "unsafe");
  }
  return { markdown: out, warnings };
}

export function validateArticle(
  a: { title: string; markdown: string; wordCount: number },
  settings: SiteSettings,
  recentTitles: string[],
) {
  const minWords = Math.max(500, Math.round(settings.ai.minWords * 0.65));
  if (a.wordCount < minWords) {
    throw new ContentValidationError(`Article too short (${a.wordCount} words, need ${minWords}+)`, "too_short");
  }
  const h2 = (a.markdown.match(/^##\s+/gm) ?? []).length;
  if (h2 < 3) throw new ContentValidationError(`Article needs at least 3 sections (found ${h2})`, "structure");
  if (a.title.length < 10 || a.title.length > 120) {
    throw new ContentValidationError("Title length is out of range", "structure");
  }
  const clash = recentTitles.find((t) => titleSimilarity(t, a.title) >= 0.75);
  if (clash) throw new ContentValidationError(`Title is too similar to an existing post: "${clash}"`, "duplicate");
}

function finaliseMeta(plan: Plan, settings: SiteSettings, opts: GenerateOptions) {
  const allowed = settings.ai.categories;
  const category =
    opts.category ||
    allowed.find((c) => c.toLowerCase() === plan.category.trim().toLowerCase()) ||
    allowed[0] ||
    "Stories";
  const tags = [...new Set(plan.tags.map((t) => t.toLowerCase().replace(/^#/, "").trim()).filter((t) => t.length > 1 && t.length <= 40))].slice(0, 6);
  return {
    title: cleanTitle(plan.title).replace(/^["']|["']$/g, "").slice(0, 120),
    category,
    tags,
    excerpt: truncate(plan.excerpt.trim(), 230),
    seoTitle: truncate((plan.seoTitle || plan.title).trim(), 65),
    seoDescription: truncate(plan.seoDescription.trim() || plan.excerpt.trim(), 160),
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Full generation pipeline: pick topic → plan (JSON) → write (Markdown) →
 * clean → validate (length, structure, duplicates) → HTML.
 * Retries once with corrective guidance on duplicate / too-short output.
 */
export async function generateArticle(opts: GenerateOptions, ctx: GenerationContext): Promise<GeneratedArticle> {
  const { settings } = ctx;
  const topic = opts.video ? cleanTitle(opts.video.title) : opts.topic?.trim() || pickTopic(settings.ai.topics, ctx.recent);
  const recentTitles = ctx.recent.map((r) => r.title);
  const avoid: string[] = [];
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { plan, model } = await createPlan(opts, ctx, topic, avoid);
      const meta = finaliseMeta(plan, settings, opts);
      const relatedVideo = opts.video
        ? { youtubeId: opts.video.youtubeId, title: opts.video.title }
        : plan.relatedVideoId
          ? ctx.videos.find((v) => v.youtubeId === plan.relatedVideoId)
          : undefined;

      // Duplicate check on the planned title before spending tokens on the body.
      validateTitleOnly(meta.title, recentTitles);

      let words = 0;
      let markdown = "";
      let warnings: string[] = [];
      for (let w = 1; w <= 2; w++) {
        const { system, user } = writePrompt({
          settings,
          plan: { title: meta.title, angle: plan.angle, outline: plan.outline, category: meta.category },
          relatedVideoTitle: relatedVideo?.title,
          sourceVideo: opts.video,
          expandFrom: w > 1 ? { words } : undefined,
        });
        const res = await groqChat({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          // Companion posts stay closer to the source material.
          temperature: opts.video ? 0.55 : 0.75,
          maxTokens: Math.min(8000, Math.round(settings.ai.maxWords * 2.2) + 600),
          timeoutMs: 120_000,
        });
        const cleaned = cleanMarkdown(res.content, settings, meta.title);
        markdown = cleaned.markdown;
        warnings = cleaned.warnings;
        words = countWords(markdown.replace(/[#*_>`-]/g, " "));
        if (words >= settings.ai.minWords * 0.8) break;
        logger.warn("ai.article_short_retry", { words, attempt: w });
      }

      validateArticle({ title: meta.title, markdown, wordCount: words }, settings, recentTitles);

      return {
        title: meta.title,
        slug: slugify(meta.title),
        excerpt: meta.excerpt,
        contentHtml: markdownToHtml(markdown),
        markdown,
        wordCount: words,
        category: meta.category,
        tags: meta.tags,
        seo: { title: meta.seoTitle, description: meta.seoDescription },
        imageQuery: plan.imageQuery || meta.category,
        imageAlt: plan.imageAlt || meta.title,
        relatedVideoId: relatedVideo?.youtubeId ?? null,
        topic: topic ?? meta.title,
        model,
        promptVersion: PROMPT_VERSION,
        warnings,
      };
    } catch (err) {
      lastError = err;
      if (err instanceof ContentValidationError && (err.kind === "duplicate" || err.kind === "too_short") && attempt < 2) {
        logger.warn("ai.regenerate", { reason: err.message });
        const m = err.message.match(/"(.+)"$/);
        if (m) avoid.push(m[1]!);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function validateTitleOnly(title: string, recentTitles: string[]) {
  const clash = recentTitles.find((t) => titleSimilarity(t, title) >= 0.75);
  if (clash) throw new ContentValidationError(`Title is too similar to an existing post: "${title}"`, "duplicate");
}

const metaSchema = z.object({
  excerpt: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default(""),
});

/** Suggests excerpt, SEO fields, tags and category for existing content. */
export async function suggestMetadata(settings: SiteSettings, title: string, text: string) {
  const { system, user } = metadataPrompt(settings, title, text);
  const res = await groqChat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    json: true,
    temperature: 0.4,
    maxTokens: 700,
  });
  const m = metaSchema.parse(parseJsonObject(res.content));
  return {
    excerpt: truncate(m.excerpt.trim(), 230),
    seoTitle: truncate(m.seoTitle.trim(), 65),
    seoDescription: truncate(m.seoDescription.trim(), 160),
    tags: [...new Set(m.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))].slice(0, 6),
    category: settings.ai.categories.find((c) => c.toLowerCase() === m.category.toLowerCase()) ?? "",
  };
}
