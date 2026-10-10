import type { Metadata } from "next";
import Link from "next/link";
import { Download, Infinity as InfinityIcon, ShieldCheck, Zap } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { safe } from "@/lib/safe";
import { listPublishedProducts, productCategories } from "@/lib/services/store";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store",
  description: "Guides, templates and resource packs for studying and working in Japan. Instant download.",
  alternates: { canonical: "/store" },
  openGraph: { title: "Study store", url: absoluteUrl("/store") },
};

export default async function StorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [products, categories] = await Promise.all([
    safe("store.list", () => listPublishedProducts({ category: category || undefined }), []),
    safe("store.categories", () => productCategories(), []),
  ]);

  return (
    <>
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2">
        <div aria-hidden className="absolute -right-12 -top-10 size-40 rounded-full bg-sakura md:-right-20 md:-top-24 md:size-[26rem]" />
        <div className="container-x relative pb-12 pt-28 md:pb-16 md:pt-32">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">教材</span> Study store</p>
          <h1 className="display mt-5 max-w-3xl text-[2.8rem] leading-[0.98] sm:text-6xl lg:text-[4.4rem]">
            Your digital <em className="text-accent">Japan library.</em>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">Guides, templates and resource packs made from real applications. Download instantly and keep them forever.</p>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-2"><Zap className="size-4 text-gold" /> Instant download</li>
            <li className="flex items-center gap-2"><InfinityIcon className="size-4 text-indigo" /> Lifetime access in your library</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-moss" /> Secure payment</li>
          </ul>
        </div>
      </section>

      <section id="products" className="scroll-mt-24 py-14 md:py-20">
        <div className="container-x">
          {categories.length > 1 && (
            <nav aria-label="Categories" className="no-scrollbar -mx-1 mb-10 flex gap-2 overflow-x-auto px-1">
              <Link href="/store#products" className="chip shrink-0" data-active={!category}>All</Link>
              {categories.map((c) => (
                <Link key={c.name} href={`/store?category=${encodeURIComponent(c.name)}#products`} className="chip shrink-0" data-active={category === c.name}>
                  {c.name} <span className="font-mono text-[0.68rem] opacity-60">{c.count}</span>
                </Link>
              ))}
            </nav>
          )}
          {products.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <EmptyState title={category ? "Nothing in this category yet" : "The store opens soon"} description={category ? "Try another category." : "Guides and templates are being prepared. Check back soon, or book a live session meanwhile."} />
          )}
          <p className="mt-14 flex items-center justify-center gap-2 text-center text-sm text-muted"><Download className="size-4" /> Bought something? Find it any time in <Link href="/account?tab=library" className="underline underline-offset-4">My library</Link>.</p>
        </div>
      </section>
    </>
  );
}
