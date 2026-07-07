"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// Nodes desenhados à mão (estilo excalidraw) usando rough.js.
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

  const width = shape === "circle" || shape === "endCircle" ? 130 : shape === "diamond" ? 200 : 230;
  const height = shape === "circle" || shape === "endCircle" ? 130 : shape === "diamond" ? 120 : 100;

  const seed = useMemo(() => stringSeed(id), [id]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    (async () => {
      try {
        const roughMod: { default?: unknown; svg?: unknown } = await import("roughjs");
        // roughjs pode exportar como default ou como namespace
        const rough = (roughMod.default ?? roughMod) as { svg: (el: SVGSVGElement) => { ellipse: Function; rectangle: Function; polygon: Function; path: Function } };
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

  const showLeftHandle = type !== "start";
  const showRightHandle = type !== "end";
  const showBottomHandle = type === "condition";

  // Fallback CSS puro caso rough.js não carregue
  const fallbackStyle: React.CSSProperties = roughFailed
    ? {
        background: fill,
        border: `${selected ? 2.5 : 1.8}px solid ${stroke}`,
        borderRadius: shape === "circle" || shape === "endCircle" ? "50%" : shape === "diamond" ? 0 : 8,
        transform: shape === "diamond" ? "rotate(0deg)" : undefined,
        boxShadow: shape === "endCircle" ? `inset 0 0 0 3px ${fill}, inset 0 0 0 5px ${stroke}` : undefined,
      }
    : {};

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
        className="relative z-10 flex flex-col items-center justify-center h-full px-3 text-center"
        style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive', color: "#2D3B3B" }}
      >
        {d.icon && <span className="text-xl leading-none mb-1">{d.icon}</span>}
        <span className="text-[13px] leading-tight font-semibold">{d.label || "sem título"}</span>
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
