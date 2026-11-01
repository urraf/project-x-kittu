import { WhatsAppIcon } from "@/components/ui/icons";
import { whatsappLink } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";

const GREEN = "bg-[#25D366] text-white hover:bg-[#1ebe5b]";

/**
 * "Ask on WhatsApp" in three looks: a full button, a soft card with a line of
 * context, or a small text link. Renders nothing when no WhatsApp number is set.
 */
export function WhatsAppButton({
  number,
  message,
  label = "Ask on WhatsApp",
  hint,
  variant = "button",
  className,
}: {
  number?: string;
  message?: string;
  label?: string;
  /** Line under the title (card variant). */
  hint?: string;
  variant?: "button" | "card" | "link";
  className?: string;
}) {
  const href = number ? whatsappLink(number, message) : null;
  if (!href) return null;
  const common = { href, target: "_blank", rel: "noopener noreferrer" } as const;
  if (variant === "link")
    return (
      <a {...common} className={cn("inline-flex items-center gap-1.5 font-medium text-[#128C4A] hover:underline", className)}>
        <WhatsAppIcon className="size-4" /> {label}
      </a>
    );
  if (variant === "card")
    return (
      <a {...common} className={cn("group flex items-center gap-3 rounded-2xl border border-[#25D366]/40 bg-[#effaf2] p-4 transition-colors hover:border-[#25D366]", className)}>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", GREEN)}><WhatsAppIcon className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{label}</span>
          {hint && <span className="block text-sm text-ink-2">{hint}</span>}
        </span>
        <span aria-hidden className="text-[#128C4A] transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    );
  return (
    <a {...common} className={cn("btn !gap-2", GREEN, className)}>
      <WhatsAppIcon className="size-[1.1rem]" /> {label}
    </a>
  );
}
