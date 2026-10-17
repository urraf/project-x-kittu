import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "KittuKun",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#d9482b",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
