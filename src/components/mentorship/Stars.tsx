import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Read-only star rating (supports halves visually by rounding). */
export function Stars({ value, size = "sm", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  const cls = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} className={cn("relative inline-block", cls)}>
            <Star className={cn("absolute inset-0 text-[#e0a43a]/35", cls)} aria-hidden />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn("fill-[#e0a43a] text-[#e0a43a]", cls)} aria-hidden />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
