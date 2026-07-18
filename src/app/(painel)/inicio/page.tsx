"use client";

// Página única (18/07): Hoje + Escritório unificados, sem abas.
// Atalhos (quick links) ficam na barra do topo, sempre à mão.

import { useRouter } from "next/navigation";
import InicioPanel from "@/components/InicioPanel";
import HojePanel from "@/components/HojePanel";
import StatusSemaforo from "@/components/StatusSemaforo";
import { usePainel } from "@/lib/painel-context";

export default function InicioPage() {
  const router = useRouter();
  const { collaborators, assignments, categories, quickLinks } = usePainel();

  const ativos = collaborators.filter(c => (c.status || "active") === "active").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Barra do topo: atalhos de acesso rápido + contadores + semáforo */}
      <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-3 md:px-5 gap-3 shrink-0 h-14 overflow-x-auto">
        {/* Contadores primeiro, atalhos depois (pedido dela 18/07) */}
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
        <StatusSemaforo />
      </header>

      {/* Página única rolável: o dia primeiro, o escritório embaixo */}
      <div className="flex-1 overflow-y-auto">
        <HojePanel />
        <InicioPanel
          collaborators={collaborators}
          assignments={assignments}
          categories={categories}
          onOpenEquipe={() => router.push("/equipe")}
        />
      </div>
    </div>
  );
}
