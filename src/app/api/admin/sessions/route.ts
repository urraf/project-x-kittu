import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { revalidateSite } from "@/lib/revalidate";
import { createSession, listAdminSessions } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = route(async (req) => {
  await requireAdmin(req);
  const f = req.nextUrl.searchParams.get("filter");
  return ok(await listAdminSessions(f === "upcoming" || f === "past" ? f : "all"));
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const session = await createSession(await readJson(req));
  revalidateSite();
  return ok(session, { status: 201 });
});
