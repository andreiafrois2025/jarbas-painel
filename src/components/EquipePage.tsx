"use client";

import { useRouter } from "next/navigation";
import HRPage from "./HRPage";
import BibliotecaPage from "./BibliotecaPage";
import { Abas } from "./ui";
import { usePainel, pageToPath } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";

type Aba = "agentes" | "habilidades" | "escritorio";

// Equipe: quem trabalha por ela (agentes), o que sabem fazer (habilidades,
// prompts e plugins) e, na próxima etapa, o escritório.
export default function EquipePage() {
  const router = useRouter();
  const { reload } = usePainel();
  const [aba, mudar] = useAbaUrl<Aba>(["agentes", "habilidades", "escritorio"], "agentes");
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Equipe" valor={aba} onMuda={(v) => mudar(v)} opcoes={[
        { id: "agentes", rotulo: "🤖 Agentes" },
        { id: "habilidades", rotulo: "🧰 Habilidades" },
        { id: "escritorio", rotulo: "🏢 Escritório" },
      ]} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {aba === "agentes" && <HRPage onNavigate={(p) => router.push(pageToPath(p))} onDataChanged={reload} />}
        {aba === "habilidades" && <BibliotecaPage />}
        {aba === "escritorio" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="text-4xl" aria-hidden>🏗️</span>
            <p className="text-base font-semibold">O escritório está em construção</p>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">Aqui você vai ver a equipe trabalhando, cada agente na sua mesa. Chega na próxima etapa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
