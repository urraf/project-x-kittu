import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio · Life of KittuKun" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!rounded-xl !border !border-line !bg-[#fffdf9] !text-ink !shadow-xl !font-sans",
            description: "!text-ink-2",
            error: "!border-accent/40",
          },
        }}
      />
    </>
  );
}
