import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Search keywords, grouped by what each page is about. These are the phrases
 * Indian students actually search for when planning study or work in Japan.
 */
export const KEYWORDS = {
  brand: ["Life of KittuKun", "Chitranshu Rajput", "KittuKun"],
  core: [
    "study in Japan from India",
    "study in Japan for Indian students",
    "Japan internship for Indian students",
    "MEXT scholarship",
    "MEXT scholarship for Indian students",
    "fully funded scholarships in Japan",
    "study abroad Japan",
    "work in Japan",
  ],
  universities: [
    "universities in Japan",
    "Japanese universities for international students",
    "English taught programs in Japan",
    "masters in Japan in English",
    "PhD in Japan",
    "MEXT university recommendation",
    "top universities in Japan",
    "national universities in Japan",
    "Japan university finder",
    "University of Tokyo",
    "Kyoto University",
    "Tohoku University",
  ],
  opportunities: [
    "internships in Japan",
    "research internship in Japan",
    "OIST research internship",
    "scholarships in Japan",
    "fully funded internships",
    "summer research programs Japan",
    "MEXT research student",
    "JASSO scholarship",
    "fellowships for Indian students",
    "international internships for Indian students",
  ],
  sessions: [
    "Japan study mentorship",
    "MEXT application guidance",
    "SOP review for Japan",
    "study abroad counselling online",
    "live session study in Japan",
    "research proposal guidance",
  ],
  store: [
    "MEXT research plan template",
    "statement of purpose sample Japan",
    "cold email template professor Japan",
    "study in Japan guide PDF",
    "scholarship application templates",
    "Japan study resources",
  ],
  blog: [
    "study in Japan blog",
    "MEXT scholarship guide",
    "how to get internship in Japan",
    "cold email professors Japan",
    "life in Japan as Indian student",
    "Japanese university application tips",
  ],
  videos: ["study in Japan YouTube", "Japan internship vlog", "MEXT scholarship video", "OIST internship experience", "Indian student in Japan vlog"],
} as const;

type SeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  image?: string | null;
  /** Use the title as-is, without the " · Life of KittuKun" suffix. */
  absoluteTitle?: boolean;
  noindex?: boolean;
};

/** Page metadata with canonical link, Open Graph, Twitter card and keywords in one place. */
export function seoMeta({ title, description, path, keywords = [], image, absoluteTitle, noindex }: SeoInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const images = image ? [{ url: image }] : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: [...new Set([...keywords, ...KEYWORDS.brand])],
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url, siteName: SITE_NAME, locale: "en_IN", type: "website", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: fullTitle, description, ...(image ? { images: [image] } : {}) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** schema.org BreadcrumbList from [name, path] pairs (Home is added automatically). */
export function breadcrumbLd(trail: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as [string, string], ...trail].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absoluteUrl(path) })),
  };
}

/** schema.org CollectionPage + ItemList for listing pages, so search engines see what the page lists. */
export function collectionLd({ name, description, path, items }: { name: string; description: string; path: string; items: { name: string; path: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 50).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
    },
  };
}
