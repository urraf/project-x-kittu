import { AiStudio } from "@/components/admin/AiStudio";
import { env, isGroqConfigured } from "@/lib/env";
import { listRuns } from "@/lib/services/automation";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "AI writer" };
export const dynamic = "force-dynamic";

export default async function AiPage() {
  const [settings, runs] = await Promise.all([getSettings(), listRuns(15)]);
  return (
    <AiStudio
      topics={settings.ai.topics}
      categories={settings.ai.categories}
      automation={settings.automation}
      initialRuns={runs}
      config={{ aiReady: isGroqConfigured(), autoReady: isGroqConfigured() && Boolean(env.cronSecret) }}
    />
  );
}
