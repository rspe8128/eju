import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { StorageProvider } from "@/context/StorageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "EJU Study - 일본 유학 준비",
  description: "EJU·JLPT·TOEFL 학습, 플랜, 성적, 작문 연습",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EJU Study",
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <StorageProvider>
            <AppShell>{children}</AppShell>
            <ServiceWorkerRegister />
          </StorageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
