import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { safe } from "@/lib/safe";
import { listCategories, listPublishedPosts } from "@/lib/services/posts";
import { BLOG_PAGE_SIZE, absoluteUrl } from "@/lib/site";
import { KEYWORDS, collectionLd, seoMeta } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";

export const revalidate = 300;

type Props = { searchParams: Promise<{ page?: string; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page, q } = await searchParams;
  const n = Number(page) || 1;
  const description =
    "Practical guides to the MEXT scholarship, OIST and research internships, cold-emailing professors and applying to Japanese universities, for Indian students.";
  const meta = seoMeta({
    title: q ? `Search: ${q}` : n > 1 ? `Study in Japan Blog, page ${n}` : "Study in Japan Blog: MEXT & Internships",
    description,
    path: n > 1 ? `/blog?page=${n}` : "/blog",
    keywords: KEYWORDS.blog,
    noindex: Boolean(q),
  });
  return { ...meta, alternates: { ...meta.alternates, types: { "application/rss+xml": absoluteUrl("/feed.xml") } } };
}

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const [list, categories] = await Promise.all([
    safe("blog.list", () => listPublishedPosts({ page, pageSize: BLOG_PAGE_SIZE + (page === 1 && !q ? 1 : 0), q }), { items: [], total: 0, page, pages: 1 }),
    safe("blog.categories", () => listCategories(), []),
  ]);
  return (
    <>
      {!q && <JsonLd data={collectionLd({ name: "Study in Japan blog", description: "Guides to MEXT, research internships and applying to Japanese universities.", path: "/blog", items: list.items.map((p) => ({ name: p.title, path: `/blog/${p.slug}` })) })} />}
      <BlogIndex
        kicker={q ? "Search" : "The blog"}
        title={q ? <>Results for <em className="text-accent">“{q}”</em></> : <>Field notes &amp; <em className="text-accent">guides</em></>}
        description={q ? `${list.total} article${list.total === 1 ? "" : "s"} found.` : "Long-form guides to applications, scholarships and research internships, plus the stories that didn't fit in a video."}
        posts={list.items}
        page={page}
        pages={list.pages}
        basePath="/blog"
        query={q}
        categories={categories}
        showFeature={page === 1 && !q}
      />
    </>
  );
}
