import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Branded typographic artwork rendered with next/og (satori). Used for
 * generated blog covers and Open Graph images, so every post has a
 * consistent, on-brand visual even without a photo.
 */

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts");
let fontsPromise: Promise<{ name: string; data: Buffer; style: "normal" | "italic"; weight: 400 | 500 }[]> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "InstrumentSerif-Regular.ttf")).then((data) => ({ name: "Serif", data, style: "normal" as const, weight: 400 as const })),
    readFile(path.join(FONT_DIR, "InstrumentSerif-Italic.ttf")).then((data) => ({ name: "Serif", data, style: "italic" as const, weight: 400 as const })),
    readFile(path.join(FONT_DIR, "Geist-Medium.ttf")).then((data) => ({ name: "Sans", data, style: "normal" as const, weight: 500 as const })),
    readFile(path.join(FONT_DIR, "GeistMono-Medium.ttf")).then((data) => ({ name: "Mono", data, style: "normal" as const, weight: 500 as const })),
  ]).catch((e) => {
    fontsPromise = null;
    throw e;
  });
  return fontsPromise;
}

// Light washi palettes to match the site (indigo ink, never black).
const PALETTES: Record<string, { bg: string; sun: string; ink: string; muted: string }> = {
  japan: { bg: "#FBF7F0", sun: "#D9482B", ink: "#1D2B45", muted: "#6E7387" },
  korea: { bg: "#E6ECF6", sun: "#C9473A", ink: "#1D2B45", muted: "#5D6782" },
  europe: { bg: "#E7EEDD", sun: "#C8922F", ink: "#1D2B45", muted: "#5E6B5F" },
  career: { bg: "#F8EED6", sun: "#D9482B", ink: "#1D2B45", muted: "#6E6A5A" },
  default: { bg: "#F9E4E6", sun: "#D9482B", ink: "#1D2B45", muted: "#6E7387" },
};

function paletteFor(category: string) {
  const c = category.toLowerCase();
  if (c.includes("japan")) return PALETTES.japan!;
  if (c.includes("korea")) return PALETTES.korea!;
  if (c.includes("europe") || c.includes("travel")) return PALETTES.europe!;
  if (c.includes("career")) return PALETTES.career!;
  return PALETTES.default!;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export type ArtOptions = {
  title: string;
  category?: string;
  kicker?: string;
  width?: number;
  height?: number;
};

export async function renderArt({ title, category = "Stories", kicker, width = 1600, height = 900 }: ArtOptions) {
  const fonts = await loadFonts();
  const p = paletteFor(category);
  const h = hash(title);
  const scale = width / 1600;
  const sunSize = Math.round((520 + (h % 160)) * scale);
  const sunTop = Math.round((-120 + (h % 220)) * scale);
  const sunRight = Math.round((-140 + ((h >> 3) % 120)) * scale);
  const titleSize = Math.round((title.length > 70 ? 76 : title.length > 45 ? 88 : 104) * scale);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: p.bg, color: p.ink, fontFamily: "Sans" }}>
        <div
          style={{
            position: "absolute",
            top: sunTop,
            right: sunRight,
            width: sunSize,
            height: sunSize,
            borderRadius: 9999,
            background: p.sun,
            opacity: 0.92,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: sunTop + Math.round(sunSize * 0.62),
            right: sunRight - 40,
            width: sunSize + 80,
            height: Math.round(6 * scale),
            background: p.bg,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: sunTop + Math.round(sunSize * 0.74),
            right: sunRight - 40,
            width: sunSize + 80,
            height: Math.round(4 * scale),
            background: p.bg,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: `${Math.round(84 * scale)}px ${Math.round(96 * scale)}px`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: Math.round(14 * scale), fontFamily: "Mono", fontSize: Math.round(24 * scale), letterSpacing: 4, textTransform: "uppercase", color: p.muted }}>
            <div style={{ width: Math.round(12 * scale), height: Math.round(12 * scale), borderRadius: 9999, background: p.sun }} />
            <span>{kicker ?? category}</span>
          </div>
          <div style={{ display: "flex", fontFamily: "Serif", fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1.5, maxWidth: Math.round(1180 * scale) }}>
            {title}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: Math.round(26 * scale), color: p.muted }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: Math.round(12 * scale) }}>
              <span style={{ fontFamily: "Serif", fontStyle: "italic", fontSize: Math.round(40 * scale), color: p.ink }}>Life of KittuKun</span>
            </div>
            <span style={{ fontFamily: "Mono", fontSize: Math.round(20 * scale), letterSpacing: 3 }}>LIFEOFKITTUKUN</span>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts },
  );
}

export async function renderArtBuffer(opts: ArtOptions) {
  const res = await renderArt(opts);
  return Buffer.from(await res.arrayBuffer());
}
