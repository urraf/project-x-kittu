import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import { Countdown } from "@/components/mentorship/Countdown";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime, sessionEnd } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { MentorSessionDTO } from "@/lib/types";

const isTight = (s: MentorSessionDTO) => s.seatsLeft > 0 && s.seatsLeft <= Math.max(3, Math.ceil(s.capacity * 0.3));

function SeatsMeter({ session, dark }: { session: MentorSessionDTO; dark?: boolean }) {
  const full = session.seatsLeft === 0;
  const pct = Math.max(6, Math.round((session.seatsTaken / session.capacity) * 100));
  return (
    <div>
      <div className={cn("flex items-center justify-between text-xs", dark ? "text-cream-muted" : "text-muted")}>
        <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" /> Group of {session.capacity}</span>
        <span className={cn("font-medium", full || isTight(session) ? "text-accent" : "")}>
          {full ? "Fully booked" : isTight(session) ? `Only ${session.seatsLeft} left` : `${session.seatsLeft} seats left`}
        </span>
      </div>
      <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", dark ? "bg-cream/15" : "bg-paper-3")} aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#f08a4b]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SessionCard({ session, tone = "light" }: { session: MentorSessionDTO; tone?: "light" | "dark" }) {
  const full = session.seatsLeft === 0;
  const dark = tone === "dark";
  return (
    <Link
      href={`/sessions/${session.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1",
        dark ? "border-cream/10 bg-night-2 hover:border-accent/60" : "border-line bg-[#fffdf9] hover:border-ink/25 hover:shadow-[0_24px_50px_-35px_rgba(22,18,15,0.5)]",
      )}
    >
      {session.coverImage && (
        <div className="img-zoom relative -mx-6 -mt-6 mb-5 aspect-[16/9] overflow-hidden rounded-t-3xl bg-paper-3">
          <Image src={session.coverImage.url} alt={session.coverImage.alt || ""} fill sizes="(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 100vw" placeholder={session.coverImage.blurDataURL ? "blur" : "empty"} blurDataURL={session.coverImage.blurDataURL} className="object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <span className={cn("text-xs font-medium uppercase tracking-wider", dark ? "text-cream-muted" : "text-muted")}>{formatSessionDate(session.startsAt)}</span>
        <span className={cn("display text-2xl leading-none", dark ? "text-cream" : "text-ink")}>{session.price ? formatPrice(session.price) : "Free"}</span>
      </div>
      <h3 className={cn("display mt-4 text-[1.8rem] leading-[1.05]", dark ? "text-cream" : "text-ink")}>
        <span className="link-underline">{session.title}</span>
      </h3>
      {session.summary && <p className={cn("mt-3 line-clamp-3 text-[0.95rem] leading-relaxed", dark ? "text-cream/70" : "text-ink-2")}>{session.summary}</p>}
      <p className={cn("mt-4 flex items-center gap-2 text-sm", dark ? "text-cream/80" : "text-ink-2")}>
        <Clock className="size-4 text-accent" /> {formatSessionTime(session.startsAt)} – {formatSessionTime(sessionEnd(session.startsAt, session.durationMin))} IST · {formatDuration(session.durationMin)}
      </p>
      <div className="mt-auto pt-6">
        <SeatsMeter session={session} dark={dark} />
        <span
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-colors",
            full ? (dark ? "bg-cream/10 text-cream" : "bg-paper-2 text-ink") : "bg-accent text-white group-hover:bg-accent-deep",
          )}
        >
          {full ? "View details" : "Book your seat"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

/** The very next session, shown big at the top of the Sessions page. */
export function FeaturedSession({ session }: { session: MentorSessionDTO }) {
  const full = session.seatsLeft === 0;
  return (
    <Link href={`/sessions/${session.slug}`} className="seigaiha group relative block overflow-hidden rounded-[2rem] border border-line bg-indigo-soft p-6 text-ink md:p-10">
      <span aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-accent/85 transition-transform duration-700 group-hover:scale-110" />
      <div className="relative z-[2] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fffdf9] px-3 py-1 text-xs font-medium uppercase tracking-wider ring-1 ring-line">
            <span className="relative flex size-2">
              {!full && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />}
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Next live session
          </span>
          <h3 className="display mt-5 max-w-3xl text-[2.3rem] leading-[1] md:text-6xl">{session.title}</h3>
          {session.summary && <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-ink-2">{session.summary}</p>}
          <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-ink-2">
            <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-accent" /> {formatSessionDate(session.startsAt)}</span>
            <span className="inline-flex items-center gap-2"><Clock className="size-4 text-accent" /> {formatSessionTime(session.startsAt)} IST · {formatDuration(session.durationMin)}</span>
          </p>
          <div className="mt-6 max-w-md"><SeatsMeter session={session} /></div>
        </div>
        <div className="flex flex-col gap-5 lg:items-end">
          {session.coverImage && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-paper-3 ring-4 ring-[#fffdf9] lg:w-80">
              <Image src={session.coverImage.url} alt={session.coverImage.alt || ""} fill sizes="(min-width: 1024px) 20rem, 100vw" placeholder={session.coverImage.blurDataURL ? "blur" : "empty"} blurDataURL={session.coverImage.blurDataURL} className="object-cover" />
            </div>
          )}
          {!full && <Countdown to={session.startsAt} />}
          <div className="flex items-center gap-4">
            <span className="display text-5xl leading-none">{session.price ? formatPrice(session.price) : "Free"}</span>
            <span className={cn("btn !px-6 !py-3.5", full ? "bg-paper-2 text-ink" : "btn-accent")}>
              {full ? "View details" : "Book now"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
