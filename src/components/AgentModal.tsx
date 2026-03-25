"use client";

import { useState, useEffect, useMemo } from "react";
import { Agent, Category, CONTEXTS, DEFAULT_CATEGORIES } from "@/lib/types";

// =============================================
// Modal de criação/edição de agente
// Primeiro seleciona a aba, depois o setor
// =============================================

interface AgentModalProps {
  agent?: Agent | null;
  categories?: string[];
  allCategories?: Category[];
  defaultContext?: string;
  onSave: (data: {
    agent_name: string;
    name: string;
    link: string;
    category: string;
    type: "manual" | "automatic";
    icon: string;
    description: string;
    gender: "male" | "female";
  }) => void;
  onClose: () => void;
}

const ICONS = ["🤖", "🧠", "💎", "🎨", "🖼️", "🔍", "👨‍💻", "⚡", "📝", "🎬", "🎵", "📊"];

export default function AgentModal({ agent, categories, allCategories, defaultContext, onSave, onClose }: AgentModalProps) {
  const [agentName, setAgentName] = useState("");
  const [aiTool, setAiTool] = useState("");
  const [link, setLink] = useState("");
  const [selectedContext, setSelectedContext] = useState(defaultContext || "IGAM");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"manual" | "automatic">("manual");
  const [icon, setIcon] = useState("⚡");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Setores filtrados pela aba selecionada (sem duplicatas)
  const filteredSectors = useMemo(() => {
    let names: string[] = [];
    if (allCategories && allCategories.length > 0) {
      names = allCategories
        .filter((c) => (c.context || "IGAM") === selectedContext)
        .map((c) => c.name);
    } else if (categories && categories.length > 0) {
      names = categories;
    } else {
      names = DEFAULT_CATEGORIES.filter((c) => c.context === selectedContext).map((c) => c.name);
    }
    // Remove duplicatas mantendo a ordem
    return [...new Set(names)];
  }, [allCategories, categories, selectedContext]);

  // Quando muda o contexto, selecionar o primeiro setor disponível
  useEffect(() => {
    if (!agent && filteredSectors.length > 0) {
      setCategory(filteredSectors[0]);
    }
  }, [selectedContext, filteredSectors, agent]);

  useEffect(() => {
    if (agent) {
      setAgentName(agent.agent_name || "");
      setAiTool(agent.name);
      setLink(agent.link);
      setCategory(agent.category);
      setType(agent.type);
      setIcon(agent.icon || "⚡");
      setDescription(agent.description || "");
      setGender(agent.gender || "male");
      // Detectar o contexto do agente
      if (allCategories) {
        const cat = allCategories.find((c) => c.name === agent.category);
        if (cat) setSelectedContext(cat.context || "IGAM");
      }
    }
  }, [agent, allCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTool || !link || !category) return;
    onSave({
      agent_name: agentName,
      name: aiTool,
      link,
      category,
      type,
      icon,
      description,
      gender,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {agent ? "Editar Agente" : "Contratar Agente"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Gênero + Ícone */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Gênero</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    gender === "male"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  👨 Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    gender === "female"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  👩 Feminino
                </button>
              </div>
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Ícone</label>
            <div className="flex gap-1.5 flex-wrap">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`text-lg w-9 h-9 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                    icon === i
                      ? "bg-[var(--accent-soft)] border-2 border-[var(--accent)] scale-110"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-light)]"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Nome do agente */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Nome do agente <span className="text-[var(--text-muted)]">(aparece acima da cabeça)</span>
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="input-modern"
              placeholder="Ex: Ana, Jarvis, Dev..."
            />
          </div>

          {/* IA / Ferramenta */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              IA / Ferramenta * <span className="text-[var(--text-muted)]">(plaquinha da mesa)</span>
            </label>
            <input
              type="text"
              value={aiTool}
              onChange={(e) => setAiTool(e.target.value)}
              className="input-modern"
              placeholder="Ex: Claude, ChatGPT, Midjourney..."
              required
            />
          </div>

          {/* Função */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Função <span className="text-[var(--text-muted)]">(descrição curta)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-modern"
              placeholder="Ex: Chat, Imagem, Pesquisa, Código..."
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Link *</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="input-modern"
              placeholder="https://..."
              required
            />
          </div>

          {/* === ABA (Contexto) === */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Aba *</label>
            <div className="flex gap-1.5">
              {CONTEXTS.map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setSelectedContext(ctx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    selectedContext === ctx
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>

          {/* === SETOR (filtrado pela aba) === */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Setor em {selectedContext} *
              </label>
              {filteredSectors.length > 0 ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-modern cursor-pointer"
                >
                  {filteredSectors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[var(--text-muted)] py-3 text-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                  Nenhum setor em {selectedContext}. Crie um setor primeiro.
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Tipo</label>
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => setType("manual")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    type === "manual"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setType("automatic")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    type === "automatic"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!aiTool || !link || !category}
            >
              {agent ? "Salvar" : "Contratar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
