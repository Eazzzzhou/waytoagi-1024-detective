import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/investigation/AppShell";
import "./globals.css";

export const metadata: Metadata = { title: "案卷 · AI 产品调查", description: "AI 产品调查与证据核查平台" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body><AppShell>{children}</AppShell></body></html>;
}
