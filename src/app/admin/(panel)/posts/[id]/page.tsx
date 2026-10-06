import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { getPostById, listTags } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Edit post" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, settings, tags] = await Promise.all([getPostById(id), getSettings(), listTags(30).catch(() => [])]);
  if (!post) notFound();
  const categories = [...new Set([...settings.ai.categories, post.category])];
  return (
    <PostEditor
      key={post.id}
      post={post}
      categories={categories}
      tagSuggestions={tags.map((t) => t.name)}
      defaultAuthor={{ name: settings.profile.name, avatar: settings.profile.avatarUrl, bio: settings.profile.shortBio }}
      siteUrl={SITE_URL}
    />
  );
}
