import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";

const notoSansTC = localFont({
  src: "./fonts/NotoSansTC-Regular.woff2",
  display: "swap",
  weight: "400",
  style: "normal",
  variable: "--font-noto-sans-tc",
});

const deployedHost = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const metadataBase = new URL(
  deployedHost ? (deployedHost.startsWith("http") ? deployedHost : `https://${deployedHost}`) : "http://localhost:3000"
);

const themeBootScript = `(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("melonmate-v1") || "{}");
    const theme = saved && saved.state && saved.state.theme;
    const lang = saved && saved.state && saved.state.lang;
    if (["honeydew", "watermelon", "cantaloupe", "canary", "hami", "chamoe", "moon-gold", "densuke"].includes(theme)) {
      document.documentElement.dataset.theme = theme;
    }
    if (lang === "zh") document.documentElement.lang = "zh-Hant";
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  metadataBase,
  title: "MelonMate",
  description: "A personal food and fitness companion with friend progress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MelonMate",
  },
  icons: {
    icon: "/icon-honey-2d-192.png",
    apple: "/apple-touch-icon-honey-2d.png",
  },
  openGraph: {
    title: "MelonMate",
    description: "Your progress. Friends cheering.",
    type: "website",
    images: [{ url: "/og-honey-2d.png", width: 1731, height: 909, alt: "Honey welcomes you to MelonMate." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MelonMate",
    description: "Your progress. Friends cheering.",
    images: ["/og-honey-2d.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f6f7e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="honeydew" className={notoSansTC.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <div className="bg-melon" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
