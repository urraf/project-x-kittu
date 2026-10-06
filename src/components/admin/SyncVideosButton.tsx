"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { Button } from "@/components/admin/ui";

export function SyncVideosButton({ onDone, variant = "secondary" }: { onDone?: () => void; variant?: "secondary" | "primary" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={variant}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const r = await api<{ fetched: number; added: number; updated: number; source: string }>("/api/admin/videos/sync", { method: "POST" });
          toast.success("Videos synced from YouTube", { description: `${r.added} new · ${r.updated} updated · checked ${r.fetched}` });
          onDone?.();
          router.refresh();
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setLoading(false);
        }
      }}
    >
      {!loading && <RefreshCw className="size-4" />} Sync from YouTube
    </Button>
  );
}
