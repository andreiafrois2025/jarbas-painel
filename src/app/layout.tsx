import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarbas — AI Agent Orchestrator",
  description: "Centralize, execute and automate your AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
