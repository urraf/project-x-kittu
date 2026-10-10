"use client";

import Image from "next/image";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { AdminProductDTO } from "@/lib/services/store";

const rupees = (n: number) => formatPrice(n).replace("Free", "₹0");

export function ProductsManager() {
  const { data, loading } = useApi<AdminProductDTO[]>("/api/admin/products");
  const sales = data?.reduce((n, p) => n + p.salesCount, 0) ?? 0;
  const revenue = data?.reduce((n, p) => n + p.revenue, 0) ?? 0;
  return (
    <>
      <PageHeader
        title="Store products"
        description="Digital products students can buy and download: guides, templates, resource packs. Buyers get them in their library right after paying."
        actions={
          <Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2">
            <PackagePlus className="size-4" /> New product
          </Link>
        }
      />
      {data && data.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Products", value: data.length },
            { label: "Sales", value: sales },
            { label: "Revenue", value: rupees(revenue) },
          ].map((t) => (
            <div key={t.label} className="card p-5">
              <p className="kicker text-muted">{t.label}</p>
              <p className="display mt-2 text-4xl">{t.value}</p>
            </div>
          ))}
        </div>
      )}
      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <AdminEmpty
          title="No products yet"
          description="Add your first product: a cover image, a price and the file buyers will download."
          action={<Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-cream">New product</Link>}
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-paper-2/50 md:p-5">
                <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                  {p.coverImage && <Image src={p.coverImage.url} alt="" fill sizes="80px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", p.status === "published" ? "bg-[#dde8de] text-moss" : "bg-paper-3 text-ink-2")}>{p.status === "published" ? "Live" : "Draft"}</span>
                    <span className="text-xs text-muted">{p.category}</span>
                    {!p.delivery.hasFile && p.delivery.type === "file" && <span className="rounded-full bg-[#f3e6c8] px-2 py-0.5 text-[0.7rem] font-medium text-[#7a5410]">No file yet</span>}
                  </span>
                  <span className="mt-1 block truncate font-medium text-ink">{p.title}</span>
                </span>
                <span className="hidden text-right text-sm sm:block">
                  <span className="block font-medium text-ink">{p.price ? formatPrice(p.price) : "Free"}</span>
                  <span className="block text-xs text-muted">{p.salesCount} sold · {rupees(p.revenue)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
