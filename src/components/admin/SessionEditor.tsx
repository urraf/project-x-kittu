"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarX, Copy, Download, ExternalLink, Mail, Plus, Repeat, Send, SlidersHorizontal, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, api, errorMessage } from "@/lib/admin/api";
import { Button, ConfirmDialog, Dialog, Field, PageHeader, Toggle } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { Stars } from "@/components/mentorship/Stars";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime, toIstInputs } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { AdminMentorSessionDTO, BookingDTO, ImageDTO } from "@/lib/types";

type FormState = {
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  coverImage: ImageDTO | null;
  date: string;
  time: string;
  durationMin: number;
  price: number;
  capacity: number;
  status: "draft" | "published";
  meetingMode: "auto" | "manual";
  meetingUrl: string;
};

const DURATIONS = [30, 45, 60, 90, 120];

function initialForm(s?: AdminMentorSessionDTO): FormState {
  if (!s) {
    const next = new Date(Date.now() + 7 * 86400_000);
    return {
      title: "",
      summary: "",
      description: "",
      highlights: [],
      coverImage: null,
      date: toIstInputs(next).date,
      time: "19:00",
      durationMin: 60,
      price: 0,
      capacity: 10,
      status: "draft",
      meetingMode: "auto",
      meetingUrl: "",
    };
  }
  const { date, time } = toIstInputs(s.startsAt);
  return {
    title: s.title,
    summary: s.summary,
    description: s.description,
    highlights: s.highlights,
    coverImage: s.coverImage ?? null,
    date,
    time,
    durationMin: s.durationMin,
    price: s.price,
    capacity: s.capacity,
    status: s.status === "published" ? "published" : "draft",
    meetingMode: s.meeting.provider === "manual" ? "manual" : "auto",
    meetingUrl: s.meeting.provider === "manual" ? s.meeting.url : "",
  };
}

export type SessionTab = "details" | "students";

