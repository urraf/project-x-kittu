import { createCaptcha } from "@/lib/auth/captcha";
import { ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Public math challenge used by the comment form. */
export const GET = route(async () => ok(await createCaptcha("comment-captcha"), { headers: { "Cache-Control": "no-store" } }));
