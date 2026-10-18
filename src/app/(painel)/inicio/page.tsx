"use client";

// Página única (18/07): Hoje + Escritório unificados, sem abas.
// Barra do topo: contadores primeiro, depois os atalhos, sempre à mão.
// Assistentes por área é a coluna lateral esquerda do Hoje.

import InicioPanel from "@/components/InicioPanel";
import HojePanel from "@/components/HojePanel";
import HojeServidora from "@/components/HojeServidora";
import AssistentesPorArea from "@/components/AssistentesPorArea";
import StatusSemaforo from "@/components/StatusSemaforo";
import { usePainel } from "@/lib/painel-context";

export default function InicioPage() {
  const { collaborators, assignments, quickLinks, modo, setModo, servidora } = usePainel();

  const ativos = collaborators.filter(c => (c.status || "active") === "active").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Barra do topo: contadores + atalhos + semáforo */}
      <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-3 md:px-5 gap-3 shrink-0 h-14 overflow-x-auto">
        <div className="flex gap-3 text-sm shrink-0 whitespace-nowrap">
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{ativos}</span> colaboradores
          </span>
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{assignments.length}</span> assistentes
          </span>
        </div>
        {quickLinks.length > 0 && (
          <div className="flex gap-1.5 shrink-0 ml-2">
            {quickLinks.map(ql => (
              <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-white no-underline transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: "var(--af-teal)" }}
                title={ql.label}>
                <span>{ql.icon}</span>{ql.label}
              </a>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {/* Botão Servidora / Tudo (Fase 5-A). A escolha vale até fechar o navegador. */}
        <div
          className="inline-flex shrink-0 rounded-lg border border-[var(--border)] overflow-hidden text-xs font-semibold"
          role="group"
          aria-label="Modo de exibição"
        >
          {(["tudo", "servidora"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              aria-pressed={modo === m}
              title={m === "servidora"
                ? "Servidora: esconde finanças, agenda e tarefas pessoais, Luiz e áreas pessoais (para projetar em curso)"
                : "Tudo: mostra o painel completo"}
              className={`px-3 py-1.5 cursor-pointer transition-all whitespace-nowrap ${
                modo === m ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
              style={modo === m ? { background: "var(--af-teal)" } : undefined}
            >
              {m === "servidora" ? "🎓 Servidora" : "Tudo"}
            </button>
          ))}
        </div>
        <StatusSemaforo />
      </header>

      {/* Página única rolável: o dia primeiro, o escritório embaixo */}
      <div className="flex-1 overflow-y-auto">
        {servidora
          ? <HojeServidora lateral={<AssistentesPorArea />} />
          : <HojePanel lateral={<AssistentesPorArea />} />}
        <InicioPanel />
      </div>
    </div>
  );
}
