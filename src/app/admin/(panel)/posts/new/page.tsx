import { PostEditor } from "@/components/admin/PostEditor";
import { listTags } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "New post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const [settings, tags] = await Promise.all([getSettings(), listTags(30).catch(() => [])]);
  return (
    <PostEditor
      categories={settings.ai.categories}
      tagSuggestions={tags.map((t) => t.name)}
      defaultAuthor={{ name: settings.profile.name, avatar: settings.profile.avatarUrl, bio: settings.profile.shortBio }}
      siteUrl={SITE_URL}
    />
  );
}
