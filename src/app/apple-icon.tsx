import { ImageResponse } from "next/og";
import { SUN_PATHS } from "@/lib/brand/sun";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone/iPad: the rising sun on washi paper (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbf7f0" }}>
        <svg width="132" height="132" viewBox="0 0 32 32" fill="#d9482b">
          {SUN_PATHS.map((d) => <path key={d} d={d} />)}
        </svg>
      </div>
    ),
    size,
  );
}
