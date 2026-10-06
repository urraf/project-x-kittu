import type { Metadata } from "next";
import { SunMark } from "@/components/site/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-[100svh] lg:grid-cols-2">
      <div className="grain relative hidden overflow-hidden bg-night p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-[2] flex items-center gap-3">
          <SunMark className="size-8" />
          <span className="display text-2xl italic">KittuKun Studio</span>
        </div>
        <div aria-hidden className="absolute -right-48 -top-48 size-[34rem] rounded-full bg-accent/90" />
        <div aria-hidden className="absolute -right-48 top-[6.5rem] h-3 w-[40rem] bg-night" />
        <div aria-hidden className="absolute -right-48 top-[9rem] h-2 w-[40rem] bg-night" />
        <p className="display relative z-[2] max-w-md text-5xl leading-[1.05]">
          Every story you publish helps someone take their <em className="text-accent">first step.</em>
        </p>
      </div>
      <div className="flex items-center justify-center bg-paper px-5 py-16">
        <div className="w-full max-w-sm">
          <SunMark className="size-10 lg:hidden" />
          <h1 className="display mt-6 text-5xl lg:mt-0">Welcome back.</h1>
          <p className="mt-3 text-ink-2">Sign in to manage your blog, videos and journey.</p>
          <div className="mt-10">
            <LoginForm next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}
