import { MarkerType, type Edge } from "@xyflow/react";

// Estilo único das setas (editor, radiografia e macro-fluxos), v3.2:
//  - seta NORMAL: linha CONTÍNUA, sem animação (verde-petróleo);
//  - seta de RETORNO (o fluxo volta para uma etapa anterior): pontilhada e animada (terracota).
// O desenho do rótulo (plaquinha opaca por cima das linhas) está em SetaEdge.tsx.
export function estiloSeta(
  base: { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string },
  isReturn: boolean,
  label?: string,
  offset?: number,
): Edge {
  const cor = isReturn ? "#A0583C" : "#5A6B6B";
  return {
    ...base,
    type: "seta",
    label,
    animated: isReturn,
    data: { isReturn },
    style: isReturn ? { stroke: cor, strokeDasharray: "6 4", strokeWidth: 1.8 } : { stroke: cor, strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: cor },
    ...(offset ? ({ pathOptions: { offset } } as object) : {}),
  };
}
