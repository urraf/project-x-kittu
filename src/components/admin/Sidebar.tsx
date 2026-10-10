"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, CalendarDays, Quote, ExternalLink, GraduationCap, Landmark, Package, Search, Star, Images, Wallet, LayoutDashboard, LogOut, Mail, Menu, MessageCircle, Milestone, Settings, Sparkles, Video, X } from "lucide-react";
import { SunMark } from "@/components/site/Logo";
import { api } from "@/lib/admin/api";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/opportunities", label: "Opportunities", Icon: Search },
  { href: "/admin/universities", label: "Universities", Icon: Landmark },
  { href: "/admin/sessions", label: "Sessions", Icon: CalendarDays },
  { href: "/admin/products", label: "Store products", Icon: Package },
  { href: "/admin/payments", label: "Payments", Icon: Wallet },
  { href: "/admin/students", label: "Students", Icon: GraduationCap },
  { href: "/admin/posts", label: "Blog posts", Icon: BookOpenText },
  { href: "/admin/comments", label: "Comments", Icon: MessageCircle, badge: "comments" as const },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/testimonials", label: "Testimonials", Icon: Quote },
  { href: "/admin/ai", label: "AI writer", Icon: Sparkles },
  { href: "/admin/media", label: "Media library", Icon: Images },
  { href: "/admin/videos", label: "Videos", Icon: Video },
  { href: "/admin/journey", label: "Timeline (About)", Icon: Milestone },
  { href: "/admin/messages", label: "Messages", Icon: Mail, badge: "messages" as const },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
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
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Admin">
      {NAV.map(({ href, label, Icon, exact, badge }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] transition-colors",
              active ? "bg-cream/10 text-cream" : "text-cream-muted hover:bg-cream/5 hover:text-cream",
            )}
          >
            <Icon className={cn("size-[1.05rem]", active && "text-accent")} />
            {label}
            {badge && (badge === "messages" ? newMessages : newComments) > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-medium text-white">{badge === "messages" ? newMessages : newComments}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-cream/10 p-3">
      <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] text-cream-muted hover:bg-cream/5 hover:text-cream">
        <ExternalLink className="size-[1.05rem]" /> View website
      </a>
      <button type="button" onClick={signOut} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] text-cream-muted hover:bg-cream/5 hover:text-cream">
        <LogOut className="size-[1.05rem]" /> {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-6 py-6">
      <SunMark className="size-7" />
      <span className="flex flex-col leading-none">
        <span className="kicker !text-[0.55rem] !tracking-[0.3em] text-cream-muted">KittuKun</span>
        <span className="display text-xl italic text-cream">Studio</span>
      </span>
    </Link>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-night lg:flex">
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
          <div className="absolute inset-0 bg-night/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-night">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-full text-cream">
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
