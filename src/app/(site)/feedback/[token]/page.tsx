import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackForm } from "@/components/mentorship/AccountForms";
import { safe } from "@/lib/safe";
import { getFeedbackContext } from "@/lib/services/mentorship";
import { formatSessionWhen } from "@/lib/utils/session-time";

export const metadata: Metadata = { title: "Rate your session", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await safe("feedback.context", () => getFeedbackContext(token), null);
  return (
    <section className="container-x max-w-xl pb-24 pt-28 md:pt-32">
      {!ctx ? (
        <div className="rounded-2xl border border-line bg-[#fffdf9] p-6">
          <h1 className="display text-4xl">This link isn&apos;t valid</h1>
          <p className="mt-2 text-ink-2">It may be mistyped. If you attended a session, sign in to your account to leave feedback.</p>
          <Link href="/account" className="btn btn-ink mt-5">My bookings</Link>
        </div>
      ) : !ctx.session.started ? (
        <div className="rounded-2xl border border-line bg-[#fffdf9] p-6">
          <h1 className="display text-4xl">See you at the session!</h1>
          <p className="mt-2 text-ink-2">You can rate “{ctx.session.title}” once it has started ({formatSessionWhen(ctx.session.startsAt, ctx.session.durationMin)}).</p>
        </div>
      ) : (
        <>
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> Feedback</p>
          <h1 className="display mt-4 text-[2.6rem] leading-[1.02]">How was “{ctx.session.title}”?</h1>
          <p className="mt-3 text-ink-2">Thanks for joining, {ctx.name.split(" ")[0]}. It takes 30 seconds.</p>
          <div className="mt-8">
            <FeedbackForm token={token} initial={ctx.review ?? { rating: 0, text: "", name: ctx.name.split(" ")[0] ?? ctx.name }} />
          </div>
        </>
      )}
    </section>
  );
}
