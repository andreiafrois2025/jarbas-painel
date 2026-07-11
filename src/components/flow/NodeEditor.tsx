"use client";

import { useEffect, useState } from "react";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// Painel lateral: edita nome/ícone/tipo/executor/detalhes/tags de um node.
// Chama onChange no blur de cada campo.
// =============================================

interface NodeLike {
  id: string;
  data: {
    label?: string;
    details?: string;
    icon?: string;
    executor?: string;
    tags?: string[];
    _flowType?: FlowDocNode["type"];
  };
}

interface Props {
  node: NodeLike;
  onChange: (
    updates: Partial<FlowDocNode["data"]> & { _flowType?: FlowDocNode["type"] },
  ) => void;
  onDelete: () => void;
  onClose: () => void;
}

const TYPES: { key: FlowDocNode["type"]; label: string; icon: string }[] = [
  { key: "start", label: "Início", icon: "⭕" },
  { key: "action", label: "Ação", icon: "▭" },
  { key: "condition", label: "Decisão", icon: "◆" },
  { key: "note", label: "Nota", icon: "📝" },
  { key: "end", label: "Fim", icon: "🎯" },
];

export default function NodeEditor({ node, onChange, onDelete, onClose }: Props) {
  const d = node.data || {};
  const [label, setLabel] = useState(d.label || "");
  const [icon, setIcon] = useState(d.icon || "");
  const [executor, setExecutor] = useState(d.executor || "");
  const [details, setDetails] = useState(d.details || "");
  const [tagsText, setTagsText] = useState((d.tags || []).join(", "));
  const [type, setType] = useState<FlowDocNode["type"]>(d._flowType || "action");

  useEffect(() => {
    setLabel(d.label || "");
    setIcon(d.icon || "");
    setExecutor(d.executor || "");
    setDetails(d.details || "");
    setTagsText((d.tags || []).join(", "));
    setType(d._flowType || "action");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const commit = (overrides: Partial<FlowDocNode["data"]> & { _flowType?: FlowDocNode["type"] } = {}) => {
    onChange({
      label: label || "sem título",
      icon: icon || undefined,
      executor: executor || undefined,
      details: details || undefined,
      tags: tagsText.trim()
        ? tagsText.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      _flowType: type,
      ...overrides,
    });
  };

  return (
    <div className="absolute top-3 right-3 w-80 bg-white border border-[var(--border)] rounded-lg shadow-xl p-3 text-sm z-30 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Editar node</h3>
        <button
          onClick={onClose}
          className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      <div className="mb-3">
        <div className="text-[11px] text-[var(--text-secondary)] font-medium mb-1">Tipo</div>
        <div className="grid grid-cols-5 gap-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setType(t.key);
                commit({ _flowType: t.key });
              }}
              className={`text-xs py-1.5 rounded border transition-colors ${
                type === t.key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold"
                  : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              }`}
              title={t.label}
            >
              <div className="text-sm">{t.icon}</div>
              <div className="text-[9px]">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <label className="block mb-2">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">Nome</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => commit()}
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5"
        />
      </label>

      <label className="block mb-2">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">Ícone (emoji)</span>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          onBlur={() => commit()}
          placeholder="ex.: 📰 🤖 📞"
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5"
        />
      </label>

      <label className="block mb-2">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">Executor</span>
        <input
          type="text"
          value={executor}
          onChange={(e) => setExecutor(e.target.value)}
          onBlur={() => commit()}
          placeholder="ex.: Mike, Donna, cron, você"
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5"
        />
      </label>

      <label className="block mb-2">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">Detalhes</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          onBlur={() => commit()}
          rows={4}
          placeholder="O que exatamente acontece nessa etapa"
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5 resize-y"
        />
      </label>

      <label className="block mb-3">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
          Tags (separadas por vírgula)
        </span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          onBlur={() => commit()}
          placeholder="ex.: manhã, cron, prioridade"
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5"
        />
      </label>

      <button
        onClick={onDelete}
        className="w-full text-xs py-1.5 rounded border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors"
      >
        🗑 Excluir node
      </button>
    </div>
  );
}
