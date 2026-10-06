import type { MetadataRoute } from "next";
import { safe } from "@/lib/safe";
import { getSitemapPosts, listCategories } from "@/lib/services/posts";
import { listPublicVideos } from "@/lib/services/videos";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, videos] = await Promise.all([
    safe("sitemap.posts", () => getSitemapPosts(), []),
    safe("sitemap.categories", () => listCategories(), []),
    safe("sitemap.videos", () => listPublicVideos({ limit: 500 }), []),
  ]);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/journey`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/videos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/collaborate`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/blog/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...videos.map((v) => ({ url: `${SITE_URL}/videos/${v.youtubeId}`, lastModified: v.publishedAt ? new Date(v.publishedAt) : undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
