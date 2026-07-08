"use client";

import type { FlowDocNode } from "@/lib/types";

// =============================================
// Barra flutuante no topo do canvas: adicionar nodes + abrir legenda.
// =============================================

interface Props {
  onAdd: (type: FlowDocNode["type"]) => void;
  onToggleLegend: () => void;
}

const NODE_TYPES: { type: FlowDocNode["type"]; label: string; icon: string }[] = [
  { type: "start", label: "Início", icon: "⭕" },
  { type: "action", label: "Ação", icon: "▭" },
  { type: "condition", label: "Decisão", icon: "◆" },
  { type: "note", label: "Nota", icon: "📝" },
  { type: "end", label: "Fim", icon: "🎯" },
];

export default function FlowToolbar({ onAdd, onToggleLegend }: Props) {
  return (
    <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1 bg-white border border-[var(--border)] rounded-lg shadow-lg p-1">
      <span className="text-[10px] text-[var(--text-muted)] px-2 py-1 flex items-center uppercase tracking-wide">
        + adicionar
      </span>
      {NODE_TYPES.map((n) => (
        <button
          key={n.type}
          onClick={() => onAdd(n.type)}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          title={`Adicionar ${n.label}`}
        >
          <span>{n.icon}</span>
          <span>{n.label}</span>
        </button>
      ))}
      <div className="w-px bg-[var(--border)] mx-1" />
      <button
        onClick={onToggleLegend}
        className="text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
        title="Ver legenda"
      >
        ❓ Legenda
      </button>
    </div>
  );
}
