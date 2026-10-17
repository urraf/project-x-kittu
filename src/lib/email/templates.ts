import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { formatDuration, formatPrice, formatSessionWhen, googleCalendarLink } from "@/lib/utils/session-time";

/**
 * Branded, inline-styled email templates (email clients ignore <style> blocks).
 * Every template returns { subject, html, text }. All user input is escaped.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Session = { title: string; startsAt: Date | string; durationMin: number; price: number; meetingUrl?: string | null };

function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  const button = opts.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:#d9482b">
        <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:13px 26px;font:600 15px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px">${esc(opts.cta.label)}</a>
      </td></tr></table>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f1e9">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e9;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf9;border:1px solid #ded3c3;border-radius:18px;overflow:hidden">
      <tr><td style="background:#1d2b45;padding:22px 28px">
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#d9482b;vertical-align:middle"></span>
        <span style="font:italic 400 20px/1 Georgia,'Times New Roman',serif;color:#fbf7f0;vertical-align:middle;margin-left:8px">${SITE_NAME}</span>
      </td></tr>
      <tr><td style="padding:30px 28px 26px;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:#3b342d">
        <h1 style="margin:0 0 14px;font:400 28px/1.15 Georgia,'Times New Roman',serif;color:#1d2b45">${opts.heading}</h1>
        ${opts.body}
        ${button}
      </td></tr>
      <tr><td style="padding:18px 28px 24px;border-top:1px solid #ded3c3;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#776c60">
        ${opts.footer ?? `Sent by ${SITE_NAME} · <a href="${absoluteUrl("/")}" style="color:#776c60">${absoluteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>`}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function sessionCard(s: Session) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#f6f1e9;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3b342d">
    <div style="font:600 16px/1.3 Helvetica,Arial,sans-serif;color:#16120f">${esc(s.title)}</div>
    <div style="margin-top:6px">🗓 ${esc(formatSessionWhen(s.startsAt, s.durationMin))}</div>
    <div>⏱ ${esc(formatDuration(s.durationMin))} · ${esc(formatPrice(s.price))}</div>
    ${s.meetingUrl ? `<div style="margin-top:6px">🔗 <a href="${esc(s.meetingUrl)}" style="color:#b03a20">${esc(s.meetingUrl)}</a></div>` : ""}
  </td></tr></table>`;
}

const textCard = (s: Session) =>
  `${s.title}\n${formatSessionWhen(s.startsAt, s.durationMin)}\n${formatDuration(s.durationMin)} · ${formatPrice(s.price)}${s.meetingUrl ? `\nJoin: ${s.meetingUrl}` : ""}`;

/**
 * Sent when a seat is confirmed. New accounts also get their login details
 * (email + generated password); existing students just get a login link.
 */
