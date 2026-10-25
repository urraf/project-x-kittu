import type { Metadata } from "next";
import { isGoogleSignInConfigured } from "@/lib/auth/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, Library, Mail } from "lucide-react";
import { BuyForm } from "@/components/store/BuyForm";
import { ProductCard, ProductCover } from "@/components/store/ProductCard";
import { JsonLd } from "@/components/ui/JsonLd";
import { getStudent } from "@/lib/auth/student";
import { safe } from "@/lib/safe";
import { paymentMode } from "@/lib/services/razorpay";
import { getPublicProductBySlug, listPublishedProducts } from "@/lib/services/store";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await safe("store.meta", async () => getPublicProductBySlug((await params).slug), null);
  if (!p) return { title: "Product not found", robots: { index: false } };
  return {
    title: p.title,
    description: p.summary ? (p.summary.length < 110 ? `${p.summary} Instant download from the Life of KittuKun study store.` : p.summary) : `${p.category} for studying in Japan: ${p.title}. Instant download from the Life of KittuKun study store.`,
    keywords: [p.title, `${p.title} PDF`, p.category, "MEXT research plan template", "study in Japan guide", "scholarship application template"],
    alternates: { canonical: `/store/${p.slug}` },
    openGraph: { title: p.title, description: p.summary, url: absoluteUrl(`/store/${p.slug}`), images: p.coverImage ? [{ url: p.coverImage.url }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await safe("store.detail", () => getPublicProductBySlug(slug), null);
  if (!product) notFound();
  const [student, more] = await Promise.all([safe("store.student", () => getStudent(), null), safe("store.more", () => listPublishedProducts({ limit: 5 }), [])]);
  const related = more.filter((p) => p.id !== product.id).slice(0, 4);
  const steps = [
    { Icon: Mail, text: product.price ? "Pay securely. Your receipt arrives by email." : "Enter your details. No payment needed." },
    { Icon: Library, text: "It's saved in My library in your account, ready to download any time." },
    { Icon: Download, text: product.deliveryType === "link" ? "Open the access link any time from your library." : "Download it instantly, and again whenever you need." },
  ];

  return (
    <>
      <JsonLd data={breadcrumbLd([["Study store", "/store"], [product.title, `/store/${product.slug}`]])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.summary,
          image: product.coverImage?.url ? absoluteUrl(product.coverImage.url) : undefined,
          category: product.category,
          offers: { "@type": "Offer", price: product.price, priceCurrency: "INR", availability: "https://schema.org/InStock", url: absoluteUrl(`/store/${product.slug}`) },
        }}
      />
      <div className="container-x grid grid-cols-1 gap-12 pb-20 pt-28 md:pt-32 lg:grid-cols-12 lg:gap-14">
        <div className="min-w-0 lg:col-span-7">
          <Link href="/store" className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Store
          </Link>
          <ProductCover product={product} sizes="(min-width: 1024px) 44rem, 100vw" priority className="mt-6 aspect-[16/10] rounded-3xl border border-line" />
          <p className="kicker mt-8 text-accent-deep">{product.category}</p>
          <h1 className="display mt-3 text-[2.5rem] leading-[1.02] md:text-[3.4rem]">{product.title}</h1>
          {product.summary && <p className="mt-4 text-lg leading-relaxed text-ink-2 md:text-xl">{product.summary}</p>}

          {product.highlights.length > 0 && (
            <section className="mt-10">
              <h2 className="display text-3xl">What&apos;s <em className="text-accent">inside</em></h2>
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex gap-3 rounded-2xl border border-line bg-[#fffdf9] p-4 text-[0.97rem] text-ink-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" /></span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.description && (
            <section className="mt-10">
              <h2 className="display text-3xl">About this <em className="text-accent">{product.category.toLowerCase()}</em></h2>
              <div className="mt-4 space-y-4 font-[family-name:var(--font-prose)] text-[1.1rem] leading-relaxed text-ink-2">
                {product.description.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </div>
            </section>
          )}

          <section className="mt-10 rounded-3xl border border-line bg-indigo-soft/60 p-6">
            <h2 className="font-medium text-ink">How you get it</h2>
            <ol className="mt-4 space-y-3">
              {steps.map(({ Icon, text }, i) => (
                <li key={i} className="flex gap-3 text-[0.95rem] text-ink-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fffdf9] text-accent ring-1 ring-line"><Icon className="size-4" /></span>
                  <span className="pt-1">{text}</span>
                </li>
              ))}
            </ol>
            {product.deliveryNote && <p className="mt-4 text-xs text-muted">Format: {product.deliveryNote}</p>}
          </section>
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <BuyForm product={product} paymentMode={paymentMode()} student={student ? { name: student.name, email: student.email, phone: student.phone ?? "" } : null} google={isGoogleSignInConfigured()} />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-paper-2 py-16">
          <div className="container-x">
            <h2 className="display text-4xl">You may also <em className="text-accent">like</em></h2>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
