"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, DownloadCloud, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import type { UniversityDTO } from "@/lib/services/universities";

type Data = { items: UniversityDTO[]; total: number; page: number; pages: number };
const FILTERS = [
  { id: "", label: "All" },
  { id: "national", label: "National" },
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "To verify" },
] as const;

export function UniversitiesManager() {
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, loading, reload } = useApi<Data>(`/api/admin/universities?${new URLSearchParams({ page: String(page), ...(type ? { type } : {}), ...(q ? { q } : {}) })}`);

  async function importList() {
    setImporting(true);
    try {
      const r = await api<{ added: number; total: number }>("/api/admin/universities/import", { method: "POST" });
      toast.success(r.added ? `Added ${r.added} universities (${r.total} in total).` : "The starter list is already imported.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Universities"
        description="The universities directory. Add verified English-taught programs, official links and scholarships, then mark each one as verified."
        actions={
          <>
            <Button onClick={importList} loading={importing} title="Adds the starter list of 119 universities (skips ones you already have)">
              {!importing && <DownloadCloud className="size-4" />} Import starter list
            </Button>
            <Link href="/admin/universities/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2"><Plus className="size-4" /> Add university</Link>
          </>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or city" className="field !pl-10" aria-label="Search" />
        </label>
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-[#fffdf9] p-1 text-sm">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => (setType(f.id), setPage(1))} className={cn("rounded-full px-3 py-1.5", type === f.id ? "bg-ink text-cream" : "text-ink-2")}>{f.label}</button>
          ))}
        </div>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty
          title={q || type ? "Nothing matches" : "No universities yet"}
          description={q || type ? "Try another search." : "Import the starter list of 119 universities, then add verified program details over time."}
          action={!q && !type ? <Button variant="primary" onClick={importList} loading={importing}>Import starter list</Button> : undefined}
        />
      ) : (
        <>
          <ul className="card divide-y divide-line overflow-hidden">
            {data.items.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/universities/${u.id}`} className="flex items-center gap-4 p-4 hover:bg-paper-2/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-muted">{u.type} · {u.city} · {u.programs.length} program{u.programs.length === 1 ? "" : "s"}</p>
                  </div>
                  {u.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dde8de] px-2.5 py-1 text-xs font-medium text-moss"><BadgeCheck className="size-3.5" /> Verified</span>
                  ) : (
                    <span className="rounded-full bg-[#f3e6c8] px-2.5 py-1 text-xs font-medium text-[#7a5410]">To verify</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{data.total} universities</span>
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
