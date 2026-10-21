import { ImageResponse } from "next/og";
import { SUN_PATHS } from "@/lib/brand/sun";

// 192px: a multiple of 48, which is what Google wants for the logo next to search results.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

/** Favicon: the wavy rising sun on washi paper. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbf7f0", borderRadius: 40 }}>
        <svg width="150" height="150" viewBox="0 0 32 32" fill="#d9482b">
          {SUN_PATHS.map((d) => <path key={d} d={d} />)}
        </svg>
      </div>
    ),
    size,
  );
}
