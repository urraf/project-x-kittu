import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createPost, listAdminPosts } from "@/lib/services/posts";
import { postListQuerySchema } from "@/lib/validation/post";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const query = postListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await listAdminPosts(query));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const post = await createPost(await readJson(req), { source: "manual" });
  if (post.status === "published") revalidateSite();
  return ok(post, { status: 201 });
});
