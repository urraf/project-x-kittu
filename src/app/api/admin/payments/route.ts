import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { listAdminPayments, paymentsSummary } from "@/lib/services/admin-payments";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(["all", "paid", "refunded", "kept"]).default("all"),
  provider: z.enum(["all", "razorpay", "demo"]).default("all"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);
  const params = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const [list, summary] = await Promise.all([listAdminPayments(params), paymentsSummary()]);
  return ok({ ...list, summary });
});
