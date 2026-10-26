import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { STUDENT_VIEWS, listAdminStudents } from "@/lib/services/admin-payments";

export const dynamic = "force-dynamic";

const query = z.object({ q: z.string().max(100).optional(), page: z.coerce.number().int().min(1).max(1000).default(1), view: z.enum(STUDENT_VIEWS).catch("all") });

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);
  return ok(await listAdminStudents(query.parse(Object.fromEntries(req.nextUrl.searchParams))));
});
