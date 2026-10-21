import { indexNowKey } from "@/lib/services/indexnow";

export const dynamic = "force-dynamic";

/** IndexNow ownership check: search engines fetch this to confirm the key belongs to this site. */
export function GET() {
  return new Response(indexNowKey(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
