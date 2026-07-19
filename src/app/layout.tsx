import type { Metadata } from "next";
import { Inter, Kalam } from "next/font/google";
import "./globals.css";

// carrega as fontes via next/font pra garantir que Inter/Kalam existam de fato
// (antes eram só citadas no CSS sem nenhum <link>, então caíam no fallback do sistema)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

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
      <body suppressHydrationWarning className={`${inter.variable} ${kalam.variable}`}>{children}</body>
    </html>
  );
}
