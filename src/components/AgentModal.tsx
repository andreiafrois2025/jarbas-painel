"use client";

import { useState, useEffect, useMemo } from "react";
import { Agent, SubLink, Category, CONTEXTS, DEFAULT_CATEGORIES } from "@/lib/types";

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
    skin_tone: number;
    hair_color: number;
    shirt_color: number;
    has_glasses: boolean;
    sub_links: SubLink[];
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
  const [skinTone, setSkinTone] = useState(0);
  const [hairColor, setHairColor] = useState(0);
  const [shirtColor, setShirtColor] = useState(0);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [subLinks, setSubLinks] = useState<SubLink[]>([]);

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
      setSkinTone(agent.skin_tone ?? 0);
      setHairColor(agent.hair_color ?? 0);
      setShirtColor(agent.shirt_color ?? 0);
      setHasGlasses(agent.has_glasses ?? false);
      setSubLinks(agent.sub_links || []);
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
      skin_tone: skinTone,
      hair_color: hairColor,
      shirt_color: shirtColor,
      has_glasses: hasGlasses,
      sub_links: subLinks.filter(sl => sl.label && sl.url),
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

          {/* === APARÊNCIA DO PERSONAGEM === */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Aparência</label>
            {/* Tom de pele */}
            <div className="mb-3">
              <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Tom de pele</span>
              <div className="flex gap-1.5">
                {["#FDDCB5","#F5D0A9","#EDCAA8","#DBA97B","#C68642","#A0724A"].map((color, i) => (
                  <button key={i} type="button" onClick={() => setSkinTone(i)}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 ${skinTone === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    title={["Claro","Claro médio","Médio","Moreno","Moreno escuro","Negro"][i]}
                  />
                ))}
              </div>
            </div>
            {/* Cor do cabelo */}
            <div className="mb-3">
              <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Cor do cabelo</span>
              <div className="flex gap-1.5 flex-wrap">
                {["#2C1810","#1a1a2e","#5C3317","#8B6914","#A0522D","#4A2800","#6B2D5B","#D4A03C","#C0392B","#E08040"].map((color, i) => (
                  <button key={i} type="button" onClick={() => setHairColor(i)}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-all border-2 ${hairColor === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    title={["Preto","Preto azulado","Castanho escuro","Castanho claro","Marrom","Marrom escuro","Roxo","Loiro","Ruivo","Ruivo claro"][i]}
                  />
                ))}
              </div>
            </div>
            {/* Cor da camisa */}
            <div className="mb-3">
              <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Cor da camisa</span>
              <div className="flex gap-1.5 flex-wrap">
                {["#E74C3C","#4A90D9","#2ECC71","#9B59B6","#F39C12","#1ABC9C","#E67E22","#5DADE2","#FF6B9D","#48C9B0"].map((color, i) => (
                  <button key={i} type="button" onClick={() => setShirtColor(i)}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-all border-2 ${shirtColor === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {/* Óculos */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setHasGlasses(!hasGlasses)}
                className={`w-10 h-6 rounded-full cursor-pointer transition-all relative ${hasGlasses ? "bg-[var(--accent)]" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${hasGlasses ? "left-4" : "left-0.5"}`} />
              </button>
              <span className="text-xs text-[var(--text-muted)]">Usa óculos 👓</span>
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

          {/* === FUNÇÕES EXTRAS (sub-links) === */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Funções extras <span className="text-[var(--text-muted)]">(botões abaixo da mesa)</span>
            </label>
            {subLinks.map((sl, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={sl.label}
                  onChange={(e) => {
                    const updated = [...subLinks];
                    updated[idx] = { ...updated[idx], label: e.target.value };
                    setSubLinks(updated);
                  }}
                  className="input-modern flex-1"
                  placeholder="Nome da função"
                />
                <input
                  type="url"
                  value={sl.url}
                  onChange={(e) => {
                    const updated = [...subLinks];
                    updated[idx] = { ...updated[idx], url: e.target.value };
                    setSubLinks(updated);
                  }}
                  className="input-modern flex-[2]"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => setSubLinks(subLinks.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-300 px-2 cursor-pointer"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSubLinks([...subLinks, { label: "", url: "" }])}
              className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
            >
              + Adicionar função extra
            </button>
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
