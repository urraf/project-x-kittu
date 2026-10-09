import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { refundCancelledBooking } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Refund a cancelled booking that still holds the student's money. */
export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const result = await refundCancelledBooking((await params).id);
  revalidateSite();
  return ok(result);
});
