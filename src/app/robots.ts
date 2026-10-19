import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/media/ serves uploaded photos (blog, university, product covers): keep it crawlable for Google Images.
    rules: [{ userAgent: "*", allow: ["/", "/api/media/"], disallow: ["/admin", "/api/", "/account", "/feedback/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
