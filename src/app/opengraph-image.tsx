import { renderArt } from "@/lib/og/art";

export const alt = "Life of KittuKun: international internships, scholarships and life in Japan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderArt({ title: "From Delhi to Japan, one application at a time.", category: "Japan", kicker: "Chitranshu Rajput · YouTube creator", width: 1200, height: 630 });
}
