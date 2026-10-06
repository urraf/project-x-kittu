import { renderArt } from "@/lib/og/art";
import { safe } from "@/lib/safe";
import { getPublishedPostBySlug } from "@/lib/services/posts";

export const alt = "Life of KittuKun article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await safe("og.post", () => getPublishedPostBySlug(slug), null);
  return renderArt({ title: post?.title ?? "Life of KittuKun", category: post?.category ?? "Stories", width: 1200, height: 630 });
}
