"use client";

import { useState } from "react";
import SquadsPage from "./SquadsPage";
import FlowsPageV2 from "./flow/FlowsPageV2";

interface Props {
  onNavigate: (page: string) => void;
}

type SubPage = "squads" | "fluxos";

// Envolve Squads e Fluxos em abas internas. Fluxos hoje só lista;
// no futuro vira editor visual de workflow (canvas drag-and-drop).
export default function ProducaoPage({ onNavigate }: Props) {
  const [subPage, setSubPage] = useState<SubPage>("squads");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0">
        <h1 className="text-base md:text-lg font-semibold mr-4 py-3">Produção</h1>
        <button
          onClick={() => setSubPage("squads")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            subPage === "squads"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🤖 Squads
        </button>
        <button
          onClick={() => setSubPage("fluxos")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            subPage === "fluxos"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🔄 Fluxos
        </button>
        <div className="flex-1" />
        {subPage === "fluxos" && (
          <span className="text-xs text-[var(--text-muted)] italic hidden md:inline">
            editor visual — desenho de automações e squads
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {subPage === "squads" ? (
          <SquadsPage onNavigate={onNavigate} />
        ) : (
          <FlowsPageV2 />
        )}
      </div>
    </div>
  );
}
