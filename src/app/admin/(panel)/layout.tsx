import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdminPage } from "@/lib/auth/session";
import { countUnreadComments } from "@/lib/services/engagement";
import { countNewMessages } from "@/lib/services/messages";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const [newMessages, newComments] = await Promise.all([countNewMessages().catch(() => 0), countUnreadComments().catch(() => 0)]);
  return (
    <div className="min-h-[100svh] bg-paper">
      <Sidebar newMessages={newMessages} newComments={newComments} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">{children}</main>
      </div>
    </div>
  );
}
