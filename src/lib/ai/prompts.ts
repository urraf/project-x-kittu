import type { SiteSettings } from "@/lib/validation/settings";

/**
 * Prompt templates for blog generation. Bump PROMPT_VERSION when prompts
 * change meaningfully; it is stored on every generated post for traceability.
 */

export const PROMPT_VERSION = "2026-10.3";

type PlanContext = {
  settings: SiteSettings;
  topic: string | null;
  category?: string;
  keywords?: string[];
  notes?: string;
  recentTitles: string[];
  videos: { youtubeId: string; title: string }[];
  /** When set, the article is a companion post for this one video. */
  sourceVideo?: SourceVideo;
};

export type SourceVideo = { youtubeId: string; title: string; description: string; transcript?: string | null };

/** Keeps the useful part of a YouTube description: drops links, hashtags and social plugs. */
export function cleanVideoDescription(text: string) {
  return text
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+/g, "").replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "").trim())
    .filter((l) => l.length > 1 && !/^(follow|subscribe|instagram|linkedin|telegram|twitter|x:|whatsapp|connect with|business|email|for collab|if you enjoyed|don'?t forget to)/i.test(l.replace(/^[^\p{L}\p{N}]+/u, "")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 3500);
}

/** Ground rules for companion posts: only what the video actually says. */
function videoFactRules(v: SourceVideo) {
  const common = `- No comparison tables of facts. Tables are fine only for the reader's own planning (e.g. a document checklist).
- Personal story: describe only events the source mentions, at the same level of detail. Never add logistics, quotes, names, places or other specifics that aren't there. Reflections and lessons are fine.
- Never present a guess as fact. Where a detail matters and the source doesn't give it, say "check the official page for this year's details".`;
  return v.transcript
    ? `FACT RULES FOR THIS ARTICLE (strict)
- Your source is the video transcript (auto-generated captions, so some words may be mis-heard: fix obvious spellings of well-known names like MEXT, GKS, KAIST, OIST; never guess at unclear ones).
- Use only facts, numbers, steps and stories that appear in the transcript or description. You may explain and organise them, add general advice, and remind readers that amounts and deadlines change each year.
- Do not add eligibility rules, amounts, dates, rankings, percentages or partner organisations that the transcript doesn't state.
${common}`
    : `FACT RULES FOR THIS ARTICLE (strict)
- The description is an outline of the video, not a fact sheet. You have NOT seen the video.
- Do not state specific eligibility rules, GPA or test-score cut-offs, stipend or salary amounts, deadlines, dates, durations, rankings, percentages, seat counts or partner organisations unless the description states them word for word.
- Instead, explain what each point means for the reader, where to find the current official details, how to prepare, and common mistakes.
${common}`;
}

function videoBlock(v: SourceVideo) {
  return `YouTube title: ${v.title}
Video description (the author's own words, links removed):
"""
${cleanVideoDescription(v.description) || "(no description)"}
"""${v.transcript ? `
Video transcript (what the author says in the video):
"""
${v.transcript.slice(0, 12000)}${v.transcript.length > 12000 ? " …" : ""}
"""` : ""}`;
}

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

  const user = `${ctx.sourceVideo ? `Plan a companion blog article for this video by the author. The article covers the same subject as the video, written for readers who prefer to read (and for search). Base it only on what the video covers (transcript and description below); for anything the description doesn't confirm (exact dates, amounts, eligibility), the article should explain the typical process and tell readers to check the official page.

${videoBlock(ctx.sourceVideo)}

${videoFactRules(ctx.sourceVideo)}

The outline must follow these rules too. The article title must NOT copy the YouTube title: no emojis, no ALL CAPS, no "EXPLAINED!". Set relatedVideoId to "${ctx.sourceVideo.youtubeId}".` : ctx.topic ? `Topic to cover: ${ctx.topic}` : "Choose a fresh, specific, high-value topic within the niche that the audience actively searches for."}
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
  sourceVideo?: SourceVideo;
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
${ctx.sourceVideo ? `\nThis article is the written companion to the author's YouTube video below, which is embedded at the top of the page. Cover the same ground so the article stands on its own, and mention "the video above" once, naturally.\n\n${videoBlock(ctx.sourceVideo)}\n\n${videoFactRules(ctx.sourceVideo)}` : ctx.relatedVideoTitle ? `\nThe author has a related YouTube video titled "${ctx.relatedVideoTitle}". It will be embedded above the article; you may refer to "my video on this" once, naturally, near the end.` : ""}
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
