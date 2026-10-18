"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HRPage from "./HRPage";
import HabilidadesPage from "./HabilidadesPage";
import EscritorioPage from "./EscritorioPage";
import { Abas } from "./ui";
import { usePainel } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";

type Aba = "agentes" | "habilidades" | "escritorio";

// Equipe: quem trabalha por ela (agentes), o que sabem fazer (habilidades,
// prompts e plugins) e o escritório (a equipe trabalhando ao vivo).
// Setores, atalhos rápidos, criações e grafo moraram aqui e foram para Ajustes.
export default function EquipePage() {
  const { reload } = usePainel();
  const [aba, mudar] = useAbaUrl<Aba>(["agentes", "habilidades", "escritorio"], "agentes");
  const [novoSinal, setNovoSinal] = useState(0);
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Equipe" valor={aba} onMuda={(v) => mudar(v)} opcoes={[
        { id: "agentes", rotulo: "🤖 Agentes" },
        { id: "habilidades", rotulo: "🧰 Habilidades" },
        { id: "escritorio", rotulo: "🏢 Escritório" },
      ]} direita={aba === "agentes" ? (
        <button onClick={() => setNovoSinal((n) => n + 1)}
          className="my-2 shrink-0 whitespace-nowrap rounded-full border border-[var(--border-light)] px-3.5 py-1.5 text-[13px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
          + Novo agente
        </button>
      ) : undefined} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {aba === "agentes" && <HRPage modo="fichas" novoSinal={novoSinal} onDataChanged={reload} />}
        {aba === "habilidades" && <HabilidadesPage />}
        {aba === "escritorio" && <EscritorioPage />}
      </div>
    </div>
  );
}
