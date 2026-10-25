import { NextResponse } from "next/server";
import { safe } from "@/lib/safe";
import { getPopupContent } from "@/lib/services/popup";

export const dynamic = "force-dynamic";

/** Content for the welcome popup (or null when it's switched off). Short CDN cache keeps seat counts fresh. */
export async function GET() {
  const data = await safe("popup.content", () => getPopupContent(), null);
  return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
