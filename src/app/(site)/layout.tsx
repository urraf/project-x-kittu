import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { ChatAssistant } from "@/components/assistant/ChatAssistant";
import { getSettings } from "@/lib/services/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <Header youtube={settings.social.youtube} instagram={settings.social.instagram} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <RevealObserver />
      <ChatAssistant />
    </>
  );
}
