import { requireAdmin } from "@/lib/auth/session";
import { notFound, ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { deletePost, getPostById, updatePost } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const post = await getPostById((await params).id);
  if (!post) throw notFound("Post not found");
  return ok(post);
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const post = await updatePost((await params).id, await readJson(req));
  revalidateSite();
  return ok(post);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const res = await deletePost((await params).id);
  revalidateSite();
  return ok(res);
});
