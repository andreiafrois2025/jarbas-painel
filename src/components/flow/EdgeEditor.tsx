"use client";

import { useEffect, useState } from "react";

// =============================================
// Painel lateral: edita rótulo da seta e marca como "retorno" (loopback animado).
// =============================================

interface EdgeLike {
  id: string;
  label?: string | React.ReactNode;
  animated?: boolean;
}

interface Props {
  edge: EdgeLike;
  onChange: (updates: { label?: string; isReturn?: boolean }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EdgeEditor({ edge, onChange, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(
    typeof edge.label === "string" ? edge.label : "",
  );
  const [isReturn, setIsReturn] = useState(!!edge.animated);

  useEffect(() => {
    setLabel(typeof edge.label === "string" ? edge.label : "");
    setIsReturn(!!edge.animated);
  }, [edge.id, edge.label, edge.animated]);

  const commitLabel = () => {
    onChange({ label: label || undefined, isReturn });
  };

  const toggleReturn = (checked: boolean) => {
    setIsReturn(checked);
    onChange({ label: label || undefined, isReturn: checked });
  };

  return (
    <div className="absolute top-3 right-3 w-80 bg-white border border-[var(--border)] rounded-lg shadow-xl p-3 text-sm z-30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Editar seta</h3>
        <button
          onClick={onClose}
          className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      <label className="block mb-3">
        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
          Rótulo (opcional)
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          placeholder='ex.: "se sim", "aprovado"'
          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-sm mt-0.5"
        />
      </label>

      <label className="flex items-start gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isReturn}
          onChange={(e) => toggleReturn(e.target.checked)}
          className="mt-1"
        />
        <div>
          <div className="font-medium">É retorno / revisão</div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Marca como loopback (pontilhada, laranja, animada). Use quando o fluxo volta pra uma etapa anterior — ex.: revisão pedida.
          </div>
        </div>
      </label>

      <button
        onClick={onDelete}
        className="w-full text-xs py-1.5 rounded border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors"
      >
        🗑 Excluir seta
      </button>
    </div>
  );
}
