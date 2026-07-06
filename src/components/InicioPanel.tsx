"use client";

import { useMemo, useState } from "react";
import { Collaborator, Assignment, CONTEXTS, ContextType, Category as CategoryType, QuickLink } from "@/lib/types";
import { SQUAD_API_BASE } from "@/lib/config";
import StatusSemaforo from "./StatusSemaforo";

interface Props {
  collaborators: Collaborator[];
  assignments: Assignment[];
  categories: CategoryType[];
  quickLinks: QuickLink[];
  onOpenEquipe: () => void;
}

// Layout Fase B: dividido meio a meio.
// Esquerda = widgets (semáforo, feed, entregas, atalho pra assistentes).
// Direita = escritório em iframe (o novo escritório com 16 personas).
export default function InicioPanel({
  collaborators, assignments, categories, quickLinks, onOpenEquipe,
}: Props) {
  const [assistArea, setAssistArea] = useState<ContextType>("IGAM");
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
    <>
      {/* Header simples com semáforo e busca (mais leve que antes) */}
      <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-3 md:px-5 gap-3 shrink-0 h-14">
        <h1 className="text-base md:text-lg font-semibold">Início</h1>
        <div className="hidden md:flex gap-4 ml-2 text-sm">
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{collaborators.filter(c => (c.status || "active") === "active").length}</span> colaboradores
          </span>
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{assignments.length}</span> assistentes
          </span>
        </div>
        <div className="flex-1" />
        <StatusSemaforo />
      </header>

      {/* Corpo: 1/3 assistentes + 2/3 escritório (mais espaço pros bonequinhos) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

        {/* ============ COLUNA ESQUERDA — widgets (1/3) ============ */}
        <div className="w-full md:w-1/3 border-r border-[var(--border)] overflow-auto p-4 md:p-5 space-y-5">

          {/* Atalhos rápidos (JARBAS etc) */}
          {quickLinks.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium mb-2">
                Atalhos rápidos
              </h2>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map(ql => (
                  <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white no-underline transition-all hover:brightness-110"
                    style={{ background: "var(--af-teal)" }}
                    title={ql.label}>
                    <span>{ql.icon}</span>{ql.label}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Seção principal: Assistentes por área */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                🤖 Assistentes por área
              </h2>
              <button onClick={onOpenEquipe}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline">
                Gerenciar na Equipe →
              </button>
            </div>

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
            <div className="space-y-2.5">
              {assistentesByArea[assistArea]?.length ? (
                assistentesByArea[assistArea].map(({ collab, asgs }) => (
                  <div key={collab.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-2.5">
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
              <p className="text-[10px] text-[var(--text-muted)] text-right">
                Total em {assistArea}: <strong>{totalAssistants}</strong>
              </p>
            </div>
          </section>
        </div>

        {/* ============ COLUNA DIREITA — escritório (iframe) 2/3 ============ */}
        <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">🏢 Escritório</span>
            <button onClick={() => setOpenOfficeFullscreen(true)}
              className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-125 cursor-pointer transition-all">
              Ver em tela cheia ↗
            </button>
          </div>
          <iframe
            src={officeUrl}
            className="flex-1 w-full border-0"
            title="Escritório virtual"
            loading="lazy"
          />
        </div>
      </div>

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
    </>
  );
}
