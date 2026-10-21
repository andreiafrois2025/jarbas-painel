import type { Metadata } from "next";
import ConversaPage from "@/components/ConversaPage";

// 21/10/2026: /jarbas abre direto o chat do Jarbas e FICA em /jarbas (antes era um desvio para
// /conversa?agente=jarbas, e o celular salvava só o painel). O manifesto próprio faz o ícone da
// tela inicial abrir aqui.
export const metadata: Metadata = {
  title: "Jarbas",
  manifest: "/manifest-jarbas.json",
  appleWebApp: { capable: true, title: "Jarbas" },
};

export default function JarbasRoute() {
  return <ConversaPage />;
}
