import type { SiteSettings } from "@/lib/validation/settings";

/**
 * Prompt templates for blog generation. Bump PROMPT_VERSION when prompts
 * change meaningfully; it is stored on every generated post for traceability.
 */

export const PROMPT_VERSION = "2026-10.1";

type PlanContext = {
  settings: SiteSettings;
  topic: string | null;
  category?: string;
  keywords?: string[];
  notes?: string;
  recentTitles: string[];
  videos: { youtubeId: string; title: string }[];
};

function persona(s: SiteSettings) {
  return `You write for "${s.profile.channelName}", the personal blog of ${s.profile.name} (YouTube: ${s.profile.handle}).
About the author: ${s.profile.shortBio}
Niche: ${s.ai.niche}
Audience: ${s.ai.audience}`;
}

export function planPrompt(ctx: PlanContext) {
  const { settings: s } = ctx;
  const system = `${persona(s)}

You are the editorial planner. You design one genuinely useful, specific blog article and return ONLY a JSON object. No markdown, no commentary.`;

  const user = `${ctx.topic ? `Topic to cover: ${ctx.topic}` : "Choose a fresh, specific, high-value topic within the niche that the audience actively searches for."}
${ctx.category ? `Required category: ${ctx.category}` : `Pick the best category from: ${s.ai.categories.join(", ")}`}
${ctx.keywords?.length ? `Keywords to naturally target: ${ctx.keywords.join(", ")}` : ""}
${ctx.notes ? `Editor's notes: ${ctx.notes}` : ""}

Recently published titles. Do NOT repeat these or overlap heavily with them:
${ctx.recentTitles.length ? ctx.recentTitles.map((t) => `- ${t}`).join("\n") : "- (none yet)"}

The author's YouTube videos. Set relatedVideoId ONLY if one clearly matches the article's subject; otherwise null:
${ctx.videos.length ? ctx.videos.map((v) => `- ${v.youtubeId}: ${v.title}`).join("\n") : "- (none)"}

Return JSON with exactly these keys:
{
  "title": "Specific, human, under 70 characters. No emojis, no ALL CAPS, no clickbait, avoid colons unless natural.",
  "angle": "One sentence: the unique angle and what the reader walks away with.",
  "category": "One category name from the allowed list.",
  "tags": ["3 to 6 short lowercase tags"],
  "excerpt": "140-220 character summary that makes a student want to read it.",
  "seoTitle": "Under 60 characters, includes the primary keyword naturally.",
  "seoDescription": "120-155 characters, natural sentence, includes the primary keyword.",
  "outline": [{ "heading": "Section heading", "points": ["what this section must cover"] }],
  "imageQuery": "2-4 word stock-photo search query for a calm, editorial cover photo (no text in image)",
  "imageAlt": "Descriptive alt text for that cover image",
  "relatedVideoId": "an 11-character id from the list above, or null"
}
The outline should have 5 to 8 sections that build logically. Make it concrete and practical.`;

  return { system, user };
}

type WriteContext = {
  settings: SiteSettings;
  plan: { title: string; angle: string; outline: { heading: string; points: string[] }[]; category: string };
  relatedVideoTitle?: string;
  expandFrom?: { words: number };
};

export function writePrompt(ctx: WriteContext) {
  const { settings: s, plan } = ctx;
  const system = `${persona(s)}

VOICE
${s.ai.voice}

EDITORIAL GUIDELINES
${s.ai.guidelines}

STYLE RULES
- Sound like a real person who has been through this, not a brochure. Vary sentence length. Use contractions.
- Prefer specific nouns and verbs over adjectives. Cut filler.
- Never use these words or phrases: ${s.ai.bannedPhrases.map((p) => `"${p}"`).join(", ")}.
- Use em dashes sparingly (at most two in the whole article).
- Never mention that you are an AI or that this text was generated.
- Do not invent statistics, quotes, exact deadlines, stipend amounts or named people. When a number matters, describe the typical range and tell readers to verify on the official page.

FORMAT
- Output GitHub-flavoured Markdown only. No front matter, no code fences around the whole answer.
- Do NOT repeat the title as a heading. Begin with a 2–3 paragraph introduction without any heading.
- Use "## " for section headings and "### " for sub-sections. Never use "# ".
- Use bullet or numbered lists only where they genuinely help (steps, checklists).
- Bold sparingly for key terms.
- Length: ${s.ai.minWords}–${s.ai.maxWords} words.`;

  const user = `Write the full article.

Title: ${plan.title}
Angle: ${plan.angle}
Category: ${plan.category}

Outline to follow (you may refine headings to sound natural):
${plan.outline.map((o, i) => `${i + 1}. ${o.heading}\n${o.points.map((p) => `   - ${p}`).join("\n")}`).join("\n")}
${ctx.relatedVideoTitle ? `\nThe author has a related YouTube video titled "${ctx.relatedVideoTitle}". It will be embedded above the article; you may refer to "my video on this" once, naturally, near the end.` : ""}
${ctx.expandFrom ? `\nYour previous draft was only about ${ctx.expandFrom.words} words. This version must reach at least ${s.ai.minWords} words by going deeper with examples and steps, not by padding.` : ""}`;

  return { system, user };
}

export function metadataPrompt(settings: SiteSettings, title: string, text: string) {
  return {
    system: `${persona(settings)}\n\nYou are an SEO editor. Return ONLY a JSON object.`,
    user: `Article title: ${title}

Article text (may be truncated):
"""
${text.slice(0, 9000)}
"""

Return JSON:
{
  "excerpt": "140-220 character human summary",
  "seoTitle": "under 60 characters",
  "seoDescription": "120-155 characters",
  "tags": ["3-6 lowercase tags"],
  "category": "best fit from: ${settings.ai.categories.join(", ")}"
}`,
  };
}
