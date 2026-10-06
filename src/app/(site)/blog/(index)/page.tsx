import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { safe } from "@/lib/safe";
import { listCategories, listPublishedPosts } from "@/lib/services/posts";
import { BLOG_PAGE_SIZE, absoluteUrl } from "@/lib/site";

export const revalidate = 300;

type Props = { searchParams: Promise<{ page?: string; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page, q } = await searchParams;
  const n = Number(page) || 1;
  const description = "Practical guides to fully funded internships and scholarships in Japan, Korea and Europe, plus honest stories from the journey.";
  return {
    title: q ? `Search: ${q}` : n > 1 ? `Blog, page ${n}` : "Blog",
    description,
    alternates: { canonical: n > 1 ? `/blog?page=${n}` : "/blog", types: { "application/rss+xml": absoluteUrl("/feed.xml") } },
    robots: q ? { index: false, follow: true } : undefined,
    openGraph: { title: "Blog · Life of KittuKun", description, url: absoluteUrl("/blog") },
  };
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
  );
}
