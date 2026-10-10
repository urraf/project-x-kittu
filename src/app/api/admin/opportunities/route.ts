import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createOpportunity, listAdminOpportunities } from "@/lib/services/opportunities";

export const dynamic = "force-dynamic";

const query = z.object({ q: z.string().max(100).optional(), view: z.enum(["all", "live", "closed", "draft"]).default("all"), page: z.coerce.number().int().min(1).max(1000).default(1) });

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);
  return ok(await listAdminOpportunities(query.parse(Object.fromEntries(req.nextUrl.searchParams))));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const o = await createOpportunity(await readJson(req));
  revalidateSite();
  return ok(o, { status: 201 });
});
