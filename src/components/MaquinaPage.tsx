"use client";

import dynamic from "next/dynamic";
import { Abas } from "./ui";
import { useAbaUrl } from "@/lib/navegacao";
import SquadsPage from "./SquadsPage";
import SaudePage from "./SaudePage";
import { useRouter } from "next/navigation";
import { pageToPath } from "@/lib/painel-context";

// O editor de desenho (@xyflow + roughjs) é pesado: só chega quando o Mapa abre.
const FlowsPageV2 = dynamic(() => import("./flow/FlowsPageV2"), {
  loading: () => <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">abrindo…</div>,
  ssr: false,
});

type Aba = "mapa" | "squads" | "saude";

// Máquina: o que roda por trás. Mapa (fluxos desenhados), Squads, Saúde.
// A antiga página Automações não está mais no menu; o Mapa a substitui como
// lista (o código dela continua em AutomacoesPage.tsx).
export default function MaquinaPage() {
  const router = useRouter();
  const [aba, mudar] = useAbaUrl<Aba>(["mapa", "squads", "saude"], "mapa");
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Máquina" valor={aba} onMuda={(v) => mudar(v)} opcoes={[
        { id: "mapa", rotulo: "🗺️ Mapa" },
        { id: "squads", rotulo: "🤖 Squads" },
        { id: "saude", rotulo: "🩺 Saúde" },
      ]} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {aba === "mapa" && <FlowsPageV2 />}
        {aba === "squads" && <SquadsPage onNavigate={(p: string) => router.push(pageToPath(p))} />}
        {aba === "saude" && <SaudePage />}
      </div>
    </div>
  );
}
