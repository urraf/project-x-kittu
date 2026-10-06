import { PostsTable } from "@/components/admin/PostsTable";

export const metadata = { title: "Blog posts" };

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <PostsTable initialStatus={["draft", "published", "scheduled"].includes(status ?? "") ? status! : "all"} />;
}
