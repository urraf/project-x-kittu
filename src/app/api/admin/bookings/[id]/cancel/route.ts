import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { cancelBooking } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { refund } = z.object({ refund: z.boolean().default(false) }).parse(await readJson(req));
  const result = await cancelBooking((await params).id, { refund });
  revalidateSite();
  return ok(result);
});
