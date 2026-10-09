import { after } from "next/server";
import { SessionsList } from "@/components/admin/SessionsList";
import { IntegrationNotice } from "@/components/admin/IntegrationNotice";
import { isEmailConfigured } from "@/lib/services/email";
import { isGoogleMeetConfigured } from "@/lib/services/meet";
import { paymentMode } from "@/lib/services/razorpay";
import { mentorshipOverview, runDueTasks } from "@/lib/services/mentorship";

export const metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  after(() => runDueTasks().catch(() => {}));
  const overview = await mentorshipOverview();
  return (
    <>
      <IntegrationNotice payments={paymentMode()} email={isEmailConfigured()} googleMeet={isGoogleMeetConfigured()} />
      <SessionsList overview={overview} />
    </>
  );
}
