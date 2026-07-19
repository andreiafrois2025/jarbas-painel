"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// Nodes desenhados à mão (estilo excalidraw) usando rough.js.
// 4 handles em cada lado — com connectionMode="loose" no ReactFlow,
// qualquer handle serve como source ou target.
// Se rough.js falhar em runtime, faz fallback pra retângulo/círculo CSS puro.
// =============================================

type NodeShape = "circle" | "rectangle" | "diamond" | "note" | "endCircle";

const SHAPE_BY_TYPE: Record<FlowDocNode["type"], NodeShape> = {
  start: "circle",
  action: "rectangle",
  condition: "diamond",
  note: "note",
  end: "endCircle",
};

const FILL_BY_TYPE: Record<FlowDocNode["type"], string> = {
  start: "#D4E8E8",
  action: "#FFFFFF",
  condition: "#F5E6C8",
  note: "#FFF9C4",
  end: "#F0D4C4",
};

const STROKE_BY_TYPE: Record<FlowDocNode["type"], string> = {
  start: "#2D6B6B",
  action: "#5A6B6B",
  condition: "#C4A460",
  note: "#C4A460",
  end: "#A0583C",
};

const TYPE_LABEL: Record<FlowDocNode["type"], string> = {
  start: "início",
  action: "ação",
  condition: "decisão",
  note: "nota",
  end: "fim",
};

interface RoughData extends Record<string, unknown> {
  label?: string;
  details?: string;
  icon?: string;
  executor?: string;
  tags?: string[];
  _flowType?: FlowDocNode["type"];
}

function stringSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

interface Props {
  id: string;
  data: RoughData;
  selected?: boolean;
}

export default function RoughNode({ id, data, selected }: Props) {
  const d = data || {};
  const type = (d._flowType || "action") as FlowDocNode["type"];
  const shape = SHAPE_BY_TYPE[type] || "rectangle";
  const fill = FILL_BY_TYPE[type] || "#FFFFFF";
  const stroke = STROKE_BY_TYPE[type] || "#5A6B6B";

  const svgRef = useRef<SVGSVGElement>(null);
  const [roughFailed, setRoughFailed] = useState(false);

  const width = shape === "circle" || shape === "endCircle" ? 140 : shape === "diamond" ? 210 : 240;
  const height = shape === "circle" || shape === "endCircle" ? 140 : shape === "diamond" ? 130 : 110;

  const seed = useMemo(() => stringSeed(id), [id]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    (async () => {
      try {
        const roughMod: { default?: unknown; svg?: unknown } = await import("roughjs");
        const rough = (roughMod.default ?? roughMod) as {
          svg: (el: SVGSVGElement) => {
            ellipse: (x: number, y: number, w: number, h: number, opts: object) => SVGElement;
            rectangle: (x: number, y: number, w: number, h: number, opts: object) => SVGElement;
            polygon: (pts: [number, number][], opts: object) => SVGElement;
            path: (d: string, opts: object) => SVGElement;
          };
        };
        if (!rough?.svg) throw new Error("rough.svg missing");

        svg.innerHTML = "";
        const rc = rough.svg(svg);
        const opts = {
          roughness: 1.6,
          strokeWidth: selected ? 2.5 : 1.8,
          fill,
          fillStyle: "solid" as const,
          stroke,
          seed,
        };
        let el: SVGElement | null = null;
        if (shape === "circle") {
          el = rc.ellipse(width / 2, height / 2, width - 12, height - 12, opts);
        } else if (shape === "endCircle") {
          const outer = rc.ellipse(width / 2, height / 2, width - 6, height - 6, { ...opts, fill: "none" });
          const inner = rc.ellipse(width / 2, height / 2, width - 22, height - 22, opts);
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.appendChild(outer);
          g.appendChild(inner);
          el = g;
        } else if (shape === "rectangle") {
          el = rc.rectangle(6, 6, width - 12, height - 12, opts);
        } else if (shape === "diamond") {
          const cx = width / 2, cy = height / 2;
          el = rc.polygon(
            [
              [cx, 6],
              [width - 6, cy],
              [cx, height - 6],
              [6, cy],
            ],
            opts,
          );
        } else if (shape === "note") {
          const path = `M 6 6 L ${width - 26} 6 L ${width - 6} 26 L ${width - 6} ${height - 6} L 6 ${height - 6} Z`;
          const first = rc.path(path, opts);
          const fold = rc.path(`M ${width - 26} 6 L ${width - 26} 26 L ${width - 6} 26`, { ...opts, fill: "none" });
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.appendChild(first);
          g.appendChild(fold);
          el = g;
        }
        if (el) svg.appendChild(el);
      } catch (err) {
        console.warn("[FlowNode] rough.js falhou, usando fallback CSS:", err);
        setRoughFailed(true);
      }
    })();
  }, [shape, fill, stroke, seed, selected, width, height]);

  const fallbackStyle: React.CSSProperties = roughFailed
    ? {
        background: fill,
        border: `${selected ? 2.5 : 1.8}px solid ${stroke}`,
        borderRadius: shape === "circle" || shape === "endCircle" ? "50%" : shape === "diamond" ? 0 : 8,
        boxShadow: shape === "endCircle" ? `inset 0 0 0 3px ${fill}, inset 0 0 0 5px ${stroke}` : undefined,
      }
    : {};

  const handleStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    background: "#FFFFFF",
    border: `2px solid ${stroke}`,
    borderRadius: "50%",
    zIndex: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  };

  return (
    <div
      className="relative"
      style={{ width, height, ...fallbackStyle }}
      title={d.details || d.label || ""}
    >
      {!roughFailed && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 8,
          fontSize: 9,
          color: stroke,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          opacity: 0.55,
          fontWeight: 600,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {TYPE_LABEL[type]}
      </div>
      <div
        className="relative z-10 flex flex-col items-center justify-center h-full px-3 text-center"
        style={{ fontFamily: 'var(--font-kalam), "Comic Sans MS", cursive', color: "#2D3B3B" }}
      >
        {d.icon && <span className="text-xl leading-none mb-1">{d.icon}</span>}
        <span className="text-[13px] leading-tight font-semibold">{d.label || "sem título"}</span>
        {d.executor && (
          <span className="text-[10px] mt-1 opacity-70 italic">{d.executor}</span>
        )}
      </div>

      {/* Handles em todas as 4 direções — connectionMode="loose" torna cada um source+target */}
      <Handle id="left" type="source" position={Position.Left} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle} />
      <Handle id="top" type="source" position={Position.Top} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}
