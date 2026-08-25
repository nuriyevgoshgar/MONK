import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { FullPlayer } from "@/components/player/full-player";
import { MiniPlayer } from "@/components/player/mini-player";
import { PlayerProvider } from "@/components/player/player-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { ThemeApplier } from "@/components/settings/theme-applier";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MONK",
  description: "A quiet place to listen to books.",
  applicationName: "MONK",
  appleWebApp: { capable: true, title: "MONK", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
  // The player and bottom nav sit on the safe area on phones.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        {/* The player lives in the layout, above the routed content, so
            navigating between screens never unmounts the <audio> element. */}
        <ThemeApplier />
        <ServiceWorkerRegistrar />
        <PlayerProvider>
          <OfflineBanner />
          {children}
          <MiniPlayer />
          <BottomNav />
          <FullPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
