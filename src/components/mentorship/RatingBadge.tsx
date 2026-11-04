import { Stars } from "@/components/mentorship/Stars";
import { cn } from "@/lib/utils/cn";
import type { RatingDTO } from "@/lib/services/store";

/** Stars, the average and the review count in one line, e.g. ★★★★☆ 4.2 (12). */
export function RatingBadge({ rating, className }: { rating: RatingDTO; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-ink-2", className)} title={`${rating.avg.toFixed(1)} out of 5 from ${rating.count} review${rating.count === 1 ? "" : "s"}`}>
      <Stars value={rating.avg} size="xs" />
      <strong className="font-semibold text-ink">{rating.avg.toFixed(1)}</strong>
      <span className="text-muted">({rating.count})</span>
    </span>
  );
}
