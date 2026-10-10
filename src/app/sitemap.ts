import type { MetadataRoute } from "next";
import { safe } from "@/lib/safe";
import { getSitemapPosts, listCategories } from "@/lib/services/posts";
import { listPublicVideos } from "@/lib/services/videos";
import { listUpcomingSessions } from "@/lib/services/mentorship";
import { listOpportunitySlugs } from "@/lib/services/opportunities";
import { listUniversitySlugs } from "@/lib/services/universities";
import { listPublishedProducts } from "@/lib/services/store";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, videos, sessions, opportunities, products, universities] = await Promise.all([
    safe("sitemap.posts", () => getSitemapPosts(), []),
    safe("sitemap.categories", () => listCategories(), []),
    safe("sitemap.videos", () => listPublicVideos({ limit: 500 }), []),
    safe("sitemap.sessions", () => listUpcomingSessions(50), []),
    safe("sitemap.opportunities", () => listOpportunitySlugs(), []),
    safe("sitemap.products", () => listPublishedProducts({ limit: 200 }), []),
    safe("sitemap.universities", () => listUniversitySlugs(), []),
  ]);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/videos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/sessions`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...sessions.map((s) => ({ url: `${SITE_URL}/sessions/${s.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${SITE_URL}/opportunities`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...opportunities.map((o) => ({ url: `${SITE_URL}/opportunities/${o.slug}`, lastModified: o.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/universities`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...universities.map((u) => ({ url: `${SITE_URL}/universities/${u.slug}`, lastModified: u.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${SITE_URL}/store`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({ url: `${SITE_URL}/store/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/collaborate`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/blog/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...videos.map((v) => ({ url: `${SITE_URL}/videos/${v.youtubeId}`, lastModified: v.publishedAt ? new Date(v.publishedAt) : undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
