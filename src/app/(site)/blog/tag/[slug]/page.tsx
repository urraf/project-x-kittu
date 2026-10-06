import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { safe } from "@/lib/safe";
import { listCategories, listPublishedPosts, resolveTagSlug } from "@/lib/services/posts";
import { BLOG_PAGE_SIZE } from "@/lib/site";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await safe("tag.meta", () => resolveTagSlug(slug), null);
  if (!tag) return { title: "Tag not found", robots: { index: false } };
  return { title: `#${tag.name}`, description: `Articles tagged “${tag.name}” on Life of KittuKun.`, alternates: { canonical: `/blog/tag/${slug}` } };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [tag, categories] = await Promise.all([safe("tag.resolve", () => resolveTagSlug(slug), null), safe("tag.cats", () => listCategories(), [])]);
  if (!tag) notFound();
  const list = await safe("tag.posts", () => listPublishedPosts({ page, pageSize: BLOG_PAGE_SIZE, tag: tag.name }), { items: [], total: 0, page, pages: 1 });
  return (
    <BlogIndex
      kicker="Tag"
      title={<>#<em className="text-accent">{tag.name}</em></>}
      description={`${tag.count} article${tag.count === 1 ? "" : "s"} tagged “${tag.name}”.`}
      posts={list.items}
      page={page}
      pages={list.pages}
      basePath={`/blog/tag/${slug}`}
      categories={categories}
    />
  );
}
