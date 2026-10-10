"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { DeadlineChip } from "@/components/opportunities/OpportunityCard";
import { fundingLabel, typeLabel } from "@/lib/opportunities/constants";
import { cn } from "@/lib/utils/cn";
import type { OpportunityDTO } from "@/lib/services/opportunities";

type Data = { items: OpportunityDTO[]; total: number; page: number; pages: number };

export function OpportunitiesManager() {
  const [view, setView] = useState<"all" | "live" | "closed" | "draft">("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, loading } = useApi<Data>(`/api/admin/opportunities?${new URLSearchParams({ view, page: String(page), ...(q ? { q } : {}) })}`);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Internships, scholarships, fellowships and programs shown in the Opportunity finder. Closed ones hide from the site automatically after their deadline."
        actions={
          <Link href="/admin/opportunities/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2">
            <Plus className="size-4" /> Add opportunity
          </Link>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, organisation or country" className="field !pl-10" aria-label="Search" />
        </label>
        <div className="inline-flex rounded-full border border-line bg-[#fffdf9] p-1 text-sm">
          {(["all", "live", "closed", "draft"] as const).map((v) => (
            <button key={v} type="button" onClick={() => (setView(v), setPage(1))} className={cn("rounded-full px-3.5 py-1.5 capitalize", view === v ? "bg-ink text-cream" : "text-ink-2")}>{v}</button>
          ))}
        </div>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty
          title={q || view !== "all" ? "Nothing matches" : "No opportunities yet"}
          description={q || view !== "all" ? "Try another search or view." : "Add your first one. Tip: paste an announcement and let the AI fill in the form."}
          action={<Link href="/admin/opportunities/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-cream">Add opportunity</Link>}
        />
      ) : (
        <>
          <ul className="card divide-y divide-line overflow-hidden">
            {data.items.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/opportunities/${o.id}`} className="flex flex-col gap-2 p-4 hover:bg-paper-2/50 md:flex-row md:items-center md:gap-4 md:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", o.status === "published" ? "bg-[#dde8de] text-moss" : "bg-paper-3 text-ink-2")}>{o.status === "published" ? "Live" : "Draft"}</span>
                      <span className="text-xs text-muted">{typeLabel(o.type)} · {fundingLabel(o.funding)} · {o.country}</span>
                    </div>
                    <p className="mt-1 truncate font-medium text-ink">{o.title}</p>
                    {o.organization && <p className="truncate text-sm text-ink-2">{o.organization}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{o.views} views</span>
                    <DeadlineChip o={o} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{data.total} total</span>
            {data.pages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span>Page {data.page} of {data.pages}</span>
                <Button size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
