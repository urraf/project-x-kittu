import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/blog/ArticleView";
import { StatusBadge } from "@/components/admin/ui";
import { getPostById, getRelatedPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "Preview" };
export const dynamic = "force-dynamic";

/** Renders a post (any status) exactly as it will appear publicly. Admin-only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  const [settings, related] = await Promise.all([getSettings(), getRelatedPosts(post, 5).catch(() => [])]);
  return (
    <div className="-mx-4 -my-8 md:-mx-8 md:-my-12">
      <div className="sticky top-14 z-50 flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-sm text-cream lg:top-0 md:px-8">
        <span className="flex items-center gap-3">
          Preview <StatusBadge status={post.status} publishedAt={post.publishedAt} />
        </span>
        <Link href={`/admin/posts/${post.id}`} className="rounded-full bg-cream/10 px-3 py-1 hover:bg-cream/20">Back to editor</Link>
      </div>
      <div className="[&>div:nth-of-type(2)]:!pt-10">
        <ArticleView post={post} related={related} settings={settings} preview />
      </div>
    </div>
  );
}
