import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { formatPrice } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { ProductDTO } from "@/lib/services/store";

export const discountPct = (p: Pick<ProductDTO, "price" | "compareAtPrice">) => (p.compareAtPrice && p.compareAtPrice > p.price ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0);

/** Cover image, or a tasteful washi placeholder with the title when there's no image yet. */
export function ProductCover({ product, sizes, className, priority }: { product: Pick<ProductDTO, "title" | "category" | "coverImage">; sizes: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-paper-3", className)}>
      {product.coverImage ? (
        <Image
          src={product.coverImage.url}
          alt={product.coverImage.alt || product.title}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={product.coverImage.blurDataURL ? "blur" : "empty"}
          blurDataURL={product.coverImage.blurDataURL}
          className="object-cover"
        />
      ) : (
        <div className="seigaiha absolute inset-0 flex flex-col justify-between bg-indigo-soft p-5">
          <span className="jp text-3xl text-sakura-deep">教材</span>
          <span className="display line-clamp-3 text-2xl leading-tight text-ink">{product.title}</span>
        </div>
      )}
    </div>
  );
}

export function PriceTag({ price, compareAtPrice, size = "md" }: { price: number; compareAtPrice?: number; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={cn("display leading-none text-ink", size === "lg" ? "text-5xl" : "text-2xl")}>{price ? formatPrice(price) : "Free"}</span>
      {compareAtPrice && compareAtPrice > price && <span className={cn("text-muted line-through", size === "lg" ? "text-lg" : "text-sm")}>{formatPrice(compareAtPrice)}</span>}
    </span>
  );
}

export function ProductCard({ product }: { product: ProductDTO }) {
  const off = discountPct(product);
  return (
    <Link
      href={`/store/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#fffdf9] transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_24px_50px_-35px_rgba(29,43,69,0.55)]"
    >
      <div className="relative p-2.5 pb-0">
        <ProductCover product={product} sizes="(min-width: 1024px) 18rem, (min-width: 640px) 45vw, 100vw" className="img-zoom aspect-[16/10] rounded-xl" />
        {(off > 0 || product.featured) && (
          <span className="absolute right-5 top-5 flex flex-col items-end gap-1.5">
            {off > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-semibold text-white shadow-sm">{off}% off</span>}
            {product.featured && <span className="rounded-full bg-[#fffdf9]/95 px-2 py-0.5 text-[0.7rem] font-medium text-ink ring-1 ring-line">Bestseller</span>}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          {product.category}
          {product.deliveryNote && <Download className="size-3.5 text-accent" aria-label={product.deliveryNote} />}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[1.05rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{product.title}</h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[0.8rem] font-medium text-white transition-colors group-hover:bg-accent-deep">
            {product.price ? "Buy now" : "Get free"} <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