export function bookingConfirmedEmail(p: { name: string; email: string; session: Session; loginUrl: string; newPassword?: string | null }) {
  const cal = googleCalendarLink({ title: p.session.title, startsAt: p.session.startsAt, durationMin: p.session.durationMin, details: `Join: ${p.session.meetingUrl ?? "link in your account"}`, location: p.session.meetingUrl ?? undefined });
  const first = p.name.split(" ")[0] || p.name;
  const join = p.session.meetingUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 4px"><tr><td style="border-radius:999px;background:#16120f">
        <a href="${esc(p.session.meetingUrl)}" style="display:inline-block;padding:11px 22px;font:600 14px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px">Join link (opens at the start time)</a>
      </td></tr></table>`
    : "";
  const account = p.newPassword
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border:1px solid #ded3c3;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3b342d">
        <div style="font:600 15px/1.3 Helvetica,Arial,sans-serif;color:#16120f">Your account is ready</div>
        <div style="margin-top:4px">Log in any time to see your sessions, join links and receipts.</div>
        <div style="margin-top:12px">Email: <strong style="color:#16120f">${esc(p.email)}</strong></div>
        <div>Password: <code style="font:600 15px/1 'Courier New',monospace;background:#f6f1e9;padding:3px 8px;border-radius:6px;color:#16120f">${esc(p.newPassword)}</code></div>
        <div style="margin-top:10px;color:#776c60;font-size:13px">Tip: change it after you log in (My account → Password).</div>
      </td></tr></table>`
    : `<p style="margin:18px 0 0">You can see this booking any time in your account, using your existing password.</p>`;
  return {
    subject: `You're booked: ${p.session.title}`,
    html: layout({
      preheader: `Your seat is confirmed for ${formatSessionWhen(p.session.startsAt, p.session.durationMin)}`,
      heading: `You're in, ${esc(first)}!`,
      body: `<p style="margin:0">Your seat is confirmed. Here are the details:</p>${sessionCard(p.session)}${join}
        <p style="margin:12px 0 0">Join with the link above at the start time. We'll also send a reminder 1 hour before.
        <a href="${esc(cal)}" style="color:#b03a20">Add it to your Google Calendar</a>.</p>${account}`,
      cta: { label: "Log in to my account", url: p.loginUrl },
    }),
    text: [
      `You're in, ${first}!`,
      "",
      "Your seat is confirmed.",
      "",
      textCard(p.session),
      "",
      `Add to calendar: ${cal}`,
      "",
      p.newPassword ? `Your account is ready.\nEmail: ${p.email}\nPassword: ${p.newPassword}\n(Change it after you log in: My account → Password.)` : "You can see this booking in your account, using your existing password.",
      `Log in: ${p.loginUrl}`,
    ].join("\n"),
  };
}

export function adminNewBookingEmail(p: { session: Session; name: string; email: string; phone: string; notes: string; amount: number; seatsLeft: number; adminUrl: string }) {
  return {
    subject: `New booking: ${p.name} for ${p.session.title}`,
    html: layout({
      preheader: `${p.name} booked ${p.session.title}`,
      heading: "New session booking",
      body: `<p style="margin:0"><strong>${esc(p.name)}</strong> booked a seat${p.amount ? ` and paid <strong>${esc(formatPrice(p.amount))}</strong>` : ""}.</p>
        ${sessionCard(p.session)}
        <p style="margin:0">📧 ${esc(p.email)}${p.phone ? `<br>📱 ${esc(p.phone)}` : ""}</p>
        ${p.notes ? `<p style="margin:12px 0 0"><strong>What they want help with:</strong><br>${esc(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
        <p style="margin:12px 0 0;color:#776c60">${p.seatsLeft} seat${p.seatsLeft === 1 ? "" : "s"} left.</p>`,
      cta: { label: "Open in admin", url: p.adminUrl },
    }),
    text: `New booking: ${p.name} (${p.email}${p.phone ? `, ${p.phone}` : ""})\n${textCard(p.session)}\nPaid: ${formatPrice(p.amount)}\nNotes: ${p.notes || "-"}\nSeats left: ${p.seatsLeft}\n${p.adminUrl}`,
  };
}

export function reminderEmail(p: { name: string; session: Session }) {
  return {
    subject: `Starting in 1 hour: ${p.session.title}`,
    html: layout({
      preheader: "Your session starts in about an hour",
      heading: "See you in an hour 👋",
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] ?? p.name)}, your session starts soon. Keep your questions ready!</p>${sessionCard(p.session)}`,
      cta: p.session.meetingUrl ? { label: "Join the session", url: p.session.meetingUrl } : undefined,
    }),
    text: `Hi ${p.name}, your session starts in about an hour.\n\n${textCard(p.session)}`,
  };
}

export function feedbackRequestEmail(p: { name: string; session: Session; feedbackUrl: string }) {
  return {
    subject: `How was "${p.session.title}"?`,
    html: layout({
      preheader: "Takes 30 seconds, and helps other students decide",
      heading: "Thanks for joining!",
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] ?? p.name)}, I hope the session helped. Could you rate it and share a line or two? It takes 30 seconds and helps other students.</p>`,
      cta: { label: "Rate the session ★★★★★", url: p.feedbackUrl },
    }),
    text: `Hi ${p.name}, thanks for joining "${p.session.title}". Please rate it here: ${p.feedbackUrl}`,
  };
}

export function sessionCancelledEmail(p: { name: string; session: Session; paid: boolean }) {
  return {
    subject: `Cancelled: ${p.session.title}`,
    html: layout({
      preheader: "This session has been cancelled",
      heading: "This session has been cancelled",
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] ?? p.name)}, sorry, the session below had to be cancelled.</p>${sessionCard({ ...p.session, meetingUrl: null })}
        ${p.paid ? `<p style="margin:0">You'll receive a full refund to your original payment method. Refunds usually take 5–7 working days.</p>` : ""}`,
      cta: { label: "See other sessions", url: absoluteUrl("/sessions") },
    }),
    text: `Hi ${p.name}, "${p.session.title}" (${formatSessionWhen(p.session.startsAt, p.session.durationMin)}) has been cancelled.${p.paid ? " You'll receive a full refund in 5–7 working days." : ""}`,
  };
}

