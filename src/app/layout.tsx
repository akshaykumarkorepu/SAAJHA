import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Tiro_Devanagari_Hindi } from "next/font/google";
import { Providers } from "@/components/saajha/providers";
import { THEME_SCRIPT } from "@/components/saajha/theme";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
// Only the footer's साझा uses this; the browser fetches it on demand (unicode-range).
const devanagari = Tiro_Devanagari_Hindi({ variable: "--font-deva", subsets: ["devanagari"], weight: "400", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL("https://saajha-campus.vercel.app"),
  applicationName: "Saajha",
  openGraph: {
    type: "website",
    siteName: "Saajha",
    title: "Saajha · Idle labs, shared with trust",
    description: "Readiness checks, fair approvals and evidence-backed handovers for campus labs. Demo with fictional data.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Saajha: Idle labs, shared with trust." }],
  },
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" }, apple: "/apple-touch-icon.png" },
  twitter: { card: "summary_large_image" },
  title: { default: "Saajha · Idle labs, shared with trust", template: "%s · Saajha" },
  description:
    "Saajha lets NIT Warangal labs and clubs safely share idle equipment and rooms, with readiness checks, fair approvals and evidence-backed handovers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
