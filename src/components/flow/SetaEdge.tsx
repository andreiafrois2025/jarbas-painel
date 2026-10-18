"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

// =============================================
// A seta do mapa (v3.2, 18/10/2026).
//  - traço igual em todo o mapa: contínua = caminho normal; pontilhada animada = RETORNO
//  - o rótulo é uma plaquinha HTML (EdgeLabelRenderer), desenhada por cima de TODAS as linhas:
//    fundo opaco, borda fina e respiro em volta, para nenhuma linha passar por cima do texto
//  - clicar na plaquinha seleciona a seta (como clicar na linha)
// =============================================

export const edgeTypes = { seta: SetaEdge };

function SetaEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, label, selected, interactionWidth, pathOptions, data } = props;
  const [caminho, lx, ly] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    borderRadius: 10,
    offset: (pathOptions as { offset?: number } | undefined)?.offset ?? 24,
  });
  const retorno = !!(data as { isReturn?: boolean } | undefined)?.isReturn;
  const texto = typeof label === "string" ? label : "";
  const cor = (style?.stroke as string) || "#5A6B6B";

  return (
    <>
      <BaseEdge id={id} path={caminho} style={{ ...style, strokeWidth: selected ? 2.6 : style?.strokeWidth }} markerEnd={markerEnd} interactionWidth={interactionWidth ?? 24} />
      {texto && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            title={retorno ? `${texto} (volta para uma etapa anterior)` : texto}
            onClick={(e) => {
              e.stopPropagation();
              // reaproveita o clique da própria linha: quem escuta a seleção é o React Flow
              document.querySelector(`.react-flow__edge[data-id="${CSS.escape(id)}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              pointerEvents: "all",
              cursor: "pointer",
              zIndex: 1000,
              background: "#FFF9C4",
              border: `1px solid ${selected ? cor : "#D9C766"}`,
              borderRadius: 6,
              padding: "3px 9px",
              fontFamily: '"Kalam", "Comic Sans MS", cursive',
              fontSize: 12,
              lineHeight: 1.15,
              fontWeight: 600,
              color: "#2D3B3B",
              whiteSpace: "nowrap",
              boxShadow: "0 0 0 3px #F5F0EA",
            }}
          >
            {texto}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
