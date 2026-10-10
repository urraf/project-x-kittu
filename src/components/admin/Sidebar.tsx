"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, CalendarDays, Quote, ExternalLink, GraduationCap, Landmark, Package, Search, Star, Images, Wallet, LayoutDashboard, LogOut, Mail, Menu, MessageCircle, Milestone, Settings, Sparkles, Video, X } from "lucide-react";
import { SunMark } from "@/components/site/Logo";
import { api } from "@/lib/admin/api";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard; exact?: boolean; badge?: "comments" | "messages" };

const GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true }] },
  {
    title: "Platform",
    items: [
      { href: "/admin/sessions", label: "Sessions", Icon: CalendarDays },
      { href: "/admin/products", label: "Store products", Icon: Package },
      { href: "/admin/payments", label: "Payments", Icon: Wallet },
      { href: "/admin/students", label: "Students", Icon: GraduationCap },
      { href: "/admin/opportunities", label: "Opportunities", Icon: Search },
      { href: "/admin/universities", label: "Universities", Icon: Landmark },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/posts", label: "Blog posts", Icon: BookOpenText },
      { href: "/admin/ai", label: "AI writer", Icon: Sparkles },
      { href: "/admin/videos", label: "Videos", Icon: Video },
      { href: "/admin/media", label: "Media library", Icon: Images },
      { href: "/admin/journey", label: "Timeline (About)", Icon: Milestone },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/messages", label: "Messages", Icon: Mail, badge: "messages" },
      { href: "/admin/comments", label: "Comments", Icon: MessageCircle, badge: "comments" },
      { href: "/admin/reviews", label: "Reviews", Icon: Star },
      { href: "/admin/testimonials", label: "Testimonials", Icon: Quote },
    ],
  },
  { items: [{ href: "/admin/settings", label: "Settings", Icon: Settings }] },
];

export function Sidebar({ newMessages, newComments }: { newMessages: number; newComments: number }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api("/api/admin/auth/logout", { method: "POST" });
    } finally {
      // Full reload on purpose: clears all client state after sign-out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/admin/login");
    }
  };

  const nav = (
    // Scrolls on its own so every link (and Sign out below) stays reachable on short screens.
    <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" aria-label="Admin">
      {GROUPS.map((group, gi) => (
        <div key={group.title ?? gi} className={cn(gi > 0 && "mt-4")}>
          {group.title && <p className="px-3 pb-1.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted">{group.title}</p>}
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, Icon, exact, badge }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const count = badge === "messages" ? newMessages : badge === "comments" ? newComments : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-[0.88rem] transition-colors",
                    active ? "bg-[#fffdf9] font-medium text-ink shadow-[0_1px_0_rgba(29,43,69,0.04)] ring-1 ring-line" : "text-ink-2 hover:bg-[#fffdf9]/70 hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-[1.05rem] shrink-0", active ? "text-accent" : "text-muted")} />
                  {label}
                  {count > 0 && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-medium text-white">{count}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="shrink-0 space-y-0.5 border-t border-line p-3">
      <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[0.88rem] text-ink-2 hover:bg-[#fffdf9]/70 hover:text-ink">
        <ExternalLink className="size-[1.05rem]" /> View website
      </a>
      <button type="button" onClick={signOut} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[0.88rem] text-ink-2 hover:bg-[#fffdf9]/70 hover:text-accent-deep">
        <LogOut className="size-[1.05rem]" /> {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex shrink-0 items-center gap-2.5 px-6 py-5">
      <SunMark className="size-7" />
      <span className="flex flex-col leading-none">
        <span className="kicker !text-[0.55rem] !tracking-[0.3em] text-muted">KittuKun</span>
        <span className="display text-xl italic text-ink">Studio</span>
      </span>
    </Link>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-[100dvh] w-64 flex-col border-r border-line bg-paper-2 lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <SunMark className="size-6" />
          <span className="display text-lg italic">Studio</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-full">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex h-[100dvh] w-72 max-w-[85vw] flex-col border-r border-line bg-paper-2 shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-full text-ink hover:bg-[#fffdf9]">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
