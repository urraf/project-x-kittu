import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/blog/ArticleView";
import { JsonLd } from "@/components/ui/JsonLd";
import { safe } from "@/lib/safe";
import { getPublishedPostBySlug, getRelatedPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { slugify } from "@/lib/utils/text";

export const revalidate = 300;

/** Render each page on first visit, then cache it (ISR) and refresh via revalidation. */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

const load = (slug: string) => safe("post.detail", () => getPublishedPostBySlug(slug), null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const title = post.seo.title || post.title;
  const description = post.seo.description || post.excerpt;
  const image = post.seo.ogImage || post.coverImage?.url || `/blog/${post.slug}/opengraph-image`;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    keywords: post.tags,
    authors: [{ name: post.author.name }],
    alternates: { canonical: post.seo.canonicalUrl || `/blog/${post.slug}` },
    robots: post.seo.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      section: post.category,
      tags: post.tags,
      images: [{ url: image, width: post.coverImage?.width ?? 1200, height: post.coverImage?.height ?? 630, alt: post.coverImage?.alt || post.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) notFound();
  const [settings, related] = await Promise.all([getSettings(), safe("post.related", () => getRelatedPosts(post, 3), [])]);
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.seo.description || post.excerpt,
            image: post.coverImage?.url ? [absoluteUrl(post.coverImage.url)] : undefined,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            wordCount: post.wordCount,
            articleSection: post.category,
            keywords: post.tags.join(", "),
            mainEntityOfPage: url,
            author: { "@type": "Person", name: post.author.name || settings.profile.name, url: absoluteUrl("/journey") },
            publisher: { "@type": "Person", name: settings.profile.name, url: absoluteUrl("/") },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Blog", item: absoluteUrl("/blog") },
              { "@type": "ListItem", position: 2, name: post.category, item: absoluteUrl(`/blog/category/${slugify(post.category)}`) },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          },
        ]}
      />
      <ArticleView post={post} related={related} settings={settings} />
    </>
  );
}
