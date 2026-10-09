import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sessionEnd } from "@/lib/utils/session-time";

/**
 * Meeting links. With Google connected (OAuth refresh token of the host's
 * account), each session gets a real Google Calendar event with a Meet link,
 * and confirmed students are added as guests (Google emails them an invite).
 * Without Google, a free Jitsi Meet room is generated instead.
 */

export function isGoogleMeetConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRefreshToken);
}

async function googleAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      refresh_token: env.googleRefreshToken!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(`Google token error: ${json.error ?? res.status}`);
  return json.access_token;
}

const calendarUrl = (path = "") => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.googleCalendarId)}/events${path}`;

export type MeetingInfo = { provider: "google" | "jitsi" | "manual"; url: string; googleEventId?: string };

export function jitsiLink(title: string) {
  const slug = title.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 30) || "Session";
  return `https://meet.jit.si/LifeOfKittuKun-${slug}-${randomBytes(4).toString("hex")}`;
}

/** Creates a meeting for a session. Falls back to Jitsi if Google fails. */
export async function createMeeting(s: { title: string; description: string; startsAt: Date; durationMin: number }): Promise<MeetingInfo> {
  if (isGoogleMeetConfigured()) {
    try {
      const token = await googleAccessToken();
      const res = await fetch(`${calendarUrl()}?conferenceDataVersion=1&sendUpdates=none`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: s.title,
          description: s.description,
          start: { dateTime: s.startsAt.toISOString(), timeZone: "Asia/Kolkata" },
          end: { dateTime: sessionEnd(s.startsAt, s.durationMin).toISOString(), timeZone: "Asia/Kolkata" },
          conferenceData: { createRequest: { requestId: randomBytes(12).toString("hex"), conferenceSolutionKey: { type: "hangoutsMeet" } } },
          guestsCanSeeOtherGuests: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json()) as { id?: string; hangoutLink?: string; error?: { message?: string } };
      if (json.id && json.hangoutLink) return { provider: "google", url: json.hangoutLink, googleEventId: json.id };
      throw new Error(json.error?.message ?? `Calendar API ${res.status}`);
    } catch (error) {
      logger.error("meet.google_failed_fallback_jitsi", { error });
    }
  }
  return { provider: "jitsi", url: jitsiLink(s.title) };
}

/** Keeps the Google event in sync when a session's time or title changes. */
export async function updateGoogleEvent(eventId: string, s: { title: string; description: string; startsAt: Date; durationMin: number }) {
  if (!isGoogleMeetConfigured()) return;
  try {
    const token = await googleAccessToken();
    await fetch(`${calendarUrl(`/${encodeURIComponent(eventId)}`)}?sendUpdates=all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: s.title,
        description: s.description,
        start: { dateTime: s.startsAt.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: sessionEnd(s.startsAt, s.durationMin).toISOString(), timeZone: "Asia/Kolkata" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    logger.warn("meet.google_update_failed", { error });
  }
}

/** Adds a confirmed student as a guest so Google sends them a calendar invite. */
export async function addGoogleGuest(eventId: string, email: string) {
  if (!isGoogleMeetConfigured()) return;
  try {
    const token = await googleAccessToken();
    const get = await fetch(calendarUrl(`/${encodeURIComponent(eventId)}`), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    const event = (await get.json()) as { attendees?: { email: string }[] };
    const attendees = event.attendees ?? [];
    if (attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) return;
    await fetch(`${calendarUrl(`/${encodeURIComponent(eventId)}`)}?sendUpdates=all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: [...attendees, { email }] }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.warn("meet.google_add_guest_failed", { error });
  }
}

export async function cancelGoogleEvent(eventId: string) {
  if (!isGoogleMeetConfigured()) return;
  try {
    const token = await googleAccessToken();
    await fetch(`${calendarUrl(`/${encodeURIComponent(eventId)}`)}?sendUpdates=all`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    logger.warn("meet.google_cancel_failed", { error });
  }
}
