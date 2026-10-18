"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, ConnectionMode, useReactFlow,
  applyNodeChanges, applyEdgeChanges, reconnectEdge,
  type Node, type Edge, type NodeChange, type EdgeChange, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RoughNode, { STROKE_BY_TYPE } from "./RoughNode";
import { estiloSeta } from "./estilo";
import { tamanhoDoTipo } from "@/lib/flow/layout";
import type { FlowDocNode } from "@/lib/types";

// =============================================
// O canvas da radiografia (React Flow, o mesmo do editor), v3:
//  - horizontal no computador, vertical no celular (quem decide é a página, pelas posições que manda)
//  - traço rabiscado, cores e setas pontilhadas animadas de sempre
//  - FORA do modo Editar: arrastar só passeia (nodesDraggable=false)
//  - DENTRO do modo Editar: move peças e pontas de setas, e salva sozinho (debounce)
//  - mini-mapa no canto; abre encaixado (fitView)
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
  /** modo Editar ligado: peças e setas se movem e o desenho salva sozinho */
  editando: boolean;
  /** chamado (com atraso) depois de cada mudança feita no modo Editar */
  onSalvar?: (nos: { id: string; x: number; y: number }[], setas: SetaVis[]) => void;
  /** posições "arrumadas" (auto) — o botão Reorganizar volta pra elas */
  posicoesAuto: Record<string, { x: number; y: number }>;
  /** pontas das setas na arrumação automática */
  setasAuto?: SetaVis[];
  /** pede para centralizar numa peça (n muda a cada pedido) */
  foco?: { id: string; n: number } | null;
  /** esconde o mini-mapa (quando o painel de detalhe cobre o canto) */
  semMiniMapa?: boolean;
  /** botões extras na barra */
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

