"use client";

import { useEffect, useState } from "react";
import type { FlowDoc, FlowCategory } from "@/lib/types";
import { getFlowDocs, addFlowDoc, deleteFlowDoc, duplicateFlowDoc, updateFlowDoc } from "@/lib/storage";
import FlowCanvas from "./FlowCanvas";
import { toMermaid, toPrompt, copy, download } from "./FlowExport";

// =============================================
// Página nova de Fluxos — n8n-like, só desenho.
// 3 categorias em abas: Squads / Automação / Manual.
// Cada card abre um fluxo no canvas.
// =============================================

const CATEGORIES: { key: FlowCategory; label: string; icon: string }[] = [
  { key: "automation", label: "Automação", icon: "⚙️" },
  { key: "squad", label: "Squads", icon: "🤖" },
  { key: "manual", label: "Manual", icon: "✋" },
];

export default function FlowsPageV2() {
  const [flows, setFlows] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<FlowCategory>("automation");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingCat, setCreatingCat] = useState<FlowCategory | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const load = async () => {
    setLoading(true);
    try {
      const list = await getFlowDocs();
      setFlows(list);
    } catch (e) {
      console.error("Erro ao carregar fluxos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = flows.find((f) => f.id === selectedId) || null;
  const filtered = flows.filter((f) => f.category === category);

  const handleCreate = async () => {
    if (!newTitle.trim() || !creatingCat) return;
    const f = await addFlowDoc({
      title: newTitle.trim(),
      category: creatingCat,
      nodes: [
        { id: "1", type: "start", position: { x: 100, y: 100 }, data: { label: "Início", icon: "▶️" } },
      ],
      edges: [],
    });
    setNewTitle("");
    setCreatingCat(null);
    await load();
    setSelectedId(f.id);
  };

  const handleDuplicate = async (id: string) => {
    const f = await duplicateFlowDoc(id);
    await load();
    setSelectedId(f.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esse fluxo?")) return;
    await deleteFlowDoc(id);
    if (selectedId === id) setSelectedId(null);
    await load();
  };

  const handleCanvasChange = async (updates: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => {
    if (!selected || selected.is_seed) return;
    setSaveState("saving");
    await updateFlowDoc(selected.id, updates);
    setFlows((fs) => fs.map((f) => (f.id === selected.id ? { ...f, ...updates } : f)));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  // ─── Modo canvas (fluxo aberto) ───
  if (selected) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-2 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Voltar
          </button>
          <h2 className="text-base font-semibold truncate flex-1">{selected.title}</h2>
          {selected.is_seed && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--af-teal)] text-white">
              seed (só leitura)
            </span>
          )}
          {saveState === "saving" && <span className="text-[11px] text-[var(--text-muted)]">salvando…</span>}
          {saveState === "saved" && <span className="text-[11px] text-[var(--success)]">salvo ✓</span>}
          <div className="flex gap-1">
            <button
              onClick={async () => {
                await copy(toMermaid(selected));
                alert("Mermaid copiado! Cola em qualquer IA.");
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Copia como Mermaid (formato de fluxo em texto)"
            >
              📋 Mermaid
            </button>
            <button
              onClick={async () => {
                await copy(toPrompt(selected));
                alert("Descrição copiada! Cola em qualquer IA sem estrutura de código.");
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Copia como prompt textual"
            >
              📝 Prompt
            </button>
            <button
              onClick={() => download(`${selected.title}.json`, JSON.stringify(selected, null, 2), "application/json")}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Baixa JSON estruturado"
            >
              💾 JSON
            </button>
            {selected.is_seed && (
              <button
                onClick={() => handleDuplicate(selected.id)}
                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                title="Duplica pra editar"
              >
                ⎘ Duplicar
              </button>
            )}
          </div>
        </div>
        {selected.description && (
          <div className="bg-[var(--bg-tertiary)] px-4 py-2 text-xs text-[var(--text-secondary)] shrink-0 border-b border-[var(--border)]">
            {selected.description}
          </div>
        )}
        <div className="flex-1 overflow-hidden" style={{ minHeight: 500, height: "calc(100vh - 200px)" }}>
          <FlowCanvas flow={selected} readOnly={!!selected.is_seed} onChange={handleCanvasChange} />
        </div>
      </div>
    );
  }

  // ─── Modo lista ───
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-2 flex items-center gap-1 shrink-0">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t border-b-2 transition-all ${
              category === c.key
                ? "border-[var(--accent)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setCreatingCat(category)}
          className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        >
          + Novo fluxo
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] py-12">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] py-12">
            Nenhum fluxo aqui ainda. Clique em "+ Novo fluxo" pra começar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-[var(--text-primary)] leading-tight">{f.title}</h3>
                  {f.is_seed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--af-teal)] text-white shrink-0">
                      seed
                    </span>
                  )}
                </div>
                {f.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-3">{f.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>
                    {f.nodes.length} etapas · {f.edges.length} conexões
                  </span>
                  {!f.is_seed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(f.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--danger)] hover:underline"
                    >
                      excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {creatingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Novo fluxo</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Categoria: <span className="font-medium">{CATEGORIES.find((c) => c.key === creatingCat)?.label}</span>
            </p>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nome do fluxo"
              className="w-full px-3 py-2 border border-[var(--border)] rounded mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreatingCat(null);
                  setNewTitle("");
                }}
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] disabled:opacity-40"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
