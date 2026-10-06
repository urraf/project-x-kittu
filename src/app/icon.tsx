import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#100e0c", borderRadius: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "#d9482b", display: "flex", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 26, height: 3, background: "#100e0c" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 32, height: 2, background: "#100e0c" }} />
        </div>
      </div>
    ),
    size,
  );
}
