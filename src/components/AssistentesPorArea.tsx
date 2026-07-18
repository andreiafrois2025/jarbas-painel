"use client";

// Coluna lateral "Assistentes por área" (18/07): vive na lateral esquerda da
// página única, ao lado da Agenda de hoje. Estreita de propósito: a largura
// acompanha a linha de chips das áreas (até pouco depois do "Família").

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Collaborator, Assignment, CONTEXTS, ContextType } from "@/lib/types";
import { usePainel } from "@/lib/painel-context";

export default function AssistentesPorArea() {
  const router = useRouter();
  const { collaborators, assignments, categories } = usePainel();
  const [assistArea, setAssistArea] = useState<ContextType>("IGAM");

  const assistentesByArea = useMemo(() => {
    const activeAsgs = assignments.filter(a => {
      const collab = collaborators.find(c => c.id === a.collaborator_id);
      return (collab?.status || "active") === "active";
    });
    const map: Record<string, { collab: Collaborator; asgs: Assignment[] }[]> = {};
    for (const ctx of CONTEXTS) map[ctx] = [];

    for (const asg of activeAsgs) {
      const cat = categories.find(c => c.id === asg.category_id);
      const ctx = (cat?.context || "IGAM") as string;
      if (!map[ctx]) map[ctx] = [];
      const collab = collaborators.find(c => c.id === asg.collaborator_id);
      if (!collab) continue;
      let entry = map[ctx].find(e => e.collab.id === collab.id);
      if (!entry) {
        entry = { collab, asgs: [] };
        map[ctx].push(entry);
      }
      entry.asgs.push(asg);
    }
    return map;
  }, [collaborators, assignments, categories]);

  const totalAssistants = useMemo(() =>
    assistentesByArea[assistArea]?.reduce((n, e) => n + e.asgs.length, 0) || 0,
  [assistentesByArea, assistArea]);

  return (
    <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
          🤖 Assistentes
        </h2>
        <button onClick={() => router.push("/equipe")}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline whitespace-nowrap">
          Gerenciar →
        </button>
      </div>

      {/* Chips das 4 áreas — a largura da coluna acompanha esta linha */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CONTEXTS.map(ctx => (
          <button key={ctx}
            onClick={() => setAssistArea(ctx)}
            className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-all ${
              assistArea === ctx
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}>
            {ctx}
          </button>
        ))}
      </div>

      {/* Lista compacta: persona + seus assistentes */}
      <div className="space-y-2">
        {assistentesByArea[assistArea]?.length ? (
          assistentesByArea[assistArea].map(({ collab, asgs }) => (
            <div key={collab.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{collab.icon || "👤"}</span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{collab.name}</span>
                <span className="text-[9px] text-[var(--text-muted)] shrink-0">{asgs.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {asgs.map(asg => {
                  const nomeDoAssistente = (asg.description?.trim() || asg.tool_name || "Assistente");
                  return (
                    <a key={asg.id} href={asg.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-underline transition-all"
                      title={`${nomeDoAssistente} (${asg.tool_name})`}>
                      <span>🔗</span>
                      <span className="font-medium truncate">{nomeDoAssistente}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] italic py-2">
            Nenhum assistente em {assistArea}.
          </p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] text-right">
          Total em {assistArea}: <strong>{totalAssistants}</strong>
        </p>
      </div>
    </section>
  );
}
