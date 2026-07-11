"use client";

import { useRouter } from "next/navigation";
import SquadsPage from "./SquadsPage";
import FlowsPageV2 from "./flow/FlowsPageV2";
import { pageToPath } from "@/lib/painel-context";

type SubPage = "squads" | "fluxos";

interface Props {
  sub: SubPage;
}

// Envolve Squads e Fluxos em abas internas; cada aba é uma rota
// (/producao/squads e /producao/fluxos), então F5 mantém a aba.
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
          onClick={() => router.push("/producao/fluxos")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            sub === "fluxos"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🔄 Fluxos
        </button>
        <div className="flex-1" />
        {sub === "fluxos" && (
          <span className="text-xs text-[var(--text-muted)] italic hidden md:inline">
            editor visual — desenho de automações e squads
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {sub === "squads" ? (
          <SquadsPage onNavigate={(p: string) => router.push(pageToPath(p))} />
        ) : (
          <FlowsPageV2 />
        )}
      </div>
    </div>
  );
}
