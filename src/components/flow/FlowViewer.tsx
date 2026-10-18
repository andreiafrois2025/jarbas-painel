"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, useReactFlow,
  applyNodeChanges, applyEdgeChanges, reconnectEdge,
  type Node, type Edge, type NodeChange, type EdgeChange, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RoughNode from "./RoughNode";
import { estiloSeta } from "./estilo";
import { tamanhoDoTipo } from "@/lib/flow/layout";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// O canvas da radiografia (React Flow, o mesmo do editor):
//  - traço rabiscado, cores e setas pontilhadas animadas de sempre
//  - de cima para baixo
//  - arrasta o fundo com a mão (ou o dedo) pra passear, roda/pinça pra zoom
//  - peças e pontas das setas se movem; "Salvar" grava (só nos níveis 2 e 3)
// =============================================

export interface NoVis {
  id: string;
  type: FlowDocNode["type"];
  label: string;
  icon?: string;
  executor?: string;
  details?: string;
  position: { x: number; y: number };
}
export interface SetaVis {
  id: string;
  source: string;
  target: string;
  label?: string;
  isReturn?: boolean;
  sourceHandle?: string;
  targetHandle?: string;
}
export type Selecao = { tipo: "peca" | "seta"; id: string } | null;

interface Props {
  nos: NoVis[];
  setas: SetaVis[];
  selecao: Selecao;
  onSelect: (s: Selecao) => void;
  /** pode gravar posições/ligações (níveis 2 e 3). No Leigo só passeia e arrasta. */
  editavel: boolean;
  salvando?: boolean;
  onSalvar?: (nos: { id: string; x: number; y: number }[], setas: SetaVis[]) => void;
  /** posições "arrumadas" (auto) — o botão Reorganizar volta pra elas */
  posicoesAuto: Record<string, { x: number; y: number }>;
  /** botões extras na barra (ex.: Resumo) */
  extras?: React.ReactNode;
}

const nodeTypes = { rough: RoughNode };

function paraRF(nos: NoVis[]): Node[] {
  return nos.map((n) => ({
    id: n.id,
    type: "rough",
    position: n.position,
    data: { label: n.label, icon: n.icon, executor: n.executor, details: n.details, _flowType: n.type },
  }));
}
function paraRFSetas(setas: SetaVis[]): Edge[] {
  return setas.map((s) =>
    estiloSeta(
      { id: s.id, source: s.source, target: s.target, sourceHandle: s.sourceHandle ?? (s.isReturn ? "right" : "bottom"), targetHandle: s.targetHandle ?? (s.isReturn ? "right" : "top") },
      !!s.isReturn,
      s.label,
    ),
  );
}

