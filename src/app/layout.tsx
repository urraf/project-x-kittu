import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · Study, intern and work in Japan`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Chitranshu Rajput", url: SITE_URL }],
  creator: "Chitranshu Rajput",
  keywords: [
    "Life of KittuKun",
    "Chitranshu Rajput",
    "study in Japan",
    "Japan internship for Indian students",
    "MEXT scholarship",
    "MEXT university recommendation",
    "OIST research internship",
    "universities in Japan for international students",
    "English-taught programs Japan",
    "fully funded scholarships",
    "research proposal template",
    "JLPT",
    "study in Japan from India",
    "MEXT scholarship for Indian students",
    "fully funded scholarships in Japan",
    "masters in Japan in English",
    "research internship in Japan",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  alternates: { types: { "application/rss+xml": `${SITE_URL}/feed.xml` } },
  category: "education",
  formatDetection: { telephone: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  // Optional: Search Console / Bing "HTML tag" verification codes (DNS verification needs nothing here).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={`${instrument.variable} ${geist.variable} ${geistMono.variable} ${newsreader.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Marks JS as available before paint so scroll-reveal never flashes content. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Open connections to the image CDNs early so thumbnails start downloading sooner. */}
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://yt3.googleusercontent.com" />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
