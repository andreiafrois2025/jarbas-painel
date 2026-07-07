"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RoughNode from "./RoughNode";
import type { FlowDoc, FlowDocNode, FlowDocEdge } from "@/lib/types";

// =============================================
// Editor visual — recebe um FlowDoc, mostra o canvas.
// Se readOnly (fluxo seed), só mostra. Senão, permite editar.
// =============================================

interface Props {
  flow: FlowDoc;
  readOnly?: boolean;
  onChange?: (updates: { nodes: FlowDocNode[]; edges: FlowDocEdge[] }) => void;
}

function toRFNodes(nodes: FlowDocNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "rough",
    position: n.position,
    data: { ...n.data, _flowType: n.type },
  }));
}

function toRFEdges(edges: FlowDocEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: !!e.isReturn,
    style: e.isReturn
      ? { stroke: "#A0583C", strokeDasharray: "6 4", strokeWidth: 1.6 }
      : { stroke: "#5A6B6B", strokeWidth: 1.6 },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.isReturn ? "#A0583C" : "#5A6B6B" },
    labelStyle: {
      fontFamily: '"Kalam", "Comic Sans MS", cursive',
      fontSize: 11,
      fill: "#2D3B3B",
    },
    labelBgStyle: { fill: "#FFF9C4", fillOpacity: 0.85 },
    labelBgPadding: [4, 2] as [number, number],
  }));
}

function fromRFNodes(nodes: Node[]): FlowDocNode[] {
  return nodes.map((n) => {
    const data = n.data as { _flowType: FlowDocNode["type"] } & FlowDocNode["data"];
    const { _flowType, ...rest } = data;
    return {
      id: n.id,
      type: _flowType,
      position: n.position,
      data: rest,
    };
  });
}

function fromRFEdges(edges: Edge[]): FlowDocEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
    isReturn: !!e.animated,
  }));
}

function FlowCanvasInner({ flow, readOnly, onChange }: Props) {
  const [nodes, setNodes] = useState<Node[]>(toRFNodes(flow.nodes));
  const [edges, setEdges] = useState<Edge[]>(toRFEdges(flow.edges));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    setNodes(toRFNodes(flow.nodes));
    setEdges(toRFEdges(flow.edges));
  }, [flow.id]); // troca de fluxo

  const nodeTypes = useMemo(() => ({ rough: RoughNode }), []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((ns) => {
        const next = applyNodeChanges(changes, ns);
        onChange?.({ nodes: fromRFNodes(next), edges: fromRFEdges(edges) });
        return next;
      });
    },
    [edges, onChange, readOnly],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((es) => {
        const next = applyEdgeChanges(changes, es);
        onChange?.({ nodes: fromRFNodes(nodes), edges: fromRFEdges(next) });
        return next;
      });
    },
    [nodes, onChange, readOnly],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((es) => {
        const next = addEdge(
          { ...params, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } },
          es,
        );
        onChange?.({ nodes: fromRFNodes(nodes), edges: fromRFEdges(next) });
        return next;
      });
    },
    [nodes, onChange, readOnly],
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNode(node)}
        onPaneClick={() => setSelectedNode(null)}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        style={{ background: "#F5F0EA" }}
      >
        <Background gap={20} color="#D8D0C8" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const t = (n.data as { _flowType?: string })._flowType;
            if (t === "start") return "#D4E8E8";
            if (t === "condition") return "#F5E6C8";
            if (t === "note") return "#FFF9C4";
            if (t === "end") return "#F0D4C4";
            return "#FFFFFF";
          }}
          maskColor="rgba(245, 240, 234, 0.6)"
        />
      </ReactFlow>

      {selectedNode && (
        <div className="absolute top-3 right-3 w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg p-3 text-sm z-20">
          <div className="flex items-start gap-2 mb-1">
            {(selectedNode.data as { icon?: string }).icon && (
              <span className="text-lg leading-none">{(selectedNode.data as { icon: string }).icon}</span>
            )}
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">
                {(selectedNode.data as { label: string }).label}
              </div>
              {(selectedNode.data as { executor?: string }).executor && (
                <div className="text-[11px] text-[var(--text-muted)] italic">
                  {(selectedNode.data as { executor: string }).executor}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>
          {(selectedNode.data as { details?: string }).details && (
            <p className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap mt-2">
              {(selectedNode.data as { details: string }).details}
            </p>
          )}
          {(selectedNode.data as { tags?: string[] }).tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(selectedNode.data as { tags: string[] }).tags!.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
