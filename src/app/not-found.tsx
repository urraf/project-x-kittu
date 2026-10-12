import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const NEXT_UP = [
  { href: "/opportunities", label: "Opportunities", jp: "機会", note: "Internships & scholarships" },
  { href: "/sessions", label: "Live sessions", jp: "講座", note: "Learn with a small group" },
  { href: "/store", label: "Study store", jp: "教材", note: "Guides & templates" },
  { href: "/blog", label: "Blog", jp: "記事", note: "Free step-by-step guides" },
];

/** Light, on-brand 404: Kittu has wandered off the map too. */
export default function NotFound() {
  return (
    <main className="seigaiha relative min-h-[100svh] overflow-hidden bg-paper-2 text-ink">
      <div aria-hidden className="absolute -right-24 -top-24 size-[22rem] rounded-full bg-accent/90 md:size-[30rem]" />
      <div className="container-x relative z-[2] flex min-h-[100svh] flex-col py-6">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#fffdf9]/90 px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </header>

        <div className="grid flex-1 grid-cols-1 items-center gap-10 py-12 md:grid-cols-[1fr_auto]">
          <div>
            <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">迷子</span> Error 404</p>
            <h1 className="display mt-5 text-5xl leading-[1.02] sm:text-7xl">
              Kittu can&apos;t find <em className="text-accent">this page.</em>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-2">The link may be old or mistyped, or the page may have moved. Let&apos;s get you back on route.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="btn btn-accent">Back to home</Link>
              <Link href="/opportunities" className="btn btn-ghost text-ink">Find opportunities</Link>
            </div>
          </div>
          <Kittu pose="ponder" motion="sway" priority sizes="16rem" className="mx-auto w-48 md:w-64" />
        </div>

        <nav aria-label="Up next" className="pb-6">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {NEXT_UP.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-[#fffdf9] p-4 transition-colors hover:border-accent/50">
                  <span aria-hidden className="hanko size-10 shrink-0 -rotate-3 text-[0.8rem]"><span className="[writing-mode:vertical-rl]">{n.jp}</span></span>
                  <span className="min-w-0">
                    <span className="block font-medium text-ink group-hover:text-accent-deep">{n.label}</span>
                    <span className="block truncate text-xs text-muted">{n.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
