import { verifyCaptcha } from "@/lib/auth/captcha";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { commentInputSchema, createComment, listVisibleComments } from "@/lib/services/engagement";
import { getSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const settings = await getSettings();
  const comments = settings.comments.enabled ? await listVisibleComments((await params).id) : [];
  return ok({ comments, enabled: settings.comments.enabled, requireApproval: settings.comments.requireApproval }, { headers: { "Cache-Control": "no-store" } });
});

/** Anonymous comment: no account, just a name, the comment and a math check. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const settings = await getSettings();
  if (!settings.comments.enabled) throw new ApiError(403, "Comments are turned off right now.", "comments_disabled");

  const ip = clientIp(req);
  const [burst, daily] = await Promise.all([hitLimit(`comment:${ip}`, 5, 10 * 60 * 1000), hitLimit(`comment-day:${ip}`, 30, 24 * 3600 * 1000)]);
  const blocked = !burst.allowed ? burst : !daily.allowed ? daily : null;
  if (blocked) throw tooMany("You've posted a lot of comments. Please wait a little before posting again.", blocked.retryAfterSec);

  const input = commentInputSchema.parse(await readJson(req));
  if (input.website) {
    logger.warn("comment.honeypot", { ip });
    return ok({ comment: null, pending: true }, { status: 201 }); // pretend success, store nothing
  }

  const captcha = await verifyCaptcha(input.captchaToken, input.captchaAnswer, "comment-captcha");
  if (!captcha.ok) {
    throw new ApiError(400, captcha.reason === "wrong" ? "That answer isn't right. Try the new question." : "The math question expired. Here's a new one.", "captcha_failed");
  }

  const result = await createComment((await params).id, input, { ip, requireApproval: settings.comments.requireApproval });
  logger.info("comment.created", { post: (await params).id, pending: result.pending });
  return ok(result, { status: 201 });
});
