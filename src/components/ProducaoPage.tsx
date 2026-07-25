"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import SquadsPage from "./SquadsPage";
import AutomacoesPage from "./AutomacoesPage";
import { pageToPath } from "@/lib/painel-context";

// 25/07/2026 (F7): o editor de desenho (@xyflow + roughjs) e o estúdio de reels
// pesam ~75 KB e eram baixados em TODA aba de Produção, mesmo sem você abri-los.
// Agora só chegam quando a aba correspondente é aberta.
const carregando = () => (
  <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">
    abrindo…
  </div>
);
const FlowsPageV2 = dynamic(() => import("./flow/FlowsPageV2"), { loading: carregando, ssr: false });
const EstudioPage = dynamic(() => import("./EstudioPage"), { loading: carregando, ssr: false });

type SubPage = "squads" | "automacoes" | "fluxos" | "estudio";

interface Props {
  sub: SubPage;
}

// Abas internas de Produção; cada aba é uma rota, então F5 mantém a aba.
//
// 25/07/2026: "Fluxos" saiu do menu. A rota continua existindo (é pra onde um
// card de Automações leva pra desenhar), mas deixou de ser um destino que se
// escolhe — não é mais lista, é a mesa de desenho de um fluxo específico.
export default function ProducaoPage({ sub }: Props) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0">
        <h1 className="text-base md:text-lg font-semibold mr-4 py-3">Produção</h1>
        <button
          onClick={() => router.push("/producao/squads")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            sub === "squads"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🤖 Squads
        </button>
        <button
          onClick={() => router.push("/producao/automacoes")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            sub === "automacoes"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          ⚡ Automações
        </button>
        <button
          onClick={() => router.push("/producao/estudio")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            sub === "estudio"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🎬 Estúdio
        </button>
        <div className="flex-1" />
        {sub === "automacoes" && (
          <span className="text-xs text-[var(--text-muted)] italic hidden md:inline">
            o que roda sozinho, quando roda e se está vivo
          </span>
        )}
        {sub === "fluxos" && (
          <span className="text-xs text-[var(--text-muted)] italic hidden md:inline">
            mesa de desenho — chega-se aqui por um card de Automações
          </span>
        )}
        {sub === "estudio" && (
          <span className="text-xs text-[var(--text-muted)] italic hidden md:inline">
            revisão da edição automática de reels
          </span>
        )}
      </div>
      {/* precisa ser flex: os filhos (FlowsPageV2 etc) usam flex-1 pra herdar a altura */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {sub === "squads" ? (
          <SquadsPage onNavigate={(p: string) => router.push(pageToPath(p))} />
        ) : sub === "automacoes" ? (
          <AutomacoesPage />
        ) : sub === "fluxos" ? (
          <FlowsPageV2 />
        ) : (
          <EstudioPage />
        )}
      </div>
    </div>
  );
}
