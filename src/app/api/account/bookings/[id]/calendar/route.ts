import { NextResponse } from "next/server";
import { getStudent } from "@/lib/auth/student";
import { getStudentBooking } from "@/lib/services/mentorship";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { sessionEnd } from "@/lib/utils/session-time";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// RFC 5545: escape \ ; , and newlines, and fold lines longer than 75 octets.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

/** A calendar file (Apple Calendar, Outlook, Google) for one of the student's own bookings. */
export async function GET(_req: Request, { params }: Ctx) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ ok: false, error: { message: "Please log in." } }, { status: 401 });
  const b = await getStudentBooking(student._id, (await params).id);
  const s = b?.session;
  if (!b || !s || b.status !== "confirmed") return NextResponse.json({ ok: false, error: { message: "Booking not found." } }, { status: 404 });

  const start = new Date(s.startsAt);
  const details = [s.meetingUrl ? `Join: ${s.meetingUrl}` : "", `Your bookings: ${absoluteUrl("/account")}`].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_NAME}//Sessions//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${b.id}@${new URL(absoluteUrl("/")).hostname}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(sessionEnd(start, s.durationMin))}`,
    `SUMMARY:${esc(s.title)}`,
    `DESCRIPTION:${esc(details)}`,
    ...(s.meetingUrl ? [`LOCATION:${esc(s.meetingUrl)}`, `URL:${esc(s.meetingUrl)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(s.title)} starts in 30 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const body = lines.map(fold).join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${s.slug.slice(0, 60)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