function Interno({ nos, setas, selecao, onSelect, editavel, salvando, onSalvar, posicoesAuto, extras }: Props) {
  const [nodes, setNodes] = useState<Node[]>(() => paraRF(nos));
  const [edges, setEdges] = useState<Edge[]>(() => paraRFSetas(setas));
  const [sujo, setSujo] = useState(false);
  const rf = useReactFlow();

  const caixa = useRef<HTMLDivElement>(null);
  const encaixar = useCallback(() => rf.fitView({ padding: 0.18, duration: 350, maxZoom: 1.1 }), [rf]);

  // Abertura: se o desenho inteiro ficaria miúdo demais (fluxo comprido), abre legível,
  // com o começo no topo; ela passeia com a mão. "Encaixar na tela" mostra tudo.
  const abrir = useCallback(() => {
    const el = caixa.current;
    if (!el || !nos.length) return rf.fitView({ padding: 0.18, maxZoom: 1.1 });
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nos) {
      const t = tamanhoDoTipo(n.type);
      x1 = Math.min(x1, n.position.x); y1 = Math.min(y1, n.position.y);
      x2 = Math.max(x2, n.position.x + t.w); y2 = Math.max(y2, n.position.y + t.h);
    }
    const W = el.clientWidth, H = el.clientHeight;
    const ajuste = Math.min(W / (x2 - x1 + 140), H / (y2 - y1 + 140), 1.1);
    if (ajuste >= 0.7) return rf.fitView({ padding: 0.18, maxZoom: 1.1 });
    const z = Math.max(0.75, Math.min(1, W / (x2 - x1 + 140)));
    rf.setCenter((x1 + x2) / 2, y1 + (H / 2) / z - 70, { zoom: z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf]);

  // realça a peça/seta escolhida (vale também quando a escolha vem do painel)
  useEffect(() => {
    setNodes((ns) => ns.map((n) => (n.selected === (selecao?.tipo === "peca" && selecao.id === n.id) ? n : { ...n, selected: selecao?.tipo === "peca" && selecao.id === n.id })));
    setEdges((es) => es.map((e) => (e.selected === (selecao?.tipo === "seta" && selecao.id === e.id) ? e : { ...e, selected: selecao?.tipo === "seta" && selecao.id === e.id })));
  }, [selecao]);

  const onNodesChange = useCallback((c: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(c, ns));
    if (c.some((x) => x.type === "position" && x.dragging === false)) setSujo(true);
  }, []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onConnect = useCallback((p: Connection) => {
    if (!editavel || !p.source || !p.target) return;
    setEdges((es) => [...es, estiloSeta({ id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, source: p.source!, target: p.target!, sourceHandle: p.sourceHandle ?? undefined, targetHandle: p.targetHandle ?? undefined }, false)]);
    setSujo(true);
  }, [editavel]);
  const onReconnect = useCallback((velha: Edge, nova: Connection) => {
    setEdges((es) => reconnectEdge(velha, nova, es));
    setSujo(true);
  }, []);

  const reorganizar = () => {
    setNodes((ns) => ns.map((n) => (posicoesAuto[n.id] ? { ...n, position: posicoesAuto[n.id] } : n)));
    setSujo(editavel);
    setTimeout(encaixar, 60);
  };

  const salvar = () => {
    onSalvar?.(
      nodes.map((n) => ({ id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        label: typeof e.label === "string" ? e.label : undefined,
        isReturn: !!(e.data as { isReturn?: boolean } | undefined)?.isReturn,
        sourceHandle: (e.sourceHandle as string | undefined) ?? undefined,
        targetHandle: (e.targetHandle as string | undefined) ?? undefined,
      })),
    );
    setSujo(false);
  };

  const rotuloBotao = "text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap";

  return (
    <div className="fluxo-canvas" ref={caixa} style={{ position: "absolute", inset: 0 }}>
      <style>{`.fluxo-canvas .react-flow__pane{cursor:grab}.fluxo-canvas .react-flow__pane.dragging{cursor:grabbing}.fluxo-canvas .react-flow__handle{opacity:0;transition:opacity .15s}.fluxo-canvas .react-flow__node:hover .react-flow__handle,.fluxo-canvas .react-flow__node.selected .react-flow__handle{opacity:1}`}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable={editavel}
        nodesConnectable={editavel}
        connectionMode={ConnectionMode.Loose}
        onNodeClick={(_, n) => onSelect({ tipo: "peca", id: n.id })}
        onEdgeClick={(_, e) => onSelect({ tipo: "seta", id: e.id })}
        onPaneClick={() => onSelect(null)}
        deleteKeyCode={null}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={1.8}
        onInit={abrir}
        style={{ background: "#F5F0EA" }}
      >
        <Background gap={22} color="#E2DAD0" />
        <Controls showInteractive={false} showFitView={false} position="bottom-left" />
      </ReactFlow>

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-1.5rem)]">
        <button className={rotuloBotao} onClick={encaixar} title="Mostra o desenho inteiro na tela">⤢ Encaixar na tela</button>
        {extras}
        <button className={rotuloBotao} onClick={reorganizar} title="Volta as peças para a posição arrumada, de cima para baixo">↺ Reorganizar</button>
        {editavel && sujo && (
          <button
            onClick={salvar}
            disabled={salvando}
            className="text-xs px-2.5 py-1.5 rounded-lg text-white cursor-pointer whitespace-nowrap disabled:opacity-50"
            style={{ background: "var(--accent, #2D6B6B)" }}
            title="Grava onde você deixou as peças e as ligações"
          >
            {salvando ? "salvando…" : "💾 Salvar posições"}
          </button>
        )}
      </div>
      <p className="absolute bottom-2 right-3 z-10 text-[11px] text-[var(--text-muted)] pointer-events-none hidden sm:block">
        arraste o fundo para passear · role ou use dois dedos para o zoom
      </p>
    </div>
  );
}

export default function FlowViewer(props: Props) {
  return (
    <ReactFlowProvider>
      <Interno {...props} />
    </ReactFlowProvider>
  );
}
