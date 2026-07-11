"use client";

import { useEffect, useState } from "react";
import type { FlowDoc, FlowCategory } from "@/lib/types";
import { getFlowDocs, addFlowDoc, deleteFlowDoc, duplicateFlowDoc, updateFlowDoc } from "@/lib/storage";
import FlowCanvas from "./FlowCanvas";
import FlowKanban from "./FlowKanban";
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
  const [creatingInColumn, setCreatingInColumn] = useState<string | null>(null);
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
    // Deep-link: /producao/fluxos?fluxo=<id>&cat=<categoria> sobrevive ao F5
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    if (cat === "automation" || cat === "squad" || cat === "manual") setCategory(cat);
    const fluxo = params.get("fluxo");
    if (fluxo) setSelectedId(fluxo);
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams();
    if (selectedId) params.set("fluxo", selectedId);
    else params.set("cat", category);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedId, category, loading]);

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
    if (creatingInColumn) {
      await updateFlowDoc(f.id, { kanban_column: creatingInColumn });
    }
    setNewTitle("");
    setCreatingCat(null);
    setCreatingInColumn(null);
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
    if (!selected) return;
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
            <span
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--af-teal)] text-white"
              title="Fluxo veio dos seeds do sistema. Pode editar à vontade."
            >
              seed
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
        <div style={{ height: "75vh", minHeight: 500, position: "relative" }}>
          <FlowCanvas flow={selected} onChange={handleCanvasChange} />
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
        <span className="text-[10px] text-[var(--text-muted)]">
          Arraste cards entre colunas · use + em cada coluna
        </span>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] py-12">Carregando…</div>
        ) : (
          <FlowKanban
            flows={filtered}
            category={category}
            onSelectFlow={setSelectedId}
            onDeleteFlow={handleDelete}
            onCreateInColumn={(colName) => {
              setCreatingCat(category);
              setCreatingInColumn(colName);
            }}
            onFlowsChanged={load}
          />
        )}
      </div>

      {creatingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Novo fluxo</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Categoria: <span className="font-medium">{CATEGORIES.find((c) => c.key === creatingCat)?.label}</span>
              {creatingInColumn && (
                <>
                  {" · "}Coluna: <span className="font-medium">{creatingInColumn}</span>
                </>
              )}
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
                  setCreatingInColumn(null);
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
