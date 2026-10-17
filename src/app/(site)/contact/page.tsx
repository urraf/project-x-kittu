import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, CreditCard, Mail, MessageCircleQuestion } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import { ContactForm, STUDENT_TOPICS } from "@/components/site/ContactForm";
import { SocialLinks } from "@/components/site/Footer";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about sessions, payments, downloads or applying to Japan? Send a message to Life of KittuKun and get a personal reply.",
  alternates: { canonical: "/contact" },
  openGraph: { title: `Contact · ${SITE_NAME}`, url: absoluteUrl("/contact") },
};

const HELP = [
  { Icon: CalendarCheck2, title: "Booked a session?", text: "Your join link is in your email and in your account.", href: "/account", cta: "Open my account" },
  { Icon: CreditCard, title: "Bought study material?", text: "Downloads are in My library, as many times as you need.", href: "/account?tab=library", cta: "Go to my library" },
  { Icon: MessageCircleQuestion, title: "Quick question?", text: "Kittu, the chat assistant (bottom right), answers instantly.", href: "/sessions", cta: "See sessions" },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; email?: string; name?: string }> }) {
  const [settings, sp] = await Promise.all([getSettings(), searchParams]);
  const email = settings.social.email;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ContactPage", name: `Contact ${SITE_NAME}`, url: absoluteUrl("/contact") }} />
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2">
        <div aria-hidden className="absolute -right-12 -top-10 size-40 rounded-full bg-accent/90 md:-right-20 md:-top-24 md:size-[24rem]" />
        <div className="container-x relative grid grid-cols-1 items-end gap-8 pb-10 pt-28 md:pb-12 md:pt-32 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">連絡</span> Contact</p>
            <h1 className="display mt-5 text-[2.8rem] leading-[0.98] sm:text-6xl lg:text-[4.4rem]">
              We&apos;re here <em className="text-accent">to help.</em>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">Questions about a session, a payment, a download or your application? Send a message and you&apos;ll get a personal reply, usually within a day or two.</p>
          </div>
          <div className="relative hidden justify-center lg:col-span-4 lg:flex" aria-hidden>
            <Kittu pose="wave" alt="" sizes="14rem" className="relative z-[1] w-52" />
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-45px_rgba(29,43,69,0.5)] md:p-8">
              <h2 className="display text-3xl">Send a <em className="text-accent">message</em></h2>
              <div className="mt-6">
                <ContactForm
                  topics={STUDENT_TOPICS}
                  defaultTopic={sp.topic}
                  defaultEmail={sp.email?.slice(0, 200)}
                  defaultName={sp.name?.slice(0, 100)}
                  showOrganisation={false}
                  sentText="Thank you! Your message has reached us, and you'll get a reply by email soon."
                />
              </div>
            </div>
          </div>
          <aside className="space-y-4 lg:col-span-5">
            {HELP.map(({ Icon, title, text, href, cta }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line bg-[#fffdf9] p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-deep"><Icon className="size-5" /></span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{text}</p>
                  <Link href={href} className="mt-2 inline-block text-sm font-medium text-accent-deep hover:underline">{cta} →</Link>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-line bg-indigo-soft/50 p-5">
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 font-medium text-ink hover:text-accent-deep">
                  <Mail className="size-4 text-accent" /> {email}
                </a>
              )}
              <p className={email ? "mt-3 text-sm text-ink-2" : "text-sm text-ink-2"}>Follow along for new sessions and opportunities:</p>
              <SocialLinks social={settings.social} className="mt-3 flex-wrap text-ink" />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
