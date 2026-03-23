"use client";

import { useState, useEffect, useMemo } from "react";
import type { Agent, Category } from "@/lib/types";

// =============================================
// Modal de gerenciamento de Setores/Categorias
// Criar, renomear, excluir setores
// Mover agentes entre setores
// =============================================

interface CategoryModalProps {
  categories: Category[];
  agents: Agent[];
  editCategory?: Category | null;
  onAddCategory: (name: string) => Promise<void>;
  onRenameCategory: (id: string, newName: string, oldName: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onMoveAgent: (agentId: string, newCategory: string) => Promise<void>;
  onClose: () => void;
}

export default function CategoryModal({
  categories,
  agents,
  editCategory,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveAgent,
  onClose,
}: CategoryModalProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">(editCategory ? "edit" : "list");
  const [name, setName] = useState(editCategory?.name || "");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(editCategory || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editCategory) {
      setMode("edit");
      setName(editCategory.name);
      setSelectedCategory(editCategory);
    }
  }, [editCategory]);

  const agentsInSelected = useMemo(() => {
    if (!selectedCategory) return [];
    return agents.filter((a) => a.category === selectedCategory.name);
  }, [agents, selectedCategory]);

  const otherAgents = useMemo(() => {
    if (!selectedCategory) return [];
    return agents.filter((a) => a.category !== selectedCategory.name);
  }, [agents, selectedCategory]);

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onAddCategory(name.trim());
      setName("");
      setMode("list");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!name.trim() || !selectedCategory || saving) return;
    setSaving(true);
    try {
      await onRenameCategory(selectedCategory.id, name.trim(), selectedCategory.name);
      setMode("list");
      setSelectedCategory(null);
      setName("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory || saving) return;
    const count = agentsInSelected.length;
    const msg = count > 0
      ? `Excluir setor "${selectedCategory.name}"? Os ${count} agentes serão movidos para outro setor.`
      : `Excluir setor "${selectedCategory.name}"?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await onDeleteCategory(selectedCategory.id);
      setSelectedCategory(null);
      setMode("list");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveAgent = async (agentId: string, targetCategory: string) => {
    setSaving(true);
    try {
      await onMoveAgent(agentId, targetCategory);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Novo Setor" : mode === "edit" ? "Editar Setor" : "Gerenciar Setores"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]"
          >×</button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* ===== LISTA DE SETORES ===== */}
          {mode === "list" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Organize seus agentes em setores. Cada setor aparece como uma aba no escritório.
              </p>

              {/* Setores existentes */}
              <div className="space-y-2">
                {categories.map((cat) => {
                  const count = agents.filter((a) => a.category === cat.name).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-light)] transition-all"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{cat.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{count} {count === 1 ? "agente" : "agentes"}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(cat);
                          setName(cat.name);
                          setMode("edit");
                        }}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
                      >
                        Editar
                      </button>
                    </div>
                  );
                })}
              </div>

              {categories.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] py-6">Nenhum setor criado</p>
              )}

              {/* Botão criar novo */}
              <button
                onClick={() => { setMode("create"); setName(""); }}
                className="btn-primary w-full mt-2"
              >
                + Criar Novo Setor
              </button>
            </div>
          )}

          {/* ===== CRIAR SETOR ===== */}
          {mode === "create" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome do setor</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  className="input-modern"
                  placeholder="Ex: Servidora Pública, Marketing, Pessoal..."
                  autoFocus
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Após criar, você pode mover agentes para este setor editando-os ou pelo botão "Editar" do setor.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMode("list")}
                  className="btn-secondary flex-1"
                >Voltar</button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim() || saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? "Criando..." : "Criar Setor"}
                </button>
              </div>
            </div>
          )}

          {/* ===== EDITAR SETOR ===== */}
          {mode === "edit" && selectedCategory && (
            <div className="space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome do setor</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
                    className="input-modern flex-1"
                    autoFocus
                  />
                  {name !== selectedCategory.name && (
                    <button
                      onClick={handleRename}
                      disabled={saving || !name.trim()}
                      className="btn-primary !px-4 disabled:opacity-50"
                    >
                      {saving ? "..." : "Renomear"}
                    </button>
                  )}
                </div>
              </div>

              {/* Agentes neste setor */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Agentes neste setor ({agentsInSelected.length})
                </label>
                {agentsInSelected.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {agentsInSelected.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm"
                      >
                        <span>{agent.icon || "⚡"}</span>
                        <span className="flex-1">{agent.agent_name || agent.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{agent.name}</span>
                        {/* Mover para outro setor */}
                        <select
                          className="text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-secondary)] cursor-pointer"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleMoveAgent(agent.id, e.target.value);
                          }}
                        >
                          <option value="">Mover...</option>
                          {categories
                            .filter((c) => c.id !== selectedCategory.id)
                            .map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] py-3 text-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                    Nenhum agente neste setor
                  </p>
                )}
              </div>

              {/* Adicionar agente de outro setor */}
              {otherAgents.length > 0 && (
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Trazer agente para cá
                  </label>
                  <select
                    className="input-modern cursor-pointer"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleMoveAgent(e.target.value, selectedCategory.name);
                    }}
                  >
                    <option value="">Selecione um agente...</option>
                    {otherAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon || "⚡"} {a.agent_name || a.name} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => { setMode("list"); setSelectedCategory(null); setName(""); }}
                  className="btn-secondary flex-1"
                >
                  Voltar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/20 disabled:opacity-50"
                >
                  Excluir Setor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
