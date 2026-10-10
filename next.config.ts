import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://*.razorpay.com" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the project root (a stray lockfile higher up the tree would otherwise be picked).
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    // Images are already optimised (uploads are stored as resized WebP; YouTube
    // serves its own CDN thumbnails), so skip the on-the-fly optimiser: on small
    // hosts it re-encodes every image on first view, which made images slow to appear.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    localPatterns: [{ pathname: "/api/media/**" }, { pathname: "/images/**" }],
  },
  // Fonts read at runtime by next/og for generated covers & OG images.
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/assets/fonts/**/*"],
    "/blog/**/*": ["./src/assets/fonts/**/*"],
    "/opengraph-image": ["./src/assets/fonts/**/*"],
  },
  experimental: {
    proxyClientMaxBodySize: "55mb",
  },
  async redirects() {
    // Friendly alias: the dashboard lives at /admin.
    return [
      { source: "/admin/dashboard", destination: "/admin", permanent: false },
      // The story page became "About" when the site turned into a platform.
      { source: "/journey", destination: "/about", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
