import "server-only";
import { safe } from "@/lib/safe";
import { listUpcomingSessions } from "@/lib/services/mentorship";
import { getSettings } from "@/lib/services/settings";
import { listPublishedProducts } from "@/lib/services/store";
import { universityStats } from "@/lib/services/universities";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/utils/session-time";

export type PopupContent = {
  kind: "session" | "product" | "universities" | "custom";
  badge: string;
  title: string;
  text: string;
  ctaLabel: string;
  href: string;
  /** Extra facts shown as chips (date, price, seats…). */
  facts: string[];
  /** Session start (ISO) for the "starts in" countdown. */
  startsAt?: string;
  delaySec: number;
};

/**
 * What the welcome popup shows. "auto" promotes the soonest session with free
 * seats, else a study-store guide, else the university finder; "custom" uses
 * the admin's text from Studio → Settings → Popup. null = no popup.
 */
export async function getPopupContent(): Promise<PopupContent | null> {
  const { popup } = await getSettings();
  if (!popup.enabled) return null;
  const delaySec = popup.delaySec;

  if (popup.mode === "custom") {
    if (!popup.title || !popup.ctaHref) return null;
    return { kind: "custom", badge: popup.badge, title: popup.title, text: popup.text, ctaLabel: popup.ctaLabel || "Take a look", href: popup.ctaHref, facts: [], delaySec };
  }

  const sessions = await safe("popup.sessions", () => listUpcomingSessions(6), []);
  const next = sessions.find((s) => !s.started && s.seatsLeft > 0);
  if (next) {
    const few = next.seatsLeft <= Math.max(3, Math.ceil(next.capacity * 0.3));
    return {
      kind: "session",
      badge: few ? `Only ${next.seatsLeft} seat${next.seatsLeft === 1 ? "" : "s"} left` : "Next live session",
      title: next.title,
      text: next.summary || "A small live group where you get real answers about studying and interning in Japan.",
      ctaLabel: next.price ? "Book my seat" : "Book my free seat",
      href: `/sessions/${next.slug}`,
      facts: [formatSessionDate(next.startsAt), `${formatSessionTime(next.startsAt)} IST`, next.price ? formatPrice(next.price) : "Free"],
      startsAt: next.startsAt,
      delaySec,
    };
  }

  const products = await safe("popup.products", () => listPublishedProducts({ limit: 6 }), []);
  const product = products.find((p) => p.featured) ?? products[0];
  if (product) {
    const off = product.compareAtPrice && product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
    return {
      kind: "product",
      badge: off ? `${off}% off today` : product.price ? "Study store" : "Free guide",
      title: product.title,
      text: product.summary,
      ctaLabel: product.price ? `Get it for ${formatPrice(product.price)}` : "Get it free",
      href: `/store/${product.slug}`,
      facts: [product.category, "Instant download"],
      delaySec,
    };
  }

  const stats = await safe("popup.unis", () => universityStats(), { total: 0, verified: 0, byType: {} as Record<string, number> });
  return {
    kind: "universities",
    badge: "Free tool",
    title: "Find your university in Japan",
    text: `Tell Kittu your CGPA, field and budget, and get a personal shortlist${stats.total ? ` from ${stats.total} universities` : ""} in seconds.`,
    ctaLabel: "Build my shortlist",
    href: "/universities",
    facts: ["Free", "English-taught programs"],
    delaySec,
  };
}
