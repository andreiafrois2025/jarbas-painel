"use client";

import { useState, useEffect, useMemo } from "react";
import type { Agent, SubLink, Category } from "@/lib/types";
import { CONTEXTS } from "@/lib/types";

// =============================================
// Modal de gerenciamento de Setores e Agentes
// Filtro por aba + criar, renomear, excluir setores
// + editar agentes (nome, função, sub_links)
// =============================================

interface CategoryModalProps {
  categories: Category[];
  agents: Agent[];
  editCategory?: Category | null;
  defaultContext?: string;
  onAddCategory: (name: string, context?: string) => Promise<void>;
  onRenameCategory: (id: string, newName: string, oldName: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onMoveAgent: (agentId: string, newCategory: string) => Promise<void>;
  onEditAgent?: (agent: Agent, updates: Partial<Agent>) => Promise<void>;
  onDeleteAgent?: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function CategoryModal({
  categories,
  agents,
  editCategory,
  defaultContext = "IGAM",
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveAgent,
  onEditAgent,
  onDeleteAgent,
  onClose,
}: CategoryModalProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit" | "editAgent">(editCategory ? "edit" : "list");
  const [name, setName] = useState(editCategory?.name || "");
  const [newContext, setNewContext] = useState(defaultContext);
  const [filterContext, setFilterContext] = useState(defaultContext);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(editCategory || null);
  const [saving, setSaving] = useState(false);

  // Estado de edição de agente
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentTool, setAgentTool] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentLink, setAgentLink] = useState("");
  const [agentSubLinks, setAgentSubLinks] = useState<SubLink[]>([]);

  useEffect(() => {
    if (editCategory) {
      setMode("edit");
      setName(editCategory.name);
      setSelectedCategory(editCategory);
      setFilterContext(editCategory.context || defaultContext);
    }
  }, [editCategory, defaultContext]);