export function otpEmail(p: { name: string; code: string; purpose: "signup" | "reset"; minutes: number }) {
  const what = p.purpose === "signup" ? "confirm your email and finish creating your account" : "reset your password";
  return {
    subject: `${p.code} is your ${SITE_NAME} code`,
    html: layout({
      preheader: `Your code is ${p.code}. It expires in ${p.minutes} minutes.`,
      heading: p.purpose === "signup" ? "Confirm your email" : "Reset your password",
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] || p.name)}, use this code to ${what}:</p>
        <div style="margin:20px 0;padding:16px;text-align:center;background:#f6f1e9;border-radius:12px;font:700 32px/1 'Courier New',monospace;letter-spacing:10px;color:#16120f">${esc(p.code)}</div>
        <p style="margin:0;color:#776c60">It expires in ${p.minutes} minutes. Didn't ask for this? You can safely ignore this email.</p>`,
    }),
    text: `Your ${SITE_NAME} code is ${p.code}. Use it to ${what}. It expires in ${p.minutes} minutes.\nDidn't ask for this? Ignore this email.`,
  };
}

export function orderConfirmedEmail(p: { name: string; email: string; product: { title: string; price: number }; libraryUrl: string; loginUrl: string; newPassword?: string | null }) {
  const first = p.name.split(" ")[0] || p.name;
  const account = p.newPassword
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border:1px solid #ded3c3;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3b342d">
        <div style="font:600 15px/1.3 Helvetica,Arial,sans-serif;color:#16120f">Your account is ready</div>
        <div style="margin-top:4px">Your purchase is saved in your library. Log in to download it any time.</div>
        <div style="margin-top:12px">Email: <strong style="color:#16120f">${esc(p.email)}</strong></div>
        <div>Password: <code style="font:600 15px/1 'Courier New',monospace;background:#f6f1e9;padding:3px 8px;border-radius:6px;color:#16120f">${esc(p.newPassword)}</code></div>
        <div style="margin-top:10px;color:#776c60;font-size:13px">Tip: change it after you log in (My account → Profile &amp; security).</div>
      </td></tr></table>`
    : `<p style="margin:18px 0 0">It's saved in <strong>My library</strong> in your account. Log in with your existing password to download it any time.</p>`;
  return {
    subject: `Your download is ready: ${p.product.title}`,
    html: layout({
      preheader: `Thanks for your purchase, ${first}. Your download is ready.`,
      heading: `Thank you, ${esc(first)}!`,
      body: `<p style="margin:0">Your purchase is complete:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:#f6f1e9;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3b342d">
          <div style="font:600 16px/1.3 Helvetica,Arial,sans-serif;color:#16120f">${esc(p.product.title)}</div>
          <div style="margin-top:4px">${esc(formatPrice(p.product.price))}</div>
        </td></tr></table>${account}`,
      cta: { label: "Open my library", url: p.newPassword ? p.loginUrl : p.libraryUrl },
    }),
    text: [
      `Thank you, ${first}!`,
      "",
      `Your purchase is complete: ${p.product.title} (${formatPrice(p.product.price)}).`,
      "",
      p.newPassword ? `Your account is ready.\nEmail: ${p.email}\nPassword: ${p.newPassword}\n(Change it after you log in.)` : "It's saved in My library. Log in with your existing password to download it.",
      `Open your library: ${p.newPassword ? p.loginUrl : p.libraryUrl}`,
    ].join("\n"),
  };
}

