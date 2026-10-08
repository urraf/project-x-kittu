import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getMediaFile } from "@/lib/services/media";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; file: string }> };

/** Serves an optimised image variant. Media ids are immutable, so responses cache forever. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id, file } = await params;
  const variant = file === "thumb.webp" ? "thumb" : file === "full.webp" ? "full" : null;
  if (!variant) return new NextResponse("Not found", { status: 404 });

  try {
    const media = await getMediaFile(id, variant);
    if (!media) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

    const headers = {
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: media.etag,
      "X-Content-Type-Options": "nosniff",
    };
    if (req.headers.get("if-none-match") === media.etag) return new NextResponse(null, { status: 304, headers });
    return new NextResponse(new Uint8Array(media.body), {
      headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(media.body.length) },
    });
  } catch (error) {
    logger.error("media.serve_failed", { id, error });
    return new NextResponse("Unavailable", { status: 503 });
  }
}
