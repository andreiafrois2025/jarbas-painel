"use client";

import { useEffect, useState, useCallback } from "react";
import type { FlowDoc, FlowCategory, FlowColumn } from "@/lib/types";
import {
  getFlowColumns, addFlowColumn, updateFlowColumn, deleteFlowColumn, updateFlowDoc,
} from "@/lib/storage";

/**
 * Kanban interno por categoria de fluxo.
 * - Colunas gerenciáveis: adicionar, renomear, excluir, reordenar.
 * - Cards podem ser arrastados entre colunas → altera `kanban_column` do fluxo.
 * - Coluna "Sem coluna" agrupa fluxos sem `kanban_column`.
 */
export default function FlowKanban({
  flows,
  category,
  onSelectFlow,
  onDeleteFlow,
  onCreateInColumn,
  onFlowsChanged,
}: {
  flows: FlowDoc[];
  category: FlowCategory;
  onSelectFlow: (id: string) => void;
  onDeleteFlow: (id: string) => void;
  onCreateInColumn: (columnName: string | null) => void;
  onFlowsChanged: () => Promise<void>;
}) {
  const [columns, setColumns] = useState<FlowColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const loadColumns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getFlowColumns(category);
      setColumns(list);
    } catch (e) {
      console.error("Erro colunas:", e);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await addFlowColumn({ category, name: newColName.trim(), order: columns.length });
      setNewColName("");
      setAddingCol(false);
      await loadColumns();
    } catch (e) {
      console.error("Erro ao criar coluna:", e);
      alert(`Erro ao criar coluna: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    const oldName = columns.find((c) => c.id === id)?.name;
    await updateFlowColumn(id, { name: renameValue.trim() });
    // Renomeia a coluna nos fluxos que apontam pra ela
    if (oldName) {
      const affected = flows.filter((f) => f.kanban_column === oldName);
      await Promise.all(affected.map((f) => updateFlowDoc(f.id, { kanban_column: renameValue.trim() })));
    }
    setRenamingId(null);
    setRenameValue("");
    await loadColumns();
    await onFlowsChanged();
  };

  const handleDeleteColumn = async (id: string, name: string) => {
    if (!confirm(`Excluir a coluna "${name}"? Os fluxos ficarão sem coluna.`)) return;
    await deleteFlowColumn(id);
    // Zera kanban_column dos fluxos afetados
    const affected = flows.filter((f) => f.kanban_column === name);
    await Promise.all(affected.map((f) => updateFlowDoc(f.id, { kanban_column: null })));
    await loadColumns();
    await onFlowsChanged();
  };

  const moveColumn = async (id: string, direction: -1 | 1) => {
    const idx = columns.findIndex((c) => c.id === id);
    const target = idx + direction;
    if (target < 0 || target >= columns.length) return;
    const a = columns[idx], b = columns[target];
    await Promise.all([
      updateFlowColumn(a.id, { order: b.order }),
      updateFlowColumn(b.id, { order: a.order }),
    ]);
    await loadColumns();
  };

  const handleDrop = async (targetCol: string | null, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
    const flowId = e.dataTransfer.getData("text/flow-id");
    if (!flowId) return;
    const f = flows.find((x) => x.id === flowId);
    if (!f || f.kanban_column === targetCol) return;
    await updateFlowDoc(flowId, { kanban_column: targetCol });
    await onFlowsChanged();
  };

  const columnsToRender: { key: string; name: string; id: string | null }[] = [
    ...columns.map((c) => ({ key: c.id, name: c.name, id: c.id })),
    { key: "__none__", name: "Sem coluna", id: null },
  ];

  const flowsInColumn = (name: string, id: string | null) => {
    if (id === null) {
      // Coluna "Sem coluna": pega fluxos cujo kanban_column é null/vazio OU não bate com nenhuma coluna existente
      const validNames = new Set(columns.map((c) => c.name));
      return flows.filter((f) => !f.kanban_column || !validNames.has(f.kanban_column));
    }
    return flows.filter((f) => f.kanban_column === name);
  };

  if (loading) {
    return <div className="text-center text-[var(--text-muted)] py-12">Carregando colunas…</div>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 h-full">
      {columnsToRender.map((col, colIdx) => {
        const items = flowsInColumn(col.name, col.id);
        const isDropTarget = dragOverCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(col.id ? col.name : null, e)}
            className={`shrink-0 w-72 bg-[var(--bg-tertiary)] rounded-lg border ${
              isDropTarget ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40" : "border-[var(--border)]"
            } flex flex-col max-h-full`}
          >
            <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
              {renamingId === col.id ? (
                <>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(col.id!);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--bg-secondary)]"
                  />
                  <button onClick={() => handleRename(col.id!)} className="text-xs text-[var(--accent)]">
                    ok
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold flex-1 truncate">
                    {col.name}{" "}
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">({items.length})</span>
                  </h3>
                  {col.id && (
                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                      <button
                        title="Mover pra esquerda"
                        onClick={() => moveColumn(col.id!, -1)}
                        disabled={colIdx === 0}
                        className="text-xs hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        title="Mover pra direita"
                        onClick={() => moveColumn(col.id!, 1)}
                        disabled={colIdx >= columns.length - 1}
                        className="text-xs hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        title="Renomear"
                        onClick={() => {
                          setRenamingId(col.id);
                          setRenameValue(col.name);
                        }}
                        className="text-xs hover:text-[var(--text-primary)]"
                      >
                        ✎
                      </button>
                      <button
                        title="Excluir coluna"
                        onClick={() => handleDeleteColumn(col.id!, col.name)}
                        className="text-xs hover:text-[var(--danger)]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
              {items.length === 0 && (
                <div className="text-center text-[10px] text-[var(--text-muted)] py-4">
                  arraste um card aqui
                </div>
              )}
              {items.map((f) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/flow-id", f.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onSelectFlow(f.id)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-2 cursor-pointer hover:border-[var(--accent)] group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold leading-tight flex-1">{f.title}</h4>
                    {f.is_seed && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--af-teal)] text-white shrink-0">
                        seed
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1">{f.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
                    <span>
                      {f.nodes.length} etapas · {f.edges.length} conexões
                    </span>
                    {!f.is_seed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFlow(f.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[var(--danger)] hover:underline"
                      >
                        excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[var(--border)]">
              <button
                onClick={() => onCreateInColumn(col.id ? col.name : null)}
                className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1"
              >
                + Novo fluxo
              </button>
            </div>
          </div>
        );
      })}

      {/* Botão de adicionar nova coluna */}
      <div className="shrink-0 w-72">
        {addingCol ? (
          <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)] p-3">
            <input
              autoFocus
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") setAddingCol(false);
              }}
              placeholder="Nome da coluna"
              className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--bg-secondary)] mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddColumn}
                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white flex-1"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setAddingCol(false);
                  setNewColName("");
                }}
                className="text-xs px-2 py-1 text-[var(--text-secondary)]"
              >
                cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="w-full h-12 border border-dashed border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            + Adicionar coluna
          </button>
        )}
      </div>
    </div>
  );
}
