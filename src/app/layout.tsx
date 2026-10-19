import type { Metadata, Viewport } from "next";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { FRAMES_CSS } from "@/lib/pixel/frames";
import { handjet, vt323 } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tactics for Traps",
    template: "%s · Tactics for Traps",
  },
  description:
    "Giải puzzle Lichess mỗi ngày, giữ Streak, lên Level và đua top cùng hội bạn. Tự động đồng bộ từ Lichess.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0d2118",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${handjet.variable} ${vt323.variable}`}>
      <body className="min-h-dvh pb-20 md:pb-0">
        <style href="pixel-frames" precedence="default">
          {FRAMES_CSS}
        </style>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 btn btn-sm">
          Bỏ qua đến nội dung chính
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[72rem] px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
        <footer className="mx-auto max-w-[72rem] px-4 pb-8 text-body-sm text-mist md:px-6">
          Dữ liệu puzzle từ Lichess.org. Không liên kết chính thức với Lichess.
        </footer>
        <MobileTabBar />
      </body>
    </html>
  );
}
