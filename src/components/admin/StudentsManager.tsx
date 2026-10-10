"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Copy, Download, Mail, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { formatPrice, formatSessionDate } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  lastLoginAt?: string;
  hasPassword: boolean;
  emailVerified: boolean;
  booked: number;
  cancelled: number;
  spent: number;
  demoSpent: number;
  products: number;
  reviews: number;
  lastBookingAt?: string;
};
type Data = { items: StudentRow[]; total: number; page: number; pages: number };
type StudentBooking = {
  id: string;
  kind: "session" | "store";
  product?: { id: string; title: string };
  status: "confirmed" | "cancelled";
  amount: number;
  provider: "razorpay" | "demo" | "free";
  paid: boolean;
  refunded: boolean;
  notes: string;
  createdAt: string;
  session?: { id: string; title: string; startsAt: string };
};

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const rupees = (n: number) => formatPrice(n).replace("Free", "₹0");

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Bookings({ studentId }: { studentId: string }) {
  const { data, loading } = useApi<StudentBooking[]>(`/api/admin/students/${studentId}`);
  if (loading && !data) return <p className="px-5 pb-5 text-sm text-muted">Loading bookings…</p>;
  if (!data?.length) return <p className="px-5 pb-5 text-sm text-muted">No bookings yet. This student signed up but hasn&apos;t booked a session.</p>;
  return (
    <ul className="mx-5 mb-5 divide-y divide-line rounded-xl border border-line bg-paper-2/50">
      {data.map((b) => (
        <li key={b.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            {b.kind === "store" ? (
              b.product ? (
                <Link href={`/admin/products/${b.product.id}`} className="font-medium text-ink hover:text-accent-deep hover:underline">{b.product.title}</Link>
              ) : (
                <span className="text-muted">Deleted product</span>
              )
            ) : b.session ? (
              <Link href={`/admin/sessions/${b.session.id}?tab=students`} className="font-medium text-ink hover:text-accent-deep hover:underline">{b.session.title}</Link>
            ) : (
              <span className="text-muted">Deleted session</span>
            )}
            <p className="text-xs text-muted">
              {b.kind === "store" ? "Store · bought " : b.session ? `${formatSessionDate(b.session.startsAt)} · booked ` : "booked "}{day(b.createdAt)}
              {b.notes ? ` · “${b.notes.slice(0, 80)}${b.notes.length > 80 ? "…" : ""}”` : ""}
            </p>
          </div>
          <span className={cn("w-fit rounded-full px-2 py-0.5 text-[0.7rem] font-medium", b.status === "confirmed" ? "bg-[#dde8de] text-moss" : "bg-paper-3 text-ink-2")}>
            {b.kind === "store" ? (b.status === "confirmed" ? "Owned" : "Cancelled") : b.status === "confirmed" ? "Booked" : "Cancelled"}
          </span>
          <span className="text-xs text-ink-2 sm:w-36 sm:text-right">
            {b.amount === 0 ? "Free" : b.refunded ? `${rupees(b.amount)} refunded` : b.paid ? `${rupees(b.amount)} paid` : "Not paid"}
            {b.provider === "demo" && " (demo)"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StudentsManager() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading } = useApi<Data>(`/api/admin/students?${new URLSearchParams({ page: String(page), ...(q ? { q } : {}) })}`);

  function copyEmails() {
    if (!data?.items.length) return;
    navigator.clipboard.writeText(data.items.map((s) => s.email).join(", ")).then(
      () => toast.success(`Copied ${data.items.length} email address(es).`),
      () => toast.error("Couldn't copy. Select the emails manually."),
    );
  }

  function exportCsv() {
    if (!data?.items.length) return;
    const rows = [["Name", "Email", "Phone", "Joined", "Last login", "Sessions booked", "Cancelled", "Spent (INR)", "Reviews", "Last booking"]];
    for (const s of data.items) rows.push([s.name, s.email, s.phone, day(s.joinedAt), s.lastLoginAt ? day(s.lastLoginAt) : "", String(s.booked), String(s.cancelled), String(s.spent), String(s.reviews), s.lastBookingAt ? day(s.lastBookingAt) : ""]);
    const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone with a student account: created automatically on their first booking, or by signing up. Click a student to see their bookings."
        actions={
          <>
            <Button onClick={copyEmails} disabled={!data?.items.length}><Copy className="size-4" /> Copy emails</Button>
            <Button onClick={exportCsv} disabled={!data?.items.length}><Download className="size-4" /> Download CSV</Button>
          </>
        }
      />

      <label className="relative mb-5 block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" className="field !pl-10" aria-label="Search students" />
      </label>

      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty title={q ? "No students match" : "No students yet"} description={q ? "Try a different search." : "Student accounts appear here after their first booking or sign-up."} />
      ) : (
        <>
          <ul className="card divide-y divide-line overflow-hidden">
            {data.items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                  aria-expanded={open === s.id}
                  className="flex w-full flex-col gap-3 p-5 text-left hover:bg-paper-2/40 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-cream">{s.name.trim().charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        {s.name}
                        {!s.hasPassword && <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[0.65rem] font-normal text-ink-2">No login yet</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-2">
                        <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {s.email}</span>
                        {s.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {s.phone}</span>}
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-4 gap-4 text-sm md:w-[26rem]">
                    <div><dt className="text-xs text-muted">Booked</dt><dd className="font-medium text-ink">{s.booked}{s.products > 0 && <span className="block text-[0.65rem] font-normal text-muted">+{s.products} product{s.products === 1 ? "" : "s"}</span>}</dd></div>
                    <div><dt className="text-xs text-muted">Spent</dt><dd className="font-medium text-ink">{rupees(s.spent)}{s.demoSpent > 0 && <span className="block text-[0.65rem] font-normal text-muted">+{rupees(s.demoSpent)} demo</span>}</dd></div>
                    <div><dt className="text-xs text-muted">Joined</dt><dd className="text-ink">{day(s.joinedAt)}</dd></div>
                    <div className="flex items-start justify-between gap-2">
                      <div><dt className="text-xs text-muted">Last login</dt><dd className="text-ink">{s.lastLoginAt ? day(s.lastLoginAt) : "–"}</dd></div>
                      <ChevronDown className={cn("mt-2 size-4 shrink-0 text-muted transition-transform", open === s.id && "rotate-180")} />
                    </div>
                  </dl>
                </button>
                {open === s.id && <Bookings studentId={s.id} />}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{data.total} student{data.total === 1 ? "" : "s"}</span>
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
