import { requireAdmin } from "@/lib/auth/session";
import { notFound, ok, route } from "@/lib/http";
import { getAdminStudentBookings } from "@/lib/services/admin-payments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const bookings = await getAdminStudentBookings((await params).id);
  if (!bookings) throw notFound("Student not found");
  return ok(bookings);
});
