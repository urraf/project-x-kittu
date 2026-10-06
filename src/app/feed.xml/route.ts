import { safe } from "@/lib/safe";
import { listPublishedPosts } from "@/lib/services/posts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const revalidate = 900;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const { items } = await safe("feed.posts", () => listPublishedPosts({ pageSize: 30 }), { items: [], total: 0, page: 1, pages: 1 });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE_NAME)}</title>
  <link>${SITE_URL}</link>
  <description>${esc(SITE_DESCRIPTION)}</description>
  <language>en-in</language>
  <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
  ${items
    .map(
      (p) => `<item>
    <title>${esc(p.title)}</title>
    <link>${absoluteUrl(`/blog/${p.slug}`)}</link>
    <guid isPermaLink="true">${absoluteUrl(`/blog/${p.slug}`)}</guid>
    <description>${esc(p.excerpt)}</description>
    <category>${esc(p.category)}</category>
    ${p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : ""}
  </item>`,
    )
    .join("\n  ")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900, s-maxage=900" } });
}
