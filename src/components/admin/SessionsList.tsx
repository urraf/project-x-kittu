"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Copy, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { AdminMentorSessionDTO } from "@/lib/types";

type Overview = { upcoming: number; bookings: number; revenue: number; avgRating: number; reviewCount: number };

function statusBadge(s: AdminMentorSessionDTO) {
  if (s.status === "cancelled") return { label: "Cancelled", cls: "bg-paper-3 text-ink-2" };
  if (s.status === "draft") return { label: "Draft (hidden)", cls: "bg-paper-3 text-ink-2" };
  if (s.ended) return { label: "Completed", cls: "bg-paper-2 text-ink-2" };
  if (s.started) return { label: "Live now", cls: "bg-accent text-white" };
  if (s.seatsLeft === 0) return { label: "Full", cls: "bg-[#f3e6c8] text-[#7a5410]" };
  return { label: "Open for booking", cls: "bg-[#dde8de] text-moss" };
}

export function SessionsList({ overview }: { overview: Overview }) {
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const { data, loading, reload } = useApi<AdminMentorSessionDTO[]>(`/api/admin/sessions?filter=${filter}`);
  const [busy, setBusy] = useState<string | null>(null);

  async function duplicate(s: AdminMentorSessionDTO) {
    setBusy(s.id);
    try {
      await api(`/api/admin/sessions/${s.id}/actions`, { body: { action: "duplicate" } });
      toast.success("Copied for one week later as a draft. Edit the date and publish it.");
      setFilter("upcoming");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const tiles = [
    { label: "Upcoming sessions", value: overview.upcoming },
    { label: "Seats booked", value: overview.bookings },
    { label: "Revenue", value: formatPrice(overview.revenue).replace("Free", "₹0") },
    { label: "Rating", value: overview.reviewCount ? `${overview.avgRating.toFixed(1)} ★` : "–" },
  ];

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Create live group sessions with a fixed date and time. Students book seats, pay, and everyone joins the same meeting link."
        actions={
          <Link href="/admin/sessions/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2">
            <CalendarPlus className="size-4" /> New session
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="kicker text-muted">{t.label}</p>
            <p className="display mt-2 text-4xl">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-5 inline-flex rounded-full border border-line bg-[#fffdf9] p-1 text-sm">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-4 py-1.5 capitalize", filter === f ? "bg-ink text-cream" : "text-ink-2")}>
            {f}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <AdminEmpty
          title={filter === "past" ? "No past sessions yet" : "No sessions yet"}
          description="Create your first session: pick a date and time, set the price and number of seats."
          action={<Link href="/admin/sessions/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-cream">New session</Link>}
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.map((s) => {
            const badge = statusBadge(s);
            const pct = Math.min(100, Math.round((s.seatsTaken / s.capacity) * 100));
            return (
              <li key={s.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <Link href={`/admin/sessions/${s.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium", badge.cls)}>{badge.label}</span>
                    <span className="text-xs text-muted">{formatPrice(s.price)} · {formatDuration(s.durationMin)}</span>
                  </div>
                  <p className="mt-2 truncate font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{formatSessionDate(s.startsAt)} · {formatSessionTime(s.startsAt)} IST</p>
                </Link>
                <div className="w-full md:w-48">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <Link href={`/admin/sessions/${s.id}?tab=students`} className="inline-flex items-center gap-1 hover:text-ink hover:underline"><Users className="size-3.5" /> {s.confirmedCount} booked</Link>
                    <span>{s.seatsTaken}/{s.capacity} seats</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
                  {s.revenue > 0 && <p className="mt-1 text-xs text-moss">{formatPrice(s.revenue)} collected</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/sessions/${s.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-[#fffdf9] px-3.5 text-[0.8rem] font-medium hover:border-ink/40"><Pencil className="size-3.5" /> Open</Link>
                  <Button size="sm" onClick={() => duplicate(s)} loading={busy === s.id} title="Copy this session to the same time next week">
                    {busy !== s.id && <Copy className="size-3.5" />} Repeat next week
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
