import { SessionEditor } from "@/components/admin/SessionEditor";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "New session" };

export default function NewSessionPage() {
  return <SessionEditor siteUrl={SITE_URL} />;
}
