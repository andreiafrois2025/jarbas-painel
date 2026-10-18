"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PessoalPage from "@/components/PessoalPage";
import { usePainel } from "@/lib/painel-context";

export default function PessoalRoute() {
  const { servidora } = usePainel();
  const router = useRouter();

  // Modo Servidora: a rota some. A página nem monta, então Luiz e finanças
  // não são pedidos ao servidor (Fase 5-A).
  useEffect(() => {
    if (servidora) router.replace("/inicio");
  }, [servidora, router]);

  if (servidora) return null;
  return <PessoalPage />;
}
