import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { SocialLinks } from "@/components/site/Footer";
import { getSettings } from "@/lib/services/settings";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Collaborate",
  description: "Brand partnerships, university collaborations, talks and workshops with Life of KittuKun, a channel for students chasing global opportunities.",
  alternates: { canonical: "/collaborate" },
  openGraph: { title: "Work with Life of KittuKun", url: absoluteUrl("/collaborate") },
};

const OFFERS = [
  { title: "Universities & programmes", text: "Explain your scholarship or internship to the exact students you want: ambitious, research-curious undergraduates in India." },
  { title: "Brand partnerships", text: "Thoughtful integrations for products students genuinely use: study tools, travel, language learning, finance." },
  { title: "Talks & workshops", text: "Sessions for colleges and communities on research internships, cold-emailing professors and writing strong applications." },
];

export default async function CollaboratePage() {
  const settings = await getSettings();
  return (
    <section className="pb-28 pt-36 md:pt-44">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="kicker flex items-center gap-3 text-muted" data-reveal>
            <span className="h-px w-8 bg-accent" /> Collaborate
          </p>
          <h1 className="display mt-6 text-[3.4rem] leading-[0.95] md:text-[5.4rem]" data-reveal>
            Let&apos;s make something <em className="text-accent">useful.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2" data-reveal>
            {settings.profile.channelName} reaches students who are actively planning their international future. If you want to help them get there, I&apos;d love to hear from you.
          </p>
          {settings.profile.stats.length > 0 && (
            <dl className="mt-10 flex gap-10 border-t border-line pt-8" data-reveal>
              {settings.profile.stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt className="kicker order-2 mt-2 text-muted">{s.label}</dt>
                  <dd className="display order-1 text-4xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="mt-12 space-y-6" data-reveal>
            {OFFERS.map((o, i) => (
              <li key={o.title} className="grid grid-cols-[2.5rem_1fr]">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <div>
                  <h2 className="font-medium text-ink">{o.title}</h2>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-2">{o.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-12" data-reveal>
            <SocialLinks social={settings.social} className="text-ink" />
            {settings.social.email && <a href={`mailto:${settings.social.email}`} className="link-underline mt-4 inline-block text-ink-2">{settings.social.email}</a>}
          </div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <div className="relative rounded-3xl border border-line bg-[#fffdf9] p-7 md:p-10">
            <h2 className="display text-4xl">Send a message</h2>
            <p className="mt-2 text-ink-2">Questions about applying are welcome too. I can&apos;t answer every one, but I read them all and they shape future videos.</p>
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
