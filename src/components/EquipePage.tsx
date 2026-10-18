"use client";

import { useRouter } from "next/navigation";
import HRPage from "./HRPage";
import BibliotecaPage from "./BibliotecaPage";
import EscritorioPage from "./EscritorioPage";
import { Abas } from "./ui";
import { usePainel, pageToPath } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";

type Aba = "agentes" | "habilidades" | "escritorio";

// Equipe: quem trabalha por ela (agentes), o que sabem fazer (habilidades,
// prompts e plugins) e o escritório (a equipe trabalhando ao vivo).
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
        {aba === "escritorio" && <EscritorioPage />}
      </div>
    </div>
  );
}
