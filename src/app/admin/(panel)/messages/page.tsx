import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { adminNotifyEmail } from "@/lib/services/mentorship";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  // Replies open in this Gmail account (the inbox that receives the site's notifications).
  const mailbox = await adminNotifyEmail().catch(() => null);
  return <MessagesInbox mailbox={mailbox ?? undefined} />;
}
