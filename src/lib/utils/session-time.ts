/** Session date/time helpers. All sessions are scheduled and shown in IST. Client-safe. */

const TZ = "Asia/Kolkata";

export function sessionEnd(startsAt: string | Date, durationMin: number) {
  return new Date(new Date(startsAt).getTime() + durationMin * 60_000);
}

export function formatSessionDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatSessionTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).toUpperCase();
}

/** "Sat, 18 Oct 2026 · 7:00 PM – 8:30 PM IST" */
export function formatSessionWhen(startsAt: string | Date, durationMin: number) {
  return `${formatSessionDate(startsAt)} · ${formatSessionTime(startsAt)} – ${formatSessionTime(sessionEnd(startsAt, durationMin))} IST`;
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
}

export function formatPrice(rupees: number) {
  return rupees === 0 ? "Free" : `₹${rupees.toLocaleString("en-IN")}`;
}

/** Splits a Date into IST "YYYY-MM-DD" and "HH:mm" for form inputs. */
export function toIstInputs(d: string | Date) {
  const ist = new Date(new Date(d).getTime() + 5.5 * 3600_000);
  return { date: ist.toISOString().slice(0, 10), time: ist.toISOString().slice(11, 16) };
}

/** Builds a Date from IST date ("YYYY-MM-DD") and time ("HH:mm") inputs. */
export function fromIstInputs(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`);
}

/** Google Calendar "add event" link. */
export function googleCalendarLink(opts: { title: string; startsAt: string | Date; durationMin: number; details: string; location?: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(opts.startsAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(start)}/${fmt(sessionEnd(start, opts.durationMin))}`,
    details: opts.details,
    ...(opts.location ? { location: opts.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
