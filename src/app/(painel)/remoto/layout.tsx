import type { Metadata } from "next";
import type { ReactNode } from "react";

// Identidade própria da página /remoto (19/10/2026): ao "Adicionar à Tela de Início" daqui, o iPhone
// salva "Jarbas VPS" abrindo /remoto?ir=1 no Safari (display: browser), e não o app do painel.
export const metadata: Metadata = {
  title: "Jarbas VPS",
  manifest: "/manifest-remoto.json",
  appleWebApp: { capable: false, title: "Jarbas VPS" },
};

export default function RemotoLayout({ children }: { children: ReactNode }) {
  return children;
}
