import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AppShell } from "@/components/investigation/AppShell";
import "./globals.css";

const dossierSerif = localFont({
  src: [
    { path: "../../public/fonts/noto-serif-sc-title-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/noto-serif-sc-title-900.woff2", weight: "900", style: "normal" }
  ],
  variable: "--font-dossier-serif", display: "swap", preload: true,
  fallback: ["Songti SC", "SimSun", "serif"], adjustFontFallback: "Times New Roman"
});

export const metadata: Metadata = { title: "案卷 · AI 产品调查", description: "AI 产品调查与证据核查平台" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN" className={dossierSerif.variable}><body><AppShell>{children}</AppShell></body></html>;
}
