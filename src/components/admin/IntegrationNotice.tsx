import { CheckCircle2, CircleAlert } from "lucide-react";

/** Plain-language status of the services sessions rely on. */
export type PaymentStatus = "razorpay" | "demo" | "off";

export function IntegrationNotice({ payments, email, googleMeet }: { payments: PaymentStatus; email: boolean; googleMeet: boolean }) {
  const items = [
    {
      ok: payments === "razorpay",
      label:
        payments === "razorpay"
          ? "Online payments are on (Razorpay)"
          : payments === "demo"
            ? "Demo payments: students go through a practice checkout. No real money is charged."
            : "Online payments aren't connected yet. Free sessions still work.",
    },
    { ok: email, label: email ? "Booking emails are on" : "Emails aren't connected yet, so students won't get confirmations or reminders." },
    { ok: true, label: googleMeet ? "Meeting links: Google Meet (students get calendar invites)" : "Meeting links: created automatically (Jitsi), or paste your own" },
  ];
  return (
    <ul className="mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-[#fffdf9] p-4 text-sm md:grid-cols-3">
      {items.map((i) => (
        <li key={i.label} className="flex items-start gap-2">
          {i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#c08a1e]" />}
          <span className="text-ink-2">{i.label}</span>
        </li>
      ))}
      {(payments !== "razorpay" || !email) && <li className="text-xs text-muted md:col-span-3">Ask your developer to connect the missing service. It only takes a few minutes.</li>}
    </ul>
  );
}
