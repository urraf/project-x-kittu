import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { safe } from "@/lib/safe";
import { listCategories, listPublishedPosts } from "@/lib/services/posts";
import { BLOG_PAGE_SIZE } from "@/lib/site";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await safe("cat.meta", () => listCategories(), [])).find((c) => c.slug === slug);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  return {
    title: `${cat.name} articles`,
    description: `Guides and stories about ${cat.name.toLowerCase()} from Life of KittuKun.`,
    alternates: { canonical: `/blog/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const categories = await safe("cat.list", () => listCategories(), []);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const list = await safe("cat.posts", () => listPublishedPosts({ page, pageSize: BLOG_PAGE_SIZE, category: cat.name }), { items: [], total: 0, page, pages: 1 });
  return (
    <BlogIndex
      kicker="Category"
      title={<em className="text-accent">{cat.name}</em>}
      description={`${cat.count} article${cat.count === 1 ? "" : "s"} in ${cat.name}.`}
      posts={list.items}
      page={page}
      pages={list.pages}
      basePath={`/blog/category/${slug}`}
      categories={categories}
      activeCategory={slug}
    />
  );
}
