import type { Metadata, Viewport } from "next";
import RegistrarSW from "@/components/RegistrarSW";
import { Manrope, Special_Elite, Kalam } from "next/font/google";
import "./globals.css";

// Fontes via next/font. Manrope é o texto de tudo; Special Elite (máquina de
// escrever) fica só para a saudação e o nome "Jarbas". Kalam é do desenho dos fluxos.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const elite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-elite",
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
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png?v=2", apple: "/apple-touch-icon.png?v=2" },
  appleWebApp: { capable: true, title: "Jarbas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // cobre a tela toda (inclusive atrás da barra de status e do indicador de home do iPhone);
  // o painel desconta as áreas seguras com env(safe-area-inset-*)
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2A2E" },
  ],
};

// Roda antes da primeira pintura: lê a escolha de tema e marca o <html>, pra
// a tela não piscar clara quando ela escolheu noturno. Sem escolha = nada marcado
// (o CSS segue o sistema).
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");document.documentElement.setAttribute("data-theme",(t==="escuro"||t==="misto")?t:"claro")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body suppressHydrationWarning className={`${manrope.variable} ${elite.variable} ${kalam.variable}`}>{children}<RegistrarSW /></body>
    </html>
  );
}
