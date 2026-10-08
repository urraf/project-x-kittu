import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAccountInfo } from "@/lib/services/admin-account";
import { getSettingsStrict } from "@/lib/services/settings";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, settings, account] = await Promise.all([searchParams, getSettingsStrict(), getAccountInfo()]);
  return <SettingsForm initial={settings} initialTab={tab} account={account} />;
}
