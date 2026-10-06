import { createCaptcha } from "@/lib/auth/captcha";
import { ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const captcha = await createCaptcha();
  return ok(captcha, { headers: { "Cache-Control": "no-store" } });
});