export function adminNewOrderEmail(p: { name: string; email: string; phone: string; product: string; amount: number; adminUrl: string }) {
  return {
    subject: `New store order: ${p.product}`,
    html: layout({
      preheader: `${p.name} bought ${p.product}`,
      heading: "New store order",
      body: `<p style="margin:0"><strong>${esc(p.name)}</strong> ${p.amount ? `bought <strong>${esc(p.product)}</strong> for <strong>${esc(formatPrice(p.amount))}</strong>` : `got <strong>${esc(p.product)}</strong> (free)`}.</p>
        <p style="margin:12px 0 0">📧 ${esc(p.email)}${p.phone ? `<br>📱 ${esc(p.phone)}` : ""}</p>`,
      cta: { label: "Open payments", url: p.adminUrl },
    }),
    text: `${p.name} (${p.email}${p.phone ? `, ${p.phone}` : ""}) ${p.amount ? `bought ${p.product} for ${formatPrice(p.amount)}` : `got ${p.product} (free)`}.\n${p.adminUrl}`,
  };
}

export const MESSAGE_TOPICS: Record<string, string> = {
  question: "Question about applying",
  session: "Sessions & bookings",
  payment: "Payments & downloads",
  account: "My account",
  feedback: "Feedback",
  collaboration: "Collaboration",
  speaking: "Talk / workshop",
  other: "Something else",
};

export function adminNewMessageEmail(p: { name: string; email: string; topic: string; message: string; adminUrl: string }) {
  const topic = MESSAGE_TOPICS[p.topic] ?? p.topic;
  return {
    subject: `New message: ${topic} from ${p.name}`,
    html: layout({
      preheader: p.message.slice(0, 90),
      heading: "New message from the website",
      body: `<p style="margin:0 0 6px"><strong>${esc(p.name)}</strong> &lt;${esc(p.email)}&gt;</p>
        <p style="margin:0 0 14px;color:#776c60">${esc(topic)}</p>
        <div style="background:#f6f1e9;border-radius:12px;padding:14px 16px;white-space:pre-wrap">${esc(p.message)}</div>
        <p style="margin:14px 0 0;color:#776c60">Reply to this email to answer ${esc(p.name.split(" ")[0] ?? p.name)} directly.</p>`,
      cta: { label: "Open messages", url: p.adminUrl },
    }),
    text: `New message (${topic}) from ${p.name} <${p.email}>:\n\n${p.message}\n\nOpen: ${p.adminUrl}`,
  };
}

/** Admin-initiated request for general feedback about the platform. */
export function feedbackInviteEmail(p: { name: string; feedbackUrl: string; note?: string }) {
  const first = esc(p.name.split(" ")[0] ?? p.name);
  return {
    subject: `${p.name.split(" ")[0] ?? p.name}, how is your experience with ${SITE_NAME}?`,
    html: layout({
      preheader: "Two minutes of your feedback helps us improve for every student",
      heading: "We'd love your feedback",
      body: `<p style="margin:0">Hi ${first}, thank you for learning with us.${p.note ? ` ${esc(p.note)}` : ""} Could you tell us what's working and what we could do better? Every message is read personally.</p>`,
      cta: { label: "Share feedback", url: p.feedbackUrl },
    }),
    text: `Hi ${p.name}, we'd love your feedback on ${SITE_NAME}.${p.note ? ` ${p.note}` : ""} Share it here: ${p.feedbackUrl}`,
  };
}
