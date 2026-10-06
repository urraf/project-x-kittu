import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { openMediaStream } from "@/lib/services/media";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; file: string }> };

/** Streams an optimised image variant from GridFS. Media ids are immutable, so responses cache forever. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id, file } = await params;
  const variant = file === "thumb.webp" ? "thumb" : file === "full.webp" ? "full" : null;
  if (!variant) return new NextResponse("Not found", { status: 404 });

  try {
    const media = await openMediaStream(id, variant);
    if (!media) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

    if (req.headers.get("if-none-match") === media.etag) {
      media.stream.cancel().catch(() => {});
      return new NextResponse(null, { status: 304, headers: { ETag: media.etag } });
    }
    return new NextResponse(media.stream, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(media.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: media.etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("media.serve_failed", { id, error });
    return new NextResponse("Unavailable", { status: 503 });
  }
}
