"use client";

import { useState } from "react";
import MetricsPage from "./MetricsPage";

interface Props {
  onNavigate: (page: string) => void;
}

type SubPage = "integracoes" | "metricas";

// Config concentra o que é bastidor: integrações (Notion/WhatsApp/Gemini)
// e Métricas (movidas do menu principal — perderam destaque de propósito).
export default function ConfigPage({ onNavigate }: Props) {
  const [subPage, setSubPage] = useState<SubPage>("integracoes");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0">
        <h1 className="text-base md:text-lg font-semibold mr-4 py-3">Config</h1>
        <button
          onClick={() => setSubPage("integracoes")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            subPage === "integracoes"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          🔌 Integrações
        </button>
        <button
          onClick={() => setSubPage("metricas")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            subPage === "metricas"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          📊 Métricas
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {subPage === "integracoes" ? (
          <div className="p-6 md:p-8 max-w-3xl mx-auto text-sm text-[var(--text-secondary)] space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Integrações
            </h2>
            <p>Página em construção. Aqui vão as integrações do painel:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>🟢 Notion (Segundo Cérebro, Radar de Posts IA)</li>
              <li>📱 WhatsApp (dispatcher, grupo IA, watchdog)</li>
              <li>🤖 Google Gemini (chave, quota)</li>
              <li>📅 Google Calendar / Drive</li>
              <li>🔑 Chaves Supabase, PATs, env vars</li>
            </ul>
            <p className="text-[var(--text-muted)] text-xs mt-6">
              Por enquanto essas configurações continuam em arquivos na VPS.
              Vai migrar pra cá aos poucos.
            </p>
          </div>
        ) : (
          <MetricsPage onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
