"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Uses the native share sheet where available, otherwise copies the link. */
export function ShareButton({ url, title, className, label = "Share" }: { url: string; title: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };
  return (
    <button type="button" onClick={onClick} className={cn("btn btn-ghost", className)} aria-live="polite">
      {copied ? <Check className="size-4" /> : label === "Share" ? <Share2 className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Link copied" : label}
    </button>
  );
}