function Interno({ nos, setas, selecao, onSelect, editando, onSalvar, posicoesAuto, setasAuto, foco, semMiniMapa, extras }: Props) {
  const [nodes, setNodes] = useState<Node[]>(() => paraRF(nos));
  const [edges, setEdges] = useState<Edge[]>(() => paraRFSetas(setas));
  const rf = useReactFlow();
  const sujo = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef({ nodes, edges });
  ultimo.current = { nodes, edges };

  const caixa = useRef<HTMLDivElement>(null);
  const encaixar = useCallback(() => rf.fitView({ padding: 0.1, duration: 300, maxZoom: 1.15 }), [rf]);

  // abre encaixado; se o desenho ficaria miúdo demais (fluxo comprido), abre legível a partir do começo
  const abrir = useCallback(() => {
    const el = caixa.current;
    if (!el || !nos.length) return rf.fitView({ padding: 0.1, maxZoom: 1.15 });
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nos) {
      const t = tamanhoDoTipo(n.type);
      x1 = Math.min(x1, n.position.x); y1 = Math.min(y1, n.position.y);
      x2 = Math.max(x2, n.position.x + t.w); y2 = Math.max(y2, n.position.y + t.h);
    }
    const W = el.clientWidth, H = el.clientHeight;
    const ajuste = Math.min(W / (x2 - x1 + 60), H / (y2 - y1 + 60), 1.15);
    if (ajuste >= 0.6) return rf.fitView({ padding: 0.1, maxZoom: 1.15 });
    // muito comprido: zoom legível, começo do desenho à vista
    const z = 0.8;
    rf.setViewport({ x: 24 - x1 * z, y: 24 - y1 * z, zoom: z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf]);

  // realça a peça/seta escolhida (vale também quando a escolha vem de fora)
  useEffect(() => {
    setNodes((ns) => ns.map((n) => (n.selected === (selecao?.tipo === "peca" && selecao.id === n.id) ? n : { ...n, selected: selecao?.tipo === "peca" && selecao.id === n.id })));
    setEdges((es) => es.map((e) => (e.selected === (selecao?.tipo === "seta" && selecao.id === e.id) ? e : { ...e, selected: selecao?.tipo === "seta" && selecao.id === e.id })));
  }, [selecao]);

  // passeia até a peça pedida pela lista de bolinhas
  useEffect(() => {
    if (!foco) return;
    const n = ultimo.current.nodes.find((x) => x.id === foco.id);
    if (!n) return;
    const t = tamanhoDoTipo((n.data as { _flowType?: FlowDocNode["type"] })._flowType || "action");
    rf.setCenter(n.position.x + t.w / 2, n.position.y + t.h / 2, { zoom: Math.max(rf.getZoom(), 0.85), duration: 350 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco?.n]);

  const salvarAgora = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!sujo.current) return;
    sujo.current = false;
    const { nodes: ns, edges: es } = ultimo.current;
    onSalvar?.(
      ns.map((n) => ({ id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      es.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        label: typeof e.label === "string" ? e.label : undefined,
        isReturn: !!(e.data as { isReturn?: boolean } | undefined)?.isReturn,
        sourceHandle: (e.sourceHandle as string | undefined) ?? undefined,
        targetHandle: (e.targetHandle as string | undefined) ?? undefined,
      })),
    );
  }, [onSalvar]);

  const marcaSujo = useCallback(() => {
    sujo.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(salvarAgora, 1000);
  }, [salvarAgora]);

  // saiu do modo Editar ("Pronto"): grava o que faltava na hora
  useEffect(() => { if (!editando) salvarAgora(); }, [editando, salvarAgora]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onNodesChange = useCallback((c: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(c, ns));
    if (c.some((x) => x.type === "position" && x.dragging === false)) marcaSujo();
  }, [marcaSujo]);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onConnect = useCallback((p: Connection) => {
    if (!editando || !p.source || !p.target) return;
    setEdges((es) => [...es, estiloSeta({ id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, source: p.source!, target: p.target!, sourceHandle: p.sourceHandle ?? undefined, targetHandle: p.targetHandle ?? undefined }, false)]);
    marcaSujo();
  }, [editando, marcaSujo]);
  const onReconnect = useCallback((velha: Edge, nova: Connection) => {
    setEdges((es) => reconnectEdge(velha, nova, es));
    marcaSujo();
  }, [marcaSujo]);

  const reorganizar = () => {
    setNodes((ns) => ns.map((n) => (posicoesAuto[n.id] ? { ...n, position: posicoesAuto[n.id] } : n)));
    if (setasAuto) setEdges(paraRFSetas(setasAuto));
    marcaSujo();
    setTimeout(encaixar, 60);
  };

  const rotuloBotao = "text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap";

  return (
    <div className="fluxo-canvas" ref={caixa} style={{ position: "absolute", inset: 0 }}>
      <style>{`.fluxo-canvas .react-flow__pane{cursor:grab}.fluxo-canvas .react-flow__pane.dragging{cursor:grabbing}.fluxo-canvas .react-flow__handle{opacity:0;pointer-events:none;transition:opacity .15s}.fluxo-canvas.editando .react-flow__handle{pointer-events:all}.fluxo-canvas.editando .react-flow__node:hover .react-flow__handle,.fluxo-canvas.editando .react-flow__node.selected .react-flow__handle{opacity:1}.fluxo-canvas .react-flow__node{cursor:pointer}.fluxo-canvas.editando .react-flow__node{cursor:move}`}</style>
      <ReactFlow
        className={editando ? "editando" : ""}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        nodesDraggable={editando}
        edgesReconnectable={editando}
        nodesConnectable={editando}
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
        {!semMiniMapa && (
          <MiniMap
            pannable zoomable
            position="bottom-right"
            style={{ width: 150, height: 92, bottom: 66, right: 12, margin: 0, borderRadius: 8, border: "1px solid #D9D1C4" }}
            maskColor="rgba(45,107,107,0.10)"
            nodeColor={(n) => STROKE_BY_TYPE[((n.data as { _flowType?: FlowDocNode["type"] })._flowType) || "action"]}
            ariaLabel="Mini-mapa do desenho"
          />
        )}
      </ReactFlow>

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-1.5rem)]">
        <button className={rotuloBotao} onClick={encaixar} title="Mostra o desenho inteiro na tela">⤢ Encaixar na tela</button>
        {extras}
        {editando && (
          <button className={rotuloBotao} onClick={reorganizar} title="Volta as peças e setas para a arrumação automática">↺ Reorganizar</button>
        )}
      </div>
      <p className="absolute bottom-2 right-3 z-10 text-[11px] text-[var(--text-muted)] pointer-events-none hidden sm:block">
        {editando ? "arraste as peças e as pontas das setas · salva sozinho" : "arraste o fundo para passear · role ou use dois dedos para o zoom"}
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
