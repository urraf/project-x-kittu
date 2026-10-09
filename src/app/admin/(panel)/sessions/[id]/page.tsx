import { notFound } from "next/navigation";
import { SessionEditor, type SessionTab } from "@/components/admin/SessionEditor";
import { getAdminSession } from "@/lib/services/mentorship";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Session" };
export const dynamic = "force-dynamic";

export default async function EditSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const data = await getAdminSession(id);
  if (!data) notFound();
  // Re-mount when the status changes (e.g. after cancelling) so the form shows the fresh copy.
  const initialTab: SessionTab = tab === "students" ? "students" : "details";
  return <SessionEditor key={`${data.session.id}:${data.session.status}`} session={data.session} bookings={data.bookings} siteUrl={SITE_URL} initialTab={initialTab} />;
}
