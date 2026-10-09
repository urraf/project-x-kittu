"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, RotateCcw, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { formatPrice, formatSessionDate } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";

type Payment = {
  id: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  provider: "razorpay" | "demo";
  paymentId?: string;
  orderId?: string;
  paidAt: string;
  refundedAt?: string;
  status: "paid" | "refunded" | "kept";
  session?: { id: string; title: string; startsAt: string };
};
type Totals = { collected: number; payments: number; refunded: number; refunds: number; net: number; thisMonth: number; kept: number; keptCount: number };
type Data = { items: Payment[]; total: number; page: number; pages: number; summary: { real: Totals; demo: Totals } };

const STATUS: Record<Payment["status"], { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-[#dde8de] text-moss" },
  refunded: { label: "Refunded", cls: "bg-paper-3 text-ink-2" },
  kept: { label: "Cancelled, not refunded", cls: "bg-[#f3e6c8] text-[#7a5410]" },
};

const rupees = (n: number) => formatPrice(n).replace("Free", "₹0");
const when = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function PaymentsManager() {
  const [status, setStatus] = useState<"all" | Payment["status"]>("all");
  const [provider, setProvider] = useState<"all" | "razorpay" | "demo">("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ kind: "cancel" | "refund"; p: Payment } | null>(null);
  const [busy, setBusy] = useState(false);

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const url = `/api/admin/payments?${new URLSearchParams({ status, provider, page: String(page), ...(q ? { q } : {}) })}`;
  const { data, loading, reload } = useApi<Data>(url);
  const real = data?.summary.real;
  const demo = data?.summary.demo;

  async function run() {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "cancel") {
        const res = await api<{ refunded: boolean }>(`/api/admin/bookings/${action.p.id}/cancel`, { body: { refund: true } });
        if (res.refunded) toast.success("Booking cancelled and refunded. The seat is free again.");
        else toast.error("Booking cancelled, but the refund couldn't be started. Use “Retry refund”, or refund it from your Razorpay dashboard.", { duration: 12000 });
      } else {
        const res = await api<{ refunded: boolean }>(`/api/admin/bookings/${action.p.id}/refund`, { method: "POST" });
        if (res.refunded) toast.success("Refund started. It reaches the student in 5–7 working days.");
        else toast.error("The refund couldn't be started. Please refund it from your Razorpay dashboard.", { duration: 12000 });
      }
      setAction(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!data?.items.length) return;
    const rows = [["Paid on", "Student", "Email", "Phone", "Session", "Session date", "Amount (INR)", "Method", "Payment ID", "Order ID", "Status", "Refunded on"]];
    for (const p of data.items) {
      rows.push([when(p.paidAt), p.name, p.email, p.phone, p.session?.title ?? "", p.session ? formatSessionDate(p.session.startsAt) : "", String(p.amount), p.provider === "demo" ? "Demo" : "Razorpay", p.paymentId ?? "", p.orderId ?? "", STATUS[p.status].label, p.refundedAt ? when(p.refundedAt) : ""]);
    }
    const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const tiles = real
    ? [
        { label: "Collected (after refunds)", value: rupees(real.net), sub: `${real.payments} payment${real.payments === 1 ? "" : "s"}` },
        { label: "This month", value: rupees(real.thisMonth), sub: "India time, after refunds" },
        { label: "Refunded", value: rupees(real.refunded), sub: `${real.refunds} refund${real.refunds === 1 ? "" : "s"}` },
        { label: "Cancelled, not refunded", value: rupees(real.kept), sub: real.keptCount ? `${real.keptCount} to check` : "All clear", warn: real.keptCount > 0 },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment for your sessions: who paid, for which session, and its status. Refund from here when needed."
        actions={
          <Button onClick={exportCsv} disabled={!data?.items.length}>
            <Download className="size-4" /> Download CSV
          </Button>
        }
      />

      {real && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className={cn("card p-5", t.warn && "border-[#e3c98e] bg-[#fbf3e1]")}>
              <p className="kicker text-muted">{t.label}</p>
              <p className="display mt-2 text-4xl">{t.value}</p>
              <p className="mt-1 text-xs text-muted">{t.sub}</p>
            </div>
          ))}
        </div>
      )}
      {demo && demo.payments > 0 && (
        <p className="mb-6 rounded-xl bg-[#fff4d6] px-4 py-2.5 text-sm text-[#7a5410]">
          Demo payments (no real money): {demo.payments} payment{demo.payments === 1 ? "" : "s"}, {rupees(demo.net)}. They&apos;re not included in the totals above.
        </p>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or payment ID" className="field !pl-10" aria-label="Search payments" />
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full border border-line bg-[#fffdf9] p-1 text-sm">
            {(
              [
                ["all", "All"],
                ["paid", "Paid"],
                ["refunded", "Refunded"],
                ["kept", "Not refunded"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" onClick={() => (setStatus(v), setPage(1))} className={cn("rounded-full px-3.5 py-1.5", status === v ? "bg-ink text-cream" : "text-ink-2")}>
                {l}
              </button>
            ))}
          </div>
          <select value={provider} onChange={(e) => (setProvider(e.target.value as typeof provider), setPage(1))} className="field !h-10 !w-auto !rounded-full !py-0 text-sm" aria-label="Payment method">
            <option value="all">All methods</option>
            <option value="razorpay">Razorpay (real)</option>
            <option value="demo">Demo</option>
          </select>
        </div>
      </div>

      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty
          title={q || status !== "all" || provider !== "all" ? "No payments match" : "No payments yet"}
          description={q || status !== "all" || provider !== "all" ? "Try a different search or filter." : "When students pay for a session, the payment shows up here."}
        />
      ) : (
        <>
          <ul className="card divide-y divide-line overflow-hidden">
            {data.items.map((p) => {
              const st = STATUS[p.status];
              return (
                <li key={p.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{p.name}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", st.cls)}>{st.label}</span>
                      {p.provider === "demo" && <span className="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[0.7rem] font-medium text-[#7a5410]">Demo</span>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-2">
                      {p.email}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {p.session ? (
                        <Link href={`/admin/sessions/${p.session.id}?tab=students`} className="text-ink hover:text-accent-deep hover:underline">
                          {p.session.title}
                        </Link>
                      ) : (
                        <span className="text-muted">Deleted session</span>
                      )}
                      {p.session && <span className="text-muted"> · {formatSessionDate(p.session.startsAt)}</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Paid {when(p.paidAt)}
                      {p.paymentId && <> · <span className="font-mono">{p.paymentId}</span></>}
                      {p.refundedAt && <> · Refunded {when(p.refundedAt)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                    <span className={cn("display text-3xl", p.status === "refunded" && "text-muted line-through")}>{rupees(p.amount)}</span>
                    {p.status === "paid" && (
                      <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "cancel", p })}>
                        <Undo2 className="size-3.5" /> Cancel & refund
                      </Button>
                    )}
                    {p.status === "kept" && (
                      <Button size="sm" onClick={() => setAction({ kind: "refund", p })}>
                        <RotateCcw className="size-3.5" /> Retry refund
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              {data.total} payment{data.total === 1 ? "" : "s"}
            </span>
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

      <ConfirmDialog
        open={action?.kind === "cancel"}
        title="Cancel and refund?"
        message={
          <>
            {action?.p.name}&apos;s seat in <strong>{action?.p.session?.title}</strong> is cancelled and {action ? rupees(action.p.amount) : ""} is refunded
            {action?.p.provider === "demo" ? " (demo: nothing real is sent back)" : " to their original payment method in 5–7 working days"}. The seat becomes free for someone else.
          </>
        }
        confirmLabel="Cancel & refund"
        loading={busy}
        onConfirm={run}
        onClose={() => setAction(null)}
      />
      <ConfirmDialog
        open={action?.kind === "refund"}
        title="Refund this payment?"
        message={<>The booking is already cancelled. {action ? rupees(action.p.amount) : ""} goes back to {action?.p.name}.</>}
        confirmLabel="Refund"
        loading={busy}
        onConfirm={run}
        onClose={() => setAction(null)}
      />
    </>
  );
}
