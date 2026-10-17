"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Mail, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { MessageDTO } from "@/lib/types";

const TOPICS: Record<string, string> = { question: "Question", session: "Sessions & bookings", payment: "Payments & downloads", account: "Account", feedback: "Feedback", collaboration: "Collaboration", speaking: "Talk / workshop", other: "Other" };

export function MessagesInbox() {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "archived">("inbox");
  const { data: items, mutate } = useApi<MessageDTO[]>(`/api/admin/messages${tab === "archived" ? "?status=archived" : ""}`);
  const setItems = (fn: (prev: MessageDTO[] | undefined) => MessageDTO[] | null | undefined) => mutate((d) => fn(d) ?? undefined);
  const [open, setOpen] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MessageDTO | null>(null);


  async function setStatus(m: MessageDTO, status: MessageDTO["status"]) {
    try {
      await api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: { status } });
      const leavesView = (tab === "inbox") === (status === "archived");
      setItems((prev) => (leavesView ? prev?.filter((x) => x.id !== m.id) : prev?.map((x) => (x.id === m.id ? { ...x, status } : x))) ?? null);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function toggle(m: MessageDTO) {
    setOpen((o) => (o === m.id ? null : m.id));
    if (m.status === "new") setStatus(m, "read");
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/admin/messages/${toDelete.id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((x) => x.id !== toDelete.id) ?? null);
      toast.success("Message deleted");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader title="Messages" description="Enquiries sent through the Collaborate page." />
      <div className="mb-5 inline-flex rounded-full border border-line bg-[#fffdf9] p-1 text-sm">
        {(["inbox", "archived"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 capitalize", tab === t ? "bg-ink text-cream" : "text-ink-2")}>{t}</button>
        ))}
      </div>
      {!items ? (
        <LoadingBlock />
      ) : !items.length ? (
        <AdminEmpty title={tab === "inbox" ? "Inbox zero" : "Nothing archived"} description={tab === "inbox" ? "New messages from your website will appear here." : undefined} />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => toggle(m)} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-paper-2/60" aria-expanded={open === m.id}>
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", m.status === "new" ? "bg-accent" : "bg-transparent")} aria-label={m.status === "new" ? "Unread" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={cn("text-[0.95rem]", m.status === "new" ? "font-semibold" : "font-medium")}>{m.name}{m.organisation && <span className="font-normal text-muted"> · {m.organisation}</span>}</span>
                    <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-accent-deep">{TOPICS[m.topic] ?? m.topic}</span>
                  {open !== m.id && <span className="mt-1 line-clamp-1 block text-sm text-ink-2">{m.message}</span>}
                </span>
              </button>
              {open === m.id && (
                <div className="px-5 pb-5 pl-11">
                  <p className="whitespace-pre-line rounded-xl bg-paper-2 p-4 text-[0.95rem] leading-relaxed text-ink">{m.message}</p>
                  <p className="mt-2 text-xs text-muted">{m.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Life of KittuKun")}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[0.8rem] font-medium text-cream"><Reply className="size-3.5" /> Reply by email</a>
                    {m.status === "archived" ? (
                      <Button size="sm" onClick={() => setStatus(m, "read")}><ArchiveRestore className="size-3.5" /> Move to inbox</Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(m, "archived")}><Archive className="size-3.5" /> Archive</Button>
                    )}
                    {m.status !== "new" && m.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => setStatus(m, "new")}><Mail className="size-3.5" /> Mark unread</Button>}
                    <Button size="sm" variant="danger" onClick={() => setToDelete(m)}><Trash2 className="size-3.5" /> Delete</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!toDelete} title="Delete message?" message="This message will be permanently deleted." onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
