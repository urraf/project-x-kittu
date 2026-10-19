import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import { FeedbackForm } from "@/components/mentorship/AccountForms";
import { safe } from "@/lib/safe";
import { getFeedbackContext } from "@/lib/services/feedback";
import { formatSessionWhen } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Share your feedback", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Personal, one-time feedback page for a session booking or a study-store purchase. */
export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await safe("feedback.context", () => getFeedbackContext(token), null);
  const first = ctx ? ctx.name.split(" ")[0] || ctx.name : "";
  return (
    <section className="seigaiha relative min-h-[70vh] overflow-hidden bg-paper-2">
      <div aria-hidden className="absolute -right-16 -top-16 size-44 rounded-full bg-accent/90 md:-right-24 md:-top-28 md:size-[22rem]" />
      <div className="container-x relative max-w-xl pb-24 pt-28 md:pt-32">
        {!ctx ? (
          <div className="rounded-3xl border border-line bg-[#fffdf9] p-7">
            <h1 className="display text-4xl">This link isn&apos;t valid</h1>
            <p className="mt-2 text-ink-2">It may be mistyped or incomplete. Please open it again from your email, or sign in to your account.</p>
            <Link href="/account" className="btn btn-ink mt-5">My account</Link>
          </div>
        ) : ctx.given ? (
          <div className="rounded-3xl border border-line bg-[#fffdf9] p-7 text-center" role="status">
            <Kittu pose="cheer" alt="" sizes="8rem" className="mx-auto w-28" />
            <h1 className="display mt-3 text-4xl">Thank you, {first}!</h1>
            <p className="mt-2 text-ink-2">You&apos;ve already shared your feedback for “{ctx.title}”. Each link can be used once.</p>
            <div className="mt-4 flex justify-center gap-0.5" aria-label={`${ctx.given.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("size-6", i <= ctx.given!.rating ? "fill-[#e0a43a] text-[#e0a43a]" : "text-line")} />)}
            </div>
            {ctx.given.text && <p className="mx-auto mt-3 max-w-md text-sm italic text-ink-2">“{ctx.given.text}”</p>}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-moss"><CheckCircle2 className="size-4" /> Feedback received</p>
          </div>
        ) : !ctx.open ? (
          <div className="rounded-3xl border border-line bg-[#fffdf9] p-7">
            <h1 className="display text-4xl">See you at the session!</h1>
            <p className="mt-2 text-ink-2">You can rate “{ctx.title}” once it has started ({formatSessionWhen(ctx.startsAt!, ctx.durationMin!)}). Keep this link: it&apos;s just for you.</p>
          </div>
        ) : (
          <>
            <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">感想</span> Your feedback</p>
            <h1 className="display mt-4 text-[2.6rem] leading-[1.02]">How was <em className="text-accent">“{ctx.title}”</em>?</h1>
            <p className="mt-3 text-ink-2">{ctx.kind === "session" ? `Thanks for joining, ${first}.` : `Thanks for getting it, ${first}.`} It takes 30 seconds.</p>
            <div className="mt-8">
              <FeedbackForm token={token} kind={ctx.kind} defaultName={first} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