export function SessionEditor({
  session,
  bookings = [],
  siteUrl,
  initialTab = "details",
}: {
  session?: AdminMentorSessionDTO;
  bookings?: BookingDTO[];
  siteUrl: string;
  initialTab?: SessionTab;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialForm(session));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [highlight, setHighlight] = useState("");
  const [confirm, setConfirm] = useState<null | "cancel" | "delete" | "feedback">(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<SessionTab>(session ? initialTab : "details");
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const cancelled = session?.status === "cancelled";
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  async function save(status?: FormState["status"]) {
    setSaving(true);
    setErrors({});
    const body = { ...form, status: status ?? form.status };
    try {
      if (session) {
        await api(`/api/admin/sessions/${session.id}`, { method: "PUT", body });
        setForm(body);
        toast.success(body.status === "published" ? "Saved. The session is live on the website." : "Saved as a draft (not visible on the website).");
        router.refresh();
      } else {
        const created = await api<AdminMentorSessionDTO>("/api/admin/sessions", { body });
        toast.success(body.status === "published" ? "Session created and published." : "Session created as a draft.");
        router.replace(`/admin/sessions/${created.id}`);
      }
    } catch (e) {
      if (e instanceof ApiClientError) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: "duplicate" | "cancel" | "send-feedback") {
    if (!session) return;
    setBusy(true);
    try {
      const res = await api<{ id?: string; sent?: number; refunded?: number; refundFailed?: number; notified?: number }>(`/api/admin/sessions/${session.id}/actions`, { body: { action } });
      if (action === "duplicate" && res.id) {
        toast.success("Copied to the same time next week, as a draft.");
        router.push(`/admin/sessions/${res.id}`);
      } else if (action === "cancel") {
        toast.success(`Session cancelled. ${res.notified ?? 0} student(s) emailed${res.refunded ? `, ${res.refunded} refund(s) started` : ""}.`);
        if (res.refundFailed) toast.error(`${res.refundFailed} refund(s) couldn't be started automatically. Please refund them from your Razorpay dashboard.`, { duration: 15000 });
        router.refresh();
      } else {
        toast.success(`Feedback link sent to ${res.sent ?? 0} student(s).`);
        router.refresh();
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!session) return;
    setBusy(true);
    try {
      await api(`/api/admin/sessions/${session.id}`, { method: "DELETE" });
      toast.success("Session deleted.");
      router.replace("/admin/sessions");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
      setConfirm(null);
    }
  }

  function addHighlight() {
    const v = highlight.trim();
    if (!v || form.highlights.length >= 10) return;
    set("highlights", [...form.highlights, v.slice(0, 160)]);
    setHighlight("");
  }

  const publicUrl = session ? `${siteUrl}/sessions/${session.slug}` : "";

  function switchTab(next: SessionTab) {
    setTab(next);
    // Keep the tab in the address bar so a refresh or shared link opens the same tab.
    const url = new URL(window.location.href);
    if (next === "details") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <Link href="/admin/sessions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All sessions
      </Link>
      <PageHeader
        title={session ? session.title : "New session"}
        description={
          session
            ? `${formatSessionDate(session.startsAt)} · ${formatSessionTime(session.startsAt)} IST · ${session.seatsTaken}/${session.capacity} seats booked`
            : "Everyone who books joins the same meeting at this date and time."
        }
        actions={
          session && !cancelled ? (
            <>
              {session.status === "published" && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
                  <ExternalLink className="size-4" /> View page
                </a>
              )}
              <Button onClick={() => runAction("duplicate")} loading={busy && !confirm}>
                {!busy && <Repeat className="size-4" />} Repeat next week
              </Button>
            </>
          ) : undefined
        }
      />

      {cancelled && (
        <div className="mb-6 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-deep">
          This session was cancelled. Students were emailed and paid seats refunded. Use <button type="button" className="underline" onClick={() => runAction("duplicate")}>Repeat next week</button> to schedule it again.
        </div>
      )}

      {session && (
        <div role="tablist" aria-label="Session sections" className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line">
          {(
            [
              { id: "details", label: "Session details", Icon: SlidersHorizontal, count: undefined },
              { id: "students", label: "Students", Icon: Users, count: confirmedCount },
            ] as const
          ).map(({ id, label, Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => switchTab(id)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors",
                tab === id ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              <Icon className="size-4" /> {label}
              {count !== undefined && (
                <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", tab === id ? "bg-ink text-cream" : "bg-paper-3 text-ink-2")}>{count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === "students" && session ? (
        <div role="tabpanel" id="panel-students" aria-labelledby="tab-students">
          <Attendees bookings={bookings} sessionTitle={session.title} />
        </div>
      ) : (
        <div role={session ? "tabpanel" : undefined} id={session ? "panel-details" : undefined} aria-labelledby={session ? "tab-details" : undefined} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <fieldset disabled={cancelled} className="card min-w-0 space-y-5 p-5 md:p-6">
            <Field label="Session title" htmlFor="s-title" error={errors.title} counter={{ value: form.title.length, max: 140 }}>
              <input id="s-title" className="field" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. How to get a fully funded Japan internship" />
            </Field>
            <ImageField label="Cover image (optional)" hint="16:9 works best. Shown on the session card and page." value={form.coverImage} onChange={(v) => set("coverImage", v)} />
          <Field label="Short summary" htmlFor="s-summary" hint="One or two lines shown on the session card." error={errors.summary} counter={{ value: form.summary.length, max: 300 }}>
              <textarea id="s-summary" rows={2} className="field" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
            <Field label="What we'll cover" htmlFor="s-desc" hint="Shown on the session page. Plain text, new lines are kept." error={errors.description}>
              <textarea id="s-desc" rows={6} className="field" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Key takeaways (optional)" hint="Short bullet points, up to 10.">
              <ul className="mb-2 space-y-1.5">
                {form.highlights.map((h, i) => (
                  <li key={`${h}-${i}`} className="flex items-center gap-2 rounded-lg bg-paper-2 px-3 py-2 text-sm">
                    <span className="flex-1">{h}</span>
                    <button type="button" aria-label="Remove" onClick={() => set("highlights", form.highlights.filter((_, j) => j !== i))} className="grid size-6 place-items-center rounded-full hover:bg-paper-3">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  className="field"
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHighlight();
                    }
                  }}
                  placeholder="e.g. A sample application you can copy"
                />
                <Button type="button" onClick={addHighlight} aria-label="Add takeaway"><Plus className="size-4" /></Button>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date" htmlFor="s-date" error={errors.date}>
                <input id="s-date" type="date" className="field" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Start time (India time, IST)" htmlFor="s-time" error={errors.time}>
                <input id="s-time" type="time" className="field" value={form.time} onChange={(e) => set("time", e.target.value)} />
              </Field>
            </div>
            <Field label="Duration" error={errors.durationMin}>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => set("durationMin", d)} className={cn("chip", form.durationMin === d && "!border-ink !bg-ink !text-cream")}>{formatDuration(d)}</button>
                ))}
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  or
                  <input type="number" min={10} max={600} className="field !h-9 !w-24" value={form.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} aria-label="Duration in minutes" />
                  min
                </span>
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Price per student (₹)" htmlFor="s-price" hint="Set 0 for a free session." error={errors.price}>
                <input id="s-price" type="number" min={0} className="field" value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
              </Field>
              <Field label="Seats (max students)" htmlFor="s-cap" hint={session?.seatsTaken ? `${session.seatsTaken} already booked.` : "e.g. 10 for a small group."} error={errors.capacity}>
                <input id="s-cap" type="number" min={1} className="field" value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
              </Field>
            </div>

            <div className="rounded-xl border border-line p-4">
              <Toggle
                checked={form.meetingMode === "manual"}
                onChange={(v) => set("meetingMode", v ? "manual" : "auto")}
                label="Use my own meeting link"
                description="Off: a meeting link is created automatically. On: paste a Zoom / Google Meet link you made."
              />
              {form.meetingMode === "manual" && (
                <Field label="Meeting link" htmlFor="s-url" error={errors.meetingUrl} className="mt-4">
                  <input id="s-url" className="field" value={form.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                </Field>
              )}
              {session?.meeting.url && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                  Current link:{" "}
                  <a href={session.meeting.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent-deep underline-offset-2 hover:underline">{session.meeting.url}</a>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {form.status === "published" ? "Visible on the website and open for booking." : "Draft: only you can see it."}
              </p>
              <div className="flex flex-wrap gap-2">
                {form.status === "published" ? (
                  <>
                    <Button onClick={() => save("draft")} loading={saving}>Unpublish</Button>
                    <Button variant="primary" onClick={() => save("published")} loading={saving}>Save changes</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => save("draft")} loading={saving}>Save draft</Button>
                    <Button variant="accent" onClick={() => save("published")} loading={saving}>Publish</Button>
                  </>
                )}
              </div>
            </div>
          </fieldset>

          {session && (
            <aside className="space-y-4">
              <div className="card p-5">
                <p className="kicker text-muted">At a glance</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted">Booked</dt><dd className="display text-3xl">{confirmedCount}</dd></div>
                  <div><dt className="text-muted">Seats left</dt><dd className="display text-3xl">{session.seatsLeft}</dd></div>
                  <div><dt className="text-muted">Price</dt><dd className="font-medium">{formatPrice(session.price)}</dd></div>
                  <div><dt className="text-muted">Collected</dt><dd className="font-medium">{formatPrice(session.revenue).replace("Free", "₹0")}</dd></div>
                </dl>
                <button type="button" onClick={() => switchTab("students")} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-deep hover:underline">
                  <Users className="size-4" /> See students
                </button>
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
                  <li>Reminder email: {session.reminderSentAt ? "sent" : "sent 1 hour before the start"}</li>
                  <li>Feedback email: {session.feedbackSentAt ? "sent" : "sent automatically when the session ends"}</li>
                </ul>
              </div>
              {!cancelled && (
                <div className="card space-y-2 p-5">
                  <p className="kicker mb-1 text-muted">Actions</p>
                  {session.ended && confirmedCount > 0 && (
                    <Button className="w-full" onClick={() => setConfirm("feedback")}><Send className="size-4" /> Send feedback link again</Button>
                  )}
                  {!session.ended && (
                    <Button variant="danger" className="w-full" onClick={() => setConfirm("cancel")}><CalendarX className="size-4" /> Cancel session</Button>
                  )}
                  <Button variant="ghost" className="w-full" onClick={() => setConfirm("delete")} disabled={confirmedCount > 0} title={confirmedCount > 0 ? "Sessions with bookings can't be deleted. Cancel instead." : undefined}>
                    <Trash2 className="size-4" /> Delete session
                  </Button>
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this session?"
        message={
          <>
            All {confirmedCount} booked student(s) will get a cancellation email{session && session.price > 0 ? " and paid seats will be refunded in full" : ""}. The session is removed from the website. This can&apos;t be undone.
          </>
        }
        confirmLabel="Cancel session"
        loading={busy}
        onConfirm={() => runAction("cancel")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "feedback"}
        title="Send the feedback link again?"
        message="Every booked student gets another email with their personal link to rate the session."
        confirmLabel="Send emails"
        loading={busy}
        onConfirm={() => runAction("send-feedback")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog open={confirm === "delete"} title="Delete this session?" message="It will be removed permanently." loading={busy} onConfirm={remove} onClose={() => setConfirm(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Attendees                                                           */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<BookingDTO["status"], { label: string; cls: string }> = {
  confirmed: { label: "Booked", cls: "bg-[#dde8de] text-moss" },
  pending: { label: "Paying…", cls: "bg-[#f3e6c8] text-[#7a5410]" },
  cancelled: { label: "Cancelled", cls: "bg-paper-3 text-ink-2" },
  expired: { label: "Expired", cls: "bg-paper-3 text-ink-2" },
};

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Attendees({ bookings, sessionTitle }: { bookings: BookingDTO[]; sessionTitle: string }) {
  const router = useRouter();
  const [target, setTarget] = useState<BookingDTO | null>(null);
  const [refund, setRefund] = useState(true);
  const [busy, setBusy] = useState(false);
  const confirmed = bookings.filter((b) => b.status === "confirmed");

  async function cancel() {
    if (!target) return;
    setBusy(true);
    try {
      const wantRefund = refund && target.amount > 0;
      const res = await api<{ refunded: boolean }>(`/api/admin/bookings/${target.id}/cancel`, { body: { refund: wantRefund } });
      if (wantRefund && !res.refunded) toast.error("Booking cancelled, but the refund couldn't be started automatically. Please refund it from your Razorpay dashboard.", { duration: 15000 });
      else toast.success(res.refunded ? "Booking cancelled and refund started." : "Booking cancelled. The seat is free again.");
      setTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function copyEmails() {
    navigator.clipboard.writeText(confirmed.map((b) => b.email).join(", ")).then(
      () => toast.success(`Copied ${confirmed.length} email address(es).`),
      () => toast.error("Couldn't copy. Select the emails manually."),
    );
  }

  function downloadCsv() {
    const rows = [["Name", "Email", "Phone", "Status", "Amount (INR)", "Payment ID", "Demo payment", "Refunded", "Booked on", "Notes", "Rating", "Review"]];
    for (const b of bookings) {
      rows.push([b.name, b.email, b.phone, STATUS_LABEL[b.status].label, String(b.amount), b.paymentId ?? "", b.paymentProvider === "demo" ? "Yes" : "", b.refundedAt ? "Yes" : "", new Date(b.createdAt).toLocaleString("en-IN"), b.notes, b.review ? String(b.review.rating) : "", b.review?.text ?? ""]);
    }
    const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionTitle.replace(/[^\w]+/g, "-").slice(0, 60)}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-2xl">Students</h2>
          <p className="text-sm text-muted">{confirmed.length} booked{bookings.length > confirmed.length ? ` · ${bookings.length - confirmed.length} other` : ""}</p>
        </div>
        {bookings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copyEmails} disabled={!confirmed.length}><Copy className="size-3.5" /> Copy emails</Button>
            <Button size="sm" onClick={downloadCsv}><Download className="size-3.5" /> Download list</Button>
          </div>
        )}
      </div>
      {!bookings.length ? (
        <p className="p-8 text-center text-sm text-muted">No bookings yet. Share the session page to fill the seats.</p>
      ) : (
        <ul className="divide-y divide-line">
          {bookings.map((b) => {
            const st = STATUS_LABEL[b.status];
            return (
              <li key={b.id} className={cn("flex flex-col gap-3 p-5 lg:flex-row lg:items-start", b.status !== "confirmed" && "opacity-70")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{b.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", st.cls)}>{st.label}</span>
                    <span className={cn("text-xs", b.paidAt && !b.refundedAt && b.status !== "confirmed" ? "font-medium text-accent-deep" : "text-muted")}>
                      {b.amount === 0 ? "Free" : b.refundedAt ? `${formatPrice(b.amount)} refunded` : b.paidAt ? (b.status === "confirmed" ? `${formatPrice(b.amount)} paid` : `${formatPrice(b.amount)} paid · not refunded`) : "Not paid"}
                      {b.paymentProvider === "demo" && " (demo)"}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                    <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1 hover:text-accent-deep"><Mail className="size-3.5" /> {b.email}</a>
                    {b.phone && <a href={`tel:${b.phone}`} className="hover:text-accent-deep">{b.phone}</a>}
                  </p>
                  {b.notes && <p className="mt-2 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">&ldquo;{b.notes}&rdquo;</p>}
                  {b.review && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      <Stars value={b.review.rating} className="mt-0.5" />
                      {b.review.text && <span className="text-ink-2">{b.review.text}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted lg:flex-col lg:items-end">
                  <span>Booked {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  {b.status === "confirmed" && (
                    <Button size="sm" variant="ghost" onClick={() => { setRefund(true); setTarget(b); }}>Cancel booking</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={!!target}
        onClose={() => setTarget(null)}
        title="Cancel this booking?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>Keep booking</Button>
            <Button variant="accent" onClick={cancel} loading={busy}>Cancel booking</Button>
          </>
        }
      >
        <p className="text-[0.95rem] text-ink-2">{target?.name}&apos;s seat will be freed so someone else can book it.</p>
        {target && target.amount > 0 && (
          <div className="mt-4">
            <Toggle checked={refund} onChange={setRefund} label={`Refund ${formatPrice(target.amount)}`} description={target.paymentProvider === "demo" ? "Demo payment: nothing real is sent back, it's just marked as refunded." : "The money goes back to the student's original payment method in 5–7 days."} />
          </div>
        )}
      </Dialog>
    </section>
  );
}