  // Filtrar categorias pela aba selecionada
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => (c.context || "IGAM") === filterContext);
  }, [categories, filterContext]);

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
      await onAddCategory(name.trim(), newContext);
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

  // Abrir edição do agente
  const openEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentName(agent.agent_name || "");
    setAgentTool(agent.name);
    setAgentDesc(agent.description || "");
    setAgentLink(agent.link);
    setAgentSubLinks(agent.sub_links || []);
    setMode("editAgent");
  };

  const handleSaveAgent = async () => {
    if (!editingAgent || !onEditAgent || saving) return;
    setSaving(true);
    try {
      await onEditAgent(editingAgent, {
        agent_name: agentName,
        name: agentTool,
        description: agentDesc,
        link: agentLink,
        sub_links: agentSubLinks.filter(sl => sl.label && sl.url),
      });
      setMode("edit");
      setEditingAgent(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!editingAgent || !onDeleteAgent) return;
    if (!confirm(`Excluir agente "${editingAgent.agent_name || editingAgent.name}"?`)) return;
    setSaving(true);
    try {
      await onDeleteAgent(editingAgent.id);
      setMode("edit");
      setEditingAgent(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] z-50 flex flex-col">
      {/* Header fixo */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
          >
            ← Voltar ao Escritório
          </button>
          <h2 className="text-xl font-bold">
            {mode === "create" ? "Novo Setor" : mode === "edit" ? "Editar Setor" : mode === "editAgent" ? "Editar Colaborador" : "⚙️ Configurações"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-all"
        >✕</button>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* ===== LISTA DE SETORES ===== */}
          {mode === "list" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Selecione a aba para ver setores e agentes.
              </p>

              {/* Filtro por aba */}
              <div className="flex gap-1.5 mb-3">
                {CONTEXTS.map((ctx) => {
                  const count = categories.filter((c) => (c.context || "IGAM") === ctx).length;
                  return (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => setFilterContext(ctx)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        filterContext === ctx
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                      }`}
                    >
                      {ctx}
                      <span className="ml-1 opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Setores da aba selecionada */}
              <div className="space-y-2">
                {filteredCategories.map((cat) => {
                  const catAgents = agents.filter((a) => a.category === cat.name);
                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-light)] transition-all"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{cat.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {catAgents.length} {catAgents.length === 1 ? "agente" : "agentes"}
                          </div>
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

                      {/* Lista de agentes expandida */}
                      {catAgents.length > 0 && (
                        <div className="border-t border-[var(--border)] px-3 py-2 space-y-1">
                          {catAgents.map((agent) => (
                            <div
                              key={agent.id}
                              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all group"
                            >
                              <span className="text-sm">{agent.icon || "⚡"}</span>
                              <span className="flex-1 text-xs font-medium">{agent.agent_name || agent.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{agent.name}</span>
                              {agent.sub_links && agent.sub_links.length > 0 && (
                                <span className="text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] px-1.5 py-0.5 rounded">
                                  {agent.sub_links.length} funções
                                </span>
                              )}
                              <button
                                onClick={() => openEditAgent(agent)}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                              >
                                ✏️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredCategories.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] py-6">
                  Nenhum setor em {filterContext}
                </p>
              )}

              {/* Botão criar novo */}
              <button
                onClick={() => { setMode("create"); setName(""); setNewContext(filterContext); }}
                className="btn-primary w-full mt-2"
              >
                + Criar Setor em {filterContext}
              </button>
            </div>
          )}

          {/* ===== CRIAR SETOR ===== */}
          {mode === "create" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Aba</label>
                <select
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  className="input-modern cursor-pointer"
                >
                  {CONTEXTS.map((ctx) => (
                    <option key={ctx} value={ctx}>{ctx}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome da sala</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  className="input-modern"
                  placeholder="Ex: Geoprocessamento, Produção..."
                  autoFocus
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                A sala aparecerá no escritório da aba <strong>{newContext}</strong>.
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
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Aba: <strong>{selectedCategory.context || "IGAM"}</strong>
                </div>
              </div>

              {/* Agentes neste setor */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Agentes neste setor ({agentsInSelected.length})
                </label>
                {agentsInSelected.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {agentsInSelected.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm group"
                      >
                        <span>{agent.icon || "⚡"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">{agent.agent_name || agent.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {agent.name}
                            {agent.description ? ` · ${agent.description}` : ""}
                            {agent.sub_links && agent.sub_links.length > 0 ? ` · ${agent.sub_links.length} funções` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => openEditAgent(agent)}
                          className="text-xs text-[var(--accent)] hover:underline cursor-pointer px-2 py-1 rounded hover:bg-[var(--bg-tertiary)]"
                        >
                          Editar
                        </button>
                        <select
                          className="text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text-secondary)] cursor-pointer"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleMoveAgent(agent.id, e.target.value);
                          }}
                        >
                          <option value="">Mover...</option>
                          {categories
                            .filter((c) => c.id !== selectedCategory.id)
                            .map((c) => (
                              <option key={c.id} value={c.name}>{c.context} › {c.name}</option>
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

          {/* ===== EDITAR AGENTE ===== */}
          {mode === "editAgent" && editingAgent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                <span className="text-2xl">{editingAgent.icon || "⚡"}</span>
                <div>
                  <div className="font-medium">{editingAgent.agent_name || editingAgent.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{editingAgent.category}</div>
                </div>
              </div>

              {/* Nome do agente */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  Nome do agente <span className="text-[var(--text-muted)]">(acima da cabeça)</span>
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="input-modern"
                  placeholder="Ex: Ana, Jarvis..."
                />
              </div>

              {/* IA/Ferramenta */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  IA / Ferramenta <span className="text-[var(--text-muted)]">(plaquinha da mesa)</span>
                </label>
                <input
                  type="text"
                  value={agentTool}
                  onChange={(e) => setAgentTool(e.target.value)}
                  className="input-modern"
                  placeholder="Ex: ChatGPT, Claude..."
                />
              </div>

              {/* Função/Descrição */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  Função <span className="text-[var(--text-muted)]">(descrição curta)</span>
                </label>
                <input
                  type="text"
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  className="input-modern"
                  placeholder="Ex: Chat, Imagem, RH..."
                />
              </div>

              {/* Link principal */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Link principal</label>
                <input
                  type="url"
                  value={agentLink}
                  onChange={(e) => setAgentLink(e.target.value)}
                  className="input-modern"
                  placeholder="https://..."
                />
              </div>

              {/* Sub-links (funções extras) */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  Funções extras <span className="text-[var(--text-muted)]">(botões abaixo da mesa)</span>
                </label>
                <p className="text-[10px] text-[var(--text-muted)] mb-2">
                  Cada função vira um botão clicável no escritório. Ex: Ana com 3 GPTs diferentes.
                </p>
                {agentSubLinks.map((sl, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={sl.label}
                      onChange={(e) => {
                        const updated = [...agentSubLinks];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setAgentSubLinks(updated);
                      }}
                      className="input-modern flex-1"
                      placeholder="Nome"
                    />
                    <input
                      type="url"
                      value={sl.url}
                      onChange={(e) => {
                        const updated = [...agentSubLinks];
                        updated[idx] = { ...updated[idx], url: e.target.value };
                        setAgentSubLinks(updated);
                      }}
                      className="input-modern flex-[2]"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => setAgentSubLinks(agentSubLinks.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 px-2 cursor-pointer"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAgentSubLinks([...agentSubLinks, { label: "", url: "" }])}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  + Adicionar função extra
                </button>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => { setMode("edit"); setEditingAgent(null); }}
                  className="btn-secondary flex-1"
                >
                  Voltar
                </button>
                <button
                  onClick={handleDeleteAgent}
                  disabled={saving}
                  className="px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/20 disabled:opacity-50"
                >
                  Excluir
                </button>
                <button
                  onClick={handleSaveAgent}
                  disabled={saving || !agentTool}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Agente"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Note: closing </div> matches the new full-page layout
