"use client";

import { useEffect, useRef, useMemo } from "react";
import rough from "roughjs";
import { Handle, Position } from "@xyflow/react";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// Nodes desenhados à mão (estilo excalidraw) usando rough.js
// Roda dentro do React Flow — cada tipo tem forma própria.
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
  start: "#D4E8E8",       // verde-água claro
  action: "#FFFFFF",      // branco
  condition: "#F5E6C8",   // amarelo terra
  note: "#FFF9C4",        // post-it amarelo
  end: "#F0D4C4",         // terracota clara
};

const STROKE_BY_TYPE: Record<FlowDocNode["type"], string> = {
  start: "#2D6B6B",
  action: "#5A6B6B",
  condition: "#C4A460",
  note: "#C4A460",
  end: "#A0583C",
};

interface RoughData extends Record<string, unknown> {
  label: string;
  details?: string;
  icon?: string;
  executor?: string;
  tags?: string[];
  _flowType: FlowDocNode["type"];
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
  const d = data;
  const type = d._flowType;
  const shape = SHAPE_BY_TYPE[type];
  const fill = FILL_BY_TYPE[type];
  const stroke = STROKE_BY_TYPE[type];

  const svgRef = useRef<SVGSVGElement>(null);
  const width = shape === "circle" || shape === "endCircle" ? 130 : shape === "diamond" ? 200 : 230;
  const height = shape === "circle" || shape === "endCircle" ? 130 : shape === "diamond" ? 120 : 100;

  const seed = useMemo(() => stringSeed(id), [id]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
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
    let el: SVGGElement | null = null;
    if (shape === "circle") {
      el = rc.ellipse(width / 2, height / 2, width - 12, height - 12, opts);
    } else if (shape === "endCircle") {
      // círculo duplo pra indicar fim
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
      // retângulo com "orelha" dobrada
      const path = `M 6 6 L ${width - 26} 6 L ${width - 6} 26 L ${width - 6} ${height - 6} L 6 ${height - 6} Z`;
      el = rc.path(path, opts);
      const fold = rc.path(`M ${width - 26} 6 L ${width - 26} 26 L ${width - 6} 26`, { ...opts, fill: "none" });
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.appendChild(el);
      g.appendChild(fold);
      el = g;
    }
    if (el) svg.appendChild(el);
  }, [shape, fill, stroke, seed, selected, width, height]);

  const showLeftHandle = type !== "start";
  const showRightHandle = type !== "end";
  const showBottomHandle = type === "condition";

  return (
    <div
      className="relative"
      style={{ width, height }}
      title={d.details || d.label}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      />
      <div
        className="relative z-10 flex flex-col items-center justify-center h-full px-3 text-center"
        style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive', color: "#2D3B3B" }}
      >
        {d.icon && <span className="text-xl leading-none mb-1">{d.icon}</span>}
        <span className="text-[13px] leading-tight font-semibold">{d.label}</span>
        {d.executor && (
          <span className="text-[10px] mt-1 opacity-70 italic">{d.executor}</span>
        )}
      </div>

      {showLeftHandle && (
        <Handle type="target" position={Position.Left} style={{ background: stroke, width: 8, height: 8 }} />
      )}
      {showRightHandle && (
        <Handle type="source" position={Position.Right} style={{ background: stroke, width: 8, height: 8 }} />
      )}
      {showBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: stroke, width: 8, height: 8 }}
        />
      )}
    </div>
  );
}
