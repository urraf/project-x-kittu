import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { formatDuration, formatPrice, formatSessionWhen, googleCalendarLink } from "@/lib/utils/session-time";

/**
 * Branded, inline-styled email templates (email clients ignore <style> blocks).
 * Every template returns { subject, html, text }. All user input is escaped.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Session = { title: string; startsAt: Date | string; durationMin: number; price: number; meetingUrl?: string | null };

const C = { paper: "#fbf7f0", paper2: "#f4eee3", card: "#fffdf9", line: "#e4dccd", ink: "#1d2b45", ink2: "#3d4862", muted: "#6e7387", accent: "#d9482b", accentDeep: "#b03a20" };
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "'Instrument Serif','Iowan Old Style',Georgia,'Times New Roman',serif";
const JP = "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif";

/** Italic vermilion accent inside a heading, like the website's display titles. */
const em = (s: string) => `<em style="font-style:italic;color:${C.accent}">${s}</em>`;

/** Hanko-style seal (two kanji in a red square) plus a spaced-out label, as on the website. */
function seal(jp: string, label: string) {
  const [a = "", b = ""] = [...jp];
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px"><tr>
    <td style="width:40px;height:40px;border:2px solid ${C.accent};border-radius:9px;text-align:center;vertical-align:middle;font:400 14px/1.05 ${JP};color:${C.accent}">${a}<br>${b}</td>
    <td style="padding-left:12px;font:500 11px/1 ${SANS};letter-spacing:3px;text-transform:uppercase;color:${C.muted}">${esc(label)}</td>
  </tr></table>`;
}

function layout(opts: { preheader: string; heading: string; body: string; seal?: [jp: string, label: string]; cta?: { label: string; url: string }; footer?: string }) {
  const home = absoluteUrl("/");
  const img = (path: string) => absoluteUrl(path);
  const link = (path: string, label: string) => `<a href="${absoluteUrl(path)}" style="color:${C.ink2};text-decoration:none">${label}</a>`;
  const button = opts.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 4px"><tr><td style="border-radius:999px;background:${C.accent}">
        <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:14px 28px;font:600 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px">${esc(opts.cta.label)} &rarr;</a>
      </td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"></head>
  <body style="margin:0;padding:0;background:${C.paper2};-webkit-text-size-adjust:100%">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper2}"><tr><td align="center" style="padding:28px 14px 36px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px">
      <tr><td style="padding:0 6px 18px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td><a href="${home}" style="text-decoration:none"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="vertical-align:middle"><img src="${img("/images/email/sun.png")}" width="34" height="34" alt="" style="display:block;border:0"></td>
            <td style="vertical-align:middle;padding-left:9px;line-height:1">
              <div style="font:500 8px/1 ${SANS};letter-spacing:3px;text-transform:uppercase;color:${C.muted}">Life of</div>
              <div style="font:italic 400 23px/1 ${SERIF};color:${C.ink};margin-top:1px">KittuKun</div>
            </td></tr></table></a></td>
          <td align="right" style="font:400 12px/1 ${JP};color:${C.muted};letter-spacing:2px">日本への道</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.line};border-top:4px solid ${C.accent};border-radius:22px;padding:34px 32px 32px;font:400 15px/1.7 ${SANS};color:${C.ink2}">
        ${opts.seal ? seal(...opts.seal) : ""}
        <h1 style="margin:0 0 16px;font:400 34px/1.08 ${SERIF};color:${C.ink};letter-spacing:-0.3px">${opts.heading}</h1>
        ${opts.body}
        ${button}
      </td></tr>
      <tr><td align="center" style="padding:30px 20px 0;font:400 13px/1.6 ${SANS};color:${C.muted}">
        <img src="${img("/images/email/kittu-wave.png")}" width="86" alt="Kittu waving" style="display:block;margin:0 auto 8px;border:0;width:86px;height:auto">
        <div style="font:400 21px/1.2 ${SERIF};color:${C.ink}">Learn your way to ${em("Japan.")}</div>
        <div style="margin-top:12px">${link("/sessions", "Sessions")} &nbsp;·&nbsp; ${link("/store", "Study store")} &nbsp;·&nbsp; ${link("/universities", "Universities")} &nbsp;·&nbsp; ${link("/blog", "Blog")}</div>
        <div style="margin-top:6px"><a href="https://www.youtube.com/@lifeofkittukun" style="color:${C.accentDeep};text-decoration:none">YouTube</a> &nbsp;·&nbsp; <a href="https://www.instagram.com/chitranshu_rajput_/" style="color:${C.accentDeep};text-decoration:none">Instagram</a></div>
        <div style="margin-top:16px;font-size:12px;color:#8a8e9e">${opts.footer ?? `Sent by ${SITE_NAME} · <a href="${home}" style="color:#8a8e9e">${home.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>`}</div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function sessionCard(s: Session) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:3px 14px 3px 0;font:500 10px/1.9 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted};white-space:nowrap;vertical-align:top">${label}</td><td style="padding:3px 0;font:400 14px/1.6 ${SANS};color:${C.ink2}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:${C.paper2};border-left:3px solid ${C.accent};border-radius:12px"><tr><td style="padding:16px 18px">
    <div style="font:600 16px/1.35 ${SANS};color:${C.ink};margin-bottom:8px">${esc(s.title)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0">
      ${row("When", esc(formatSessionWhen(s.startsAt, s.durationMin)))}
      ${row("Length", `${esc(formatDuration(s.durationMin))} · ${esc(formatPrice(s.price))}`)}
      ${s.meetingUrl ? row("Join", `<a href="${esc(s.meetingUrl)}" style="color:${C.accentDeep};word-break:break-all">${esc(s.meetingUrl)}</a>`) : ""}
    </table>
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
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 4px"><tr><td style="border-radius:999px;background:#1d2b45">
        <a href="${esc(p.session.meetingUrl)}" style="display:inline-block;padding:11px 22px;font:600 14px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px">Join link (opens at the start time)</a>
      </td></tr></table>`
    : "";
  const account = p.newPassword
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border:1px solid #e4dccd;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3d4862">
        <div style="font:600 15px/1.3 Helvetica,Arial,sans-serif;color:#1d2b45">Your account is ready</div>
        <div style="margin-top:4px">Log in any time to see your sessions, join links and receipts.</div>
        <div style="margin-top:12px">Email: <strong style="color:#1d2b45">${esc(p.email)}</strong></div>
        <div>Password: <code style="font:600 15px/1 'Courier New',monospace;background:#f4eee3;padding:3px 8px;border-radius:6px;color:#1d2b45">${esc(p.newPassword)}</code></div>
        <div style="margin-top:10px;color:#6e7387;font-size:13px">Tip: change it after you log in (My account → Password).</div>
      </td></tr></table>`
    : `<p style="margin:18px 0 0">You can see this booking any time in your account, using your existing password.</p>`;
  return {
    subject: `You're booked: ${p.session.title}`,
    html: layout({
      preheader: `Your seat is confirmed for ${formatSessionWhen(p.session.startsAt, p.session.durationMin)}`,
      heading: `You're ${em("in")}, ${esc(first)}!`,
      seal: ["予約", "Booking confirmed"],
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
      heading: `New ${em("booking")}`,
      seal: ["予約", "Sessions"],
      body: `<p style="margin:0"><strong>${esc(p.name)}</strong> booked a seat${p.amount ? ` and paid <strong>${esc(formatPrice(p.amount))}</strong>` : ""}.</p>
        ${sessionCard(p.session)}
        <p style="margin:0">📧 ${esc(p.email)}${p.phone ? `<br>📱 ${esc(p.phone)}` : ""}</p>
        ${p.notes ? `<p style="margin:12px 0 0"><strong>What they want help with:</strong><br>${esc(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
        <p style="margin:12px 0 0;color:#6e7387">${p.seatsLeft} seat${p.seatsLeft === 1 ? "" : "s"} left.</p>`,
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
      heading: `See you in ${em("an hour")}`,
      seal: ["通知", "Starting soon"],
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
      heading: `Thanks for ${em("joining!")}`,
      seal: ["感想", "Your feedback"],
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] ?? p.name)}, I hope the session helped. Could you rate it and share a line or two? It takes 30 seconds and helps other students.</p>`,
      cta: { label: "Rate the session", url: p.feedbackUrl },
    }),
    text: `Hi ${p.name}, thanks for joining "${p.session.title}". Please rate it here: ${p.feedbackUrl}`,
  };
}

export function sessionCancelledEmail(p: { name: string; session: Session; paid: boolean }) {
  return {
    subject: `Cancelled: ${p.session.title}`,
    html: layout({
      preheader: "This session has been cancelled",
      heading: `Session ${em("cancelled")}`,
      seal: ["中止", "Sessions"],
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
      heading: p.purpose === "signup" ? `Confirm your ${em("email")}` : `Reset your ${em("password")}`,
      seal: ["確認", p.purpose === "signup" ? "Verification code" : "Password reset"],
      body: `<p style="margin:0">Hi ${esc(p.name.split(" ")[0] || p.name)}, use this code to ${what}:</p>
        <div style="margin:22px 0;padding:20px 16px;text-align:center;background:#f4eee3;border:1px dashed #e4dccd;border-radius:14px;font:700 34px/1 'SF Mono',Menlo,'Courier New',monospace;letter-spacing:12px;color:#1d2b45">${esc(p.code)}</div>
        <p style="margin:0;color:#6e7387">It expires in ${p.minutes} minutes. Didn't ask for this? You can safely ignore this email.</p>`,
    }),
    text: `Your ${SITE_NAME} code is ${p.code}. Use it to ${what}. It expires in ${p.minutes} minutes.\nDidn't ask for this? Ignore this email.`,
  };
}

export function orderConfirmedEmail(p: { name: string; email: string; product: { title: string; price: number }; libraryUrl: string; loginUrl: string; newPassword?: string | null }) {
  const first = p.name.split(" ")[0] || p.name;
  const account = p.newPassword
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border:1px solid #e4dccd;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3d4862">
        <div style="font:600 15px/1.3 Helvetica,Arial,sans-serif;color:#1d2b45">Your account is ready</div>
        <div style="margin-top:4px">Your purchase is saved in your library. Log in to download it any time.</div>
        <div style="margin-top:12px">Email: <strong style="color:#1d2b45">${esc(p.email)}</strong></div>
        <div>Password: <code style="font:600 15px/1 'Courier New',monospace;background:#f4eee3;padding:3px 8px;border-radius:6px;color:#1d2b45">${esc(p.newPassword)}</code></div>
        <div style="margin-top:10px;color:#6e7387;font-size:13px">Tip: change it after you log in (My account → Profile &amp; security).</div>
      </td></tr></table>`
    : `<p style="margin:18px 0 0">It's saved in <strong>My library</strong> in your account. Log in with your existing password to download it any time.</p>`;
  return {
    subject: `Your download is ready: ${p.product.title}`,
    html: layout({
      preheader: `Thanks for your purchase, ${first}. Your download is ready.`,
      heading: `Thank you, ${em(`${esc(first)}!`)}`,
      seal: ["教材", "Study store"],
      body: `<p style="margin:0">Your purchase is complete:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:#f4eee3;border-radius:12px"><tr><td style="padding:16px 18px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#3d4862">
          <div style="font:600 16px/1.3 Helvetica,Arial,sans-serif;color:#1d2b45">${esc(p.product.title)}</div>
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
      heading: `New store ${em("order")}`,
      seal: ["教材", "Study store"],
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
      heading: `New ${em("message")}`,
      seal: ["連絡", "Contact form"],
      body: `<p style="margin:0 0 6px"><strong>${esc(p.name)}</strong> &lt;${esc(p.email)}&gt;</p>
        <p style="margin:0 0 14px;color:#6e7387">${esc(topic)}</p>
        <div style="background:#f4eee3;border-radius:12px;padding:14px 16px;white-space:pre-wrap">${esc(p.message)}</div>
        <p style="margin:14px 0 0;color:#6e7387">Reply to this email to answer ${esc(p.name.split(" ")[0] ?? p.name)} directly.</p>`,
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
      heading: `We'd love your ${em("feedback")}`,
      seal: ["感想", "Your feedback"],
      body: `<p style="margin:0">Hi ${first}, thank you for learning with us.${p.note ? ` ${esc(p.note)}` : ""} Could you tell us what's working and what we could do better? Every message is read personally.</p>`,
      cta: { label: "Share feedback", url: p.feedbackUrl },
    }),
    text: `Hi ${p.name}, we'd love your feedback on ${SITE_NAME}.${p.note ? ` ${p.note}` : ""} Share it here: ${p.feedbackUrl}`,
  };
}
