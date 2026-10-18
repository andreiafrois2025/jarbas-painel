import { MarkerType, type Edge } from "@xyflow/react";

// Estilo único das setas (editor, radiografia e macro-fluxos):
// SEMPRE pontilhadas e animadas (o "fio de formiguinhas" mostra a direção).
// Verde-petróleo = caminho normal; terracota = volta/retorno.
export function estiloSeta(
  base: { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string },
  isReturn: boolean,
  label?: string,
): Edge {
  const cor = isReturn ? "#A0583C" : "#5A6B6B";
  return {
    ...base,
    type: "smoothstep",
    label,
    animated: true,
    data: { isReturn },
    style: { stroke: cor, strokeDasharray: "6 4", strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: cor },
    labelStyle: { fontFamily: '"Kalam", "Comic Sans MS", cursive', fontSize: 11, fill: "#2D3B3B" },
    labelBgStyle: { fill: "#FFF9C4", fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
  };
}
