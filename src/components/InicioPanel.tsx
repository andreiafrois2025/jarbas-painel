"use client";

// Seção Escritório da página única (18/07).
// O que saiu: header "Início" (redundante com o Hoje), FeedTrabalhando
// (duplicava o "O que a equipe fez" do Hoje) e os quick links (foram pra
// barra do topo em inicio/page.tsx).
// "Assistentes por área" agora é recolhível: os bonequinhos dominam a tela.

import { useMemo, useState } from "react";
import { Collaborator, Assignment, CONTEXTS, ContextType, Category as CategoryType } from "@/lib/types";
import { SQUAD_API_BASE } from "@/lib/config";

interface Props {
  collaborators: Collaborator[];
  assignments: Assignment[];
  categories: CategoryType[];
  onOpenEquipe: () => void;
}

export default function InicioPanel({
  collaborators, assignments, categories, onOpenEquipe,
}: Props) {
  const [assistArea, setAssistArea] = useState<ContextType>("IGAM");
  const [assistentesAbertos, setAssistentesAbertos] = useState(false);
  const [openOfficeFullscreen, setOpenOfficeFullscreen] = useState(false);

  // Assistentes = colaboradores ativos e suas ferramentas (assignments),
  // agrupados por área. Uma persona pode aparecer em várias áreas.
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

  const officeUrl = `${SQUAD_API_BASE}/office/`;

  return (
    <div className="p-4 md:p-6 max-w-[1500px] mx-auto space-y-4">
      {/* Escritório em destaque: os bonequinhos com o máximo de espaço */}
      <section className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">🏢 Escritório</span>
          <button onClick={() => setOpenOfficeFullscreen(true)}
            className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-125 cursor-pointer transition-all">
            Ver em tela cheia ↗
          </button>
        </div>
        <iframe
          src={officeUrl}
          className="w-full border-0 h-[55vh] md:h-[65vh]"
          title="Escritório virtual"
          loading="lazy"
        />
      </section>

      {/* Assistentes por área — recolhível */}
      <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setAssistentesAbertos(a => !a)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] cursor-pointer">
            <span className="text-[var(--text-secondary)]">{assistentesAbertos ? "▾" : "▸"}</span>
            🤖 Assistentes por área
            <span className="text-[10px] font-normal text-[var(--text-muted)]">
              {assignments.length} no total
            </span>
          </button>
          <button onClick={onOpenEquipe}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline">
            Gerenciar na Equipe →
          </button>
        </div>

        {assistentesAbertos && (
          <div className="px-4 pb-4">
            {/* Chips das 4 áreas */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CONTEXTS.map(ctx => (
                <button key={ctx}
                  onClick={() => setAssistArea(ctx)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    assistArea === ctx
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}>
                  {ctx}
                </button>
              ))}
            </div>

            {/* Lista compacta: persona + seus assistentes */}
            <div className="space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-2.5 md:space-y-0">
              {assistentesByArea[assistArea]?.length ? (
                assistentesByArea[assistArea].map(({ collab, asgs }) => (
                  <div key={collab.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{collab.icon || "👤"}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{collab.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {asgs.length} assistente{asgs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 pl-7">
                      {asgs.map(asg => {
                        const nomeDoAssistente = (asg.description?.trim() || asg.tool_name || "Assistente");
                        return (
                          <a key={asg.id} href={asg.link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-underline transition-all"
                            title={`${nomeDoAssistente} (${asg.tool_name})`}>
                            <span>🔗</span>
                            <span className="font-medium truncate">{nomeDoAssistente}</span>
                            <span className="ml-auto text-[9px] uppercase tracking-wide opacity-60 shrink-0">{asg.tool_name}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic py-4">
                  Nenhum assistente cadastrado em {assistArea}.
                  <button onClick={onOpenEquipe} className="text-[var(--accent)] underline ml-1">
                    Cadastrar na Equipe
                  </button>
                </p>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-right mt-2">
              Total em {assistArea}: <strong>{totalAssistants}</strong>
            </p>
          </div>
        )}
      </section>

      {/* Modal de escritório em tela cheia */}
      {openOfficeFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpenOfficeFullscreen(false)}>
          <div className="bg-[var(--bg-primary)] rounded-2xl overflow-hidden w-full h-full max-w-7xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">🏢 Escritório em tela cheia</span>
              <button onClick={() => setOpenOfficeFullscreen(false)}
                className="text-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] leading-none cursor-pointer">
                ✕
              </button>
            </div>
            <iframe src={officeUrl} className="flex-1 w-full border-0" title="Escritório virtual (fullscreen)" />
          </div>
        </div>
      )}
    </div>
  );
}
