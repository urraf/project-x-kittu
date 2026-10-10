import { NextResponse } from "next/server";
import { getStudent } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { openDownload } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Download a purchased product: only the buyer, only while the order is paid (not refunded). */
export async function GET(_req: Request, { params }: Ctx) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ ok: false, error: { message: "Please log in to download." } }, { status: 401 });
  const { id } = await params;
  // Generous for real use, but stops a shared login from being used as a public mirror.
  const limit = await hitLimit(`download:${student._id}:${id}`, 30, 24 * 3600_000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: { message: "Download limit reached for today. Please try again tomorrow." } }, { status: 429 });
  const dl = await openDownload(student._id, id);
  if (!dl) return NextResponse.json({ ok: false, error: { message: "This download isn't available." } }, { status: 404 });
  if (dl.kind === "link") return NextResponse.redirect(dl.url, 302);
  const ascii = dl.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new NextResponse(dl.stream, {
    headers: {
      "Content-Type": dl.contentType,
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dl.fileName)}`,
      ...(dl.size ? { "Content-Length": String(dl.size) } : {}),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
