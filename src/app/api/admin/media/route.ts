import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { ApiError, badRequest, ok, route } from "@/lib/http";
import { ingestImage, listMedia } from "@/lib/services/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = route(async (req) => {
  await requireAdmin(req);
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  return ok(await listMedia({ page, limit: 40 }));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > env.maxUploadBytes + 64 * 1024) {
    throw new ApiError(413, `Image is too large. Maximum size is ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`, "file_too_large");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Upload must be sent as multipart/form-data.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file was uploaded.");
  const alt = String(form.get("alt") ?? "").slice(0, 300);
  const media = await ingestImage(Buffer.from(await file.arrayBuffer()), { originalName: file.name, alt, source: "upload" });
  return ok(media, { status: 201 });
});
