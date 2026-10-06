import "server-only";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import { countWords, readingTimeMinutes, slugify, stripHtml } from "@/lib/utils/text";

/**
 * All rich content passes through `sanitizeContent` before it is stored, so
 * rendering with dangerouslySetInnerHTML on the public site is safe.
 */

const YT_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "a", "ul", "ol", "li", "blockquote",
    "code", "pre", "hr", "br", "img", "figure", "figcaption", "iframe", "div", "span",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    iframe: ["src", "width", "height", "title", "allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
    div: ["data-youtube-video", "class"],
    code: ["class"],
    pre: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
  },
  allowedClasses: {
    code: [/^language-[\w-]+$/],
    pre: [/^language-[\w-]+$/],
    div: ["callout", "video-embed"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  allowedIframeHostnames: YT_HOSTS,
  transformTags: {
    h1: "h2",
    b: "strong",
    i: "em",
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : { href, ...(attribs.title ? { title: attribs.title } : {}) },
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        src: (attribs.src ?? "").replace("://www.youtube.com/embed/", "://www.youtube-nocookie.com/embed/"),
        loading: "lazy",
        allowfullscreen: "true",
        referrerpolicy: "strict-origin-when-cross-origin",
        title: attribs.title || "YouTube video",
      },
    }),
  },
  exclusiveFilter: (frame) => {
    if (frame.tag === "iframe") {
      try {
        return !YT_HOSTS.includes(new URL(frame.attribs.src ?? "").hostname);
      } catch {
        return true;
      }
    }
    // Drop empty paragraphs the editor sometimes leaves behind.
    return frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren?.length;
  },
};

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS).trim();
}

/**
 * Strips all markup from plain-text fields (titles, excerpts, SEO). Entities are
 * decoded back to characters because React escapes text when rendering;
 * leaving "&amp;" would show up literally.
 */
export function sanitizePlain(text: string): string {
  return sanitizeHtml(text ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

export function markdownToHtml(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  return sanitizeContent(html);
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Adds stable ids to h2/h3 headings and returns a table of contents. */
export function withHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const used = new Map<string, number>();
  const toc: TocItem[] = [];
  const out = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, _attrs, inner: string) => {
    const text = stripHtml(inner);
    let id = slugify(text, 60);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n + 1}`;
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

export function contentStats(html: string) {
  const text = stripHtml(html);
  const words = countWords(text);
  return { text, wordCount: words, readingTime: readingTimeMinutes(words) };
}
