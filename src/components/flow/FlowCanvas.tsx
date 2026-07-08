"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RoughNode from "./RoughNode";
import FlowToolbar from "./FlowToolbar";
import FlowLegend from "./FlowLegend";
import NodeEditor from "./NodeEditor";
import EdgeEditor from "./EdgeEditor";
import type { FlowDoc, FlowDocNode, FlowDocEdge } from "@/lib/types";

// =============================================
// Editor visual do fluxo. Recebe FlowDoc, mostra canvas com:
//  - toolbar pra adicionar nodes
//  - painel lateral pra editar node ou seta selecionada
//  - legenda flutuante
// Persiste mudanças via onChange sempre que mexe em algo.
// =============================================

interface Props {
  flow: FlowDoc;
  onChange?: (updates: { nodes: FlowDocNode[]; edges: FlowDocEdge[] }) => void;
}

const NEW_NODE_LABELS: Record<FlowDocNode["type"], string> = {
  start: "Início",
  action: "Nova ação",
  condition: "Decisão?",
  note: "Anotação",
  end: "Fim",
};

function styleEdge(
  base: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  },
  isReturn: boolean,
  label?: string,
): Edge {
  return {
    ...base,
    type: "smoothstep",
    label,
    animated: isReturn,
    style: isReturn
      ? { stroke: "#A0583C", strokeDasharray: "6 4", strokeWidth: 1.6 }
      : { stroke: "#5A6B6B", strokeWidth: 1.6 },
    markerEnd: { type: MarkerType.ArrowClosed, color: isReturn ? "#A0583C" : "#5A6B6B" },
    labelStyle: {
      fontFamily: '"Kalam", "Comic Sans MS", cursive',
      fontSize: 11,
      fill: "#2D3B3B",
    },
    labelBgStyle: { fill: "#FFF9C4", fillOpacity: 0.85 },
    labelBgPadding: [4, 2] as [number, number],
  };
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
  return edges.map((e) =>
    styleEdge(
      {
        id: e.id,
        source: e.source,
        target: e.target,
        // Defaults pros seeds antigos (esquerda→direita)
        sourceHandle: e.sourceHandle ?? "right",
        targetHandle: e.targetHandle ?? "left",
      },
      !!e.isReturn,
      e.label,
    ),
  );
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
    sourceHandle: (e.sourceHandle as string | undefined) ?? undefined,
    targetHandle: (e.targetHandle as string | undefined) ?? undefined,
    label: typeof e.label === "string" ? e.label : undefined,
    isReturn: !!e.animated,
  }));
}

function FlowCanvasInner({ flow, onChange }: Props) {
  const [nodes, setNodes] = useState<Node[]>(toRFNodes(flow.nodes));
  const [edges, setEdges] = useState<Edge[]>(toRFEdges(flow.edges));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    setNodes(toRFNodes(flow.nodes || []));
    setEdges(toRFEdges(flow.edges || []));
    setSelectedNode(null);
    setSelectedEdge(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id]);

  const nodeTypes = useMemo(() => ({ rough: RoughNode }), []);

  const persist = useCallback(
    (ns: Node[], es: Edge[]) => {
      onChange?.({ nodes: fromRFNodes(ns), edges: fromRFEdges(es) });
    },
    [onChange],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((ns) => {
        const next = applyNodeChanges(changes, ns);
        persist(next, edges);
        return next;
      });
    },
    [edges, persist],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((es) => {
        const next = applyEdgeChanges(changes, es);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((es) => {
        const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newEdge = styleEdge(
          {
            id,
            source: params.source || "",
            target: params.target || "",
            sourceHandle: params.sourceHandle ?? undefined,
            targetHandle: params.targetHandle ?? undefined,
          },
          false,
          undefined,
        );
        const next = [...es, newEdge];
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  const addNode = useCallback(
    (type: FlowDocNode["type"]) => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNode: Node = {
        id,
        type: "rough",
        position: { x: 260 + Math.random() * 120, y: 240 + Math.random() * 120 },
        data: { _flowType: type, label: NEW_NODE_LABELS[type] },
      };
      setNodes((ns) => {
        const next = [...ns, newNode];
        persist(next, edges);
        return next;
      });
    },
    [edges, persist],
  );

  const updateNodeData = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      setNodes((ns) => {
        const next = ns.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
        );
        // atualiza referência do selectedNode pra refletir mudanças no painel
        setSelectedNode((s) => (s && s.id === nodeId ? next.find((n) => n.id === nodeId) || s : s));
        persist(next, edges);
        return next;
      });
    },
    [edges, persist],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((ns) => {
        const nextN = ns.filter((n) => n.id !== nodeId);
        setEdges((es) => {
          const nextE = es.filter((e) => e.source !== nodeId && e.target !== nodeId);
          persist(nextN, nextE);
          return nextE;
        });
        return nextN;
      });
      setSelectedNode(null);
    },
    [persist],
  );

  const updateEdgeData = useCallback(
    (edgeId: string, updates: { label?: string; isReturn?: boolean }) => {
      setEdges((es) => {
        const next = es.map((e) => {
          if (e.id !== edgeId) return e;
          const isReturn = updates.isReturn !== undefined ? updates.isReturn : !!e.animated;
          const label =
            "label" in updates ? updates.label : typeof e.label === "string" ? e.label : undefined;
          return styleEdge(
            {
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: (e.sourceHandle as string | undefined) ?? undefined,
              targetHandle: (e.targetHandle as string | undefined) ?? undefined,
            },
            isReturn,
            label,
          );
        });
        setSelectedEdge((s) => (s && s.id === edgeId ? next.find((e) => e.id === edgeId) || s : s));
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((es) => {
        const next = es.filter((e) => e.id !== edgeId);
        persist(nodes, next);
        return next;
      });
      setSelectedEdge(null);
    },
    [nodes, persist],
  );

  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <FlowToolbar onAdd={addNode} onToggleLegend={() => setShowLegend((v) => !v)} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodeClick={(_, node) => {
          setSelectedNode(node);
          setSelectedEdge(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdge(edge);
          setSelectedNode(null);
        }}
        onPaneClick={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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
        <NodeEditor
          node={selectedNode as { id: string; data: Record<string, unknown> }}
          onChange={(updates) => updateNodeData(selectedNode.id, updates as Record<string, unknown>)}
          onDelete={() => deleteNode(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {selectedEdge && (
        <EdgeEditor
          edge={selectedEdge}
          onChange={(updates) => updateEdgeData(selectedEdge.id, updates)}
          onDelete={() => deleteEdge(selectedEdge.id)}
          onClose={() => setSelectedEdge(null)}
        />
      )}

      {showLegend && <FlowLegend onClose={() => setShowLegend(false)} />}
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
