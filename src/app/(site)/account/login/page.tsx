import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck2, KeyRound, Star, Video } from "lucide-react";
import { StudentAuth, type AuthMode } from "@/components/mentorship/StudentAuth";
import { getStudent } from "@/lib/auth/student";
import { Kittu } from "@/components/mascot/Kittu";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

const PERKS = [
  { Icon: Video, title: "Join links in one place", text: "Every session you book, with its meeting link ready when it starts." },
  { Icon: CalendarCheck2, title: "Your bookings & receipts", text: "Upcoming and past sessions, and what you paid." },
  { Icon: Star, title: "Rate your sessions", text: "Leave feedback after each session in one click." },
  { Icon: KeyRound, title: "Already booked?", text: "Your account was created with your first booking. The password is in that email." },
];

export default async function StudentLoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { mode, next } = await searchParams;
  if (await getStudent()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  const initialMode: AuthMode = mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : "login";
  return (
    <section className="container-x pb-24 pt-28 md:pt-32">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-16">
        <div className="lg:pt-6">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> Student account</p>
          <h1 className="display mt-4 text-5xl leading-[1.02] md:text-6xl">
            Your sessions, <em className="text-accent">all in one place.</em>
          </h1>
          <ul className="mt-10 hidden space-y-6 lg:block">
            {PERKS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-2 text-accent"><Icon className="size-[1.1rem]" /></span>
                <span>
                  <span className="block font-medium text-ink">{title}</span>
                  <span className="mt-0.5 block text-[0.95rem] text-ink-2">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Kittu peeks over the sign-in card */}
        <div className="relative pt-24">
          <p className="absolute left-2 top-1 z-0 rounded-2xl rounded-br-sm border border-line bg-[#fffdf9] px-3.5 py-2 text-sm text-ink shadow-[0_12px_30px_-20px_rgba(29,43,69,0.5)]">
            <span className="jp mr-1.5 text-accent">おかえり!</span> Good to see you.
          </p>
          <Kittu pose="lie" alt="" priority sizes="10rem" className="pointer-events-none absolute -top-3 right-6 z-20 w-36 drop-shadow-[0_10px_12px_rgba(29,43,69,0.18)]" />
          <div className="relative z-10">
            <StudentAuth initialMode={initialMode} next={next} />
          </div>
        </div>
      </div>
    </section>
  );
}
