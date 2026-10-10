import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createUniversity, listAdminUniversities } from "@/lib/services/universities";

export const dynamic = "force-dynamic";

const query = z.object({ q: z.string().max(100).optional(), type: z.enum(["national", "public", "private", "verified", "unverified"]).optional(), page: z.coerce.number().int().min(1).max(100).default(1) });

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);
  return ok(await listAdminUniversities(query.parse(Object.fromEntries(req.nextUrl.searchParams))));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const u = await createUniversity(await readJson(req));
  revalidateSite();
  return ok(u, { status: 201 });
});
