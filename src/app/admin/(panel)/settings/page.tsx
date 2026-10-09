import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAccountInfo } from "@/lib/services/admin-account";
import { isEmailConfigured } from "@/lib/services/email";
import { isGoogleMeetConfigured } from "@/lib/services/meet";
import { paymentMode } from "@/lib/services/razorpay";
import { getSettingsStrict } from "@/lib/services/settings";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, settings, account] = await Promise.all([searchParams, getSettingsStrict(), getAccountInfo()]);
  const integrations = { payments: paymentMode(), email: isEmailConfigured(), googleMeet: isGoogleMeetConfigured() };
  return <SettingsForm initial={settings} initialTab={tab} account={account} integrations={integrations} />;
}
