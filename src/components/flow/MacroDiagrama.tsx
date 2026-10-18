"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, ConnectionMode, useReactFlow,
  applyNodeChanges, type Node, type Edge, type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FlowDoc } from "@/lib/types";
import type { AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import { avaliaSaude, SELO_SAUDE, ehAposentada, descricaoLimpa } from "@/lib/radiografia";
import { layoutVertical, limites, tamanhoDoTipo, verticaliza } from "@/lib/flow/layout";
import { nomeDoFluxo, type MacroMontado } from "@/lib/flow/macro-fluxos";
import RoughNode from "./RoughNode";
import { estiloSeta } from "./estilo";

// =============================================
// Macro-fluxo: UM diagrama que encadeia vários fluxos.
// Cada fluxo é um bloco; "abrir etapas" troca o bloco pelas etapas dele, ali mesmo.
// Mesmo canvas, mesmo traço e mesmas setas pontilhadas dos outros.
// =============================================

const BLOCO = { w: 300, h: 124 };
const PAD = 28;
const TOPO = 62;

interface DadosBloco extends Record<string, unknown> {
  flowId: string;
  nome: string;
  icone: string;
  horario?: string;
  etapas: number;
  saude?: string;
  cor?: string;
  aposentada: boolean;
  aberto: boolean;
  largura: number;
  altura: number;
  onAlternar: (id: string) => void;
  onAbrirFluxo: (id: string) => void;
}

function useRabisco(ref: React.RefObject<SVGSVGElement | null>, w: number, h: number, fill: string, stroke: string, seed: number, selecionado: boolean) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let vivo = true;
    (async () => {
      try {
        const m: { default?: unknown; svg?: unknown } = await import("roughjs");
        const rough = (m.default ?? m) as { svg: (e: SVGSVGElement) => { rectangle: (x: number, y: number, w: number, h: number, o: object) => SVGElement } };
        if (!vivo) return;
        svg.innerHTML = "";
        svg.appendChild(rough.svg(svg).rectangle(6, 6, w - 12, h - 12, { roughness: 1.6, strokeWidth: selecionado ? 2.6 : 1.8, fill, fillStyle: "solid", stroke, seed }));
      } catch { /* sem rabisco, fica só o fundo */ }
    })();
    return () => { vivo = false; };
  }, [ref, w, h, fill, stroke, seed, selecionado]);
}

const semente = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) || 1; };
const alca = { width: 10, height: 10, opacity: 0, pointerEvents: "none" as const };

function BlocoFechado({ id, data, selected }: { id: string; data: DadosBloco; selected?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useRabisco(ref, BLOCO.w, BLOCO.h, "#FFFFFF", data.aposentada ? "#A0583C" : "#2D6B6B", semente(id), !!selected);
  return (
    <div style={{ width: BLOCO.w, height: BLOCO.h, position: "relative", fontFamily: 'var(--font-kalam), "Comic Sans MS", cursive', color: "#2D3B3B" }}>
      <svg ref={ref} width={BLOCO.w} height={BLOCO.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      <div className="relative z-10 h-full px-4 py-3 flex flex-col justify-center">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none">{data.icone}</span>
          <span className="text-[14px] font-semibold leading-tight flex-1">{data.nome}</span>
          {data.saude && <span title={data.saude} className="text-xs">{data.cor}</span>}
        </div>
        <span className="text-[11px] opacity-70 mt-1">{data.aposentada ? "⛔ não roda mais" : data.horario || "sem horário fixo"} · {data.etapas} etapas</span>
        <button
          className="nodrag nopan self-start mt-1.5 text-[11px] px-2 py-0.5 rounded-full border cursor-pointer hover:bg-[#D4E8E8]"
          style={{ borderColor: "#2D6B6B", color: "#2D6B6B", background: "#fff" }}
          onClick={(e) => { e.stopPropagation(); data.onAlternar(data.flowId); }}
        >
          ▾ abrir etapas
        </button>
      </div>
      <Handle id="top" type="source" position={Position.Top} style={alca} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={alca} />
    </div>
  );
}

function BlocoAberto({ data, selected }: { data: DadosBloco; selected?: boolean }) {
  return (
    <div
      style={{
        width: data.largura, height: data.altura, borderRadius: 14, position: "relative",
        border: `2px dashed ${selected ? "#2D6B6B" : "#7FA9A9"}`, background: "rgba(212,232,232,0.28)",
      }}
    >
      <div className="absolute left-0 right-0 top-0 flex items-center gap-2 px-3 py-2" style={{ height: TOPO - 12 }}>
        <span className="text-xl leading-none">{data.icone}</span>
        <span className="text-[13px] font-semibold flex-1 truncate" style={{ fontFamily: 'var(--font-kalam), "Comic Sans MS", cursive', color: "#2D3B3B" }}>{data.nome}</span>
        <button className="nodrag nopan text-[11px] px-2 py-0.5 rounded-full border cursor-pointer" style={{ borderColor: "#2D6B6B", color: "#2D6B6B", background: "#fff" }}
          onClick={(e) => { e.stopPropagation(); data.onAbrirFluxo(data.flowId); }}>abrir fluxo ↗</button>
        <button className="nodrag nopan text-[11px] px-2 py-0.5 rounded-full border cursor-pointer" style={{ borderColor: "#2D6B6B", color: "#2D6B6B", background: "#fff" }}
          onClick={(e) => { e.stopPropagation(); data.onAlternar(data.flowId); }}>▴ recolher</button>
      </div>
      <Handle id="top" type="source" position={Position.Top} style={alca} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={alca} />
    </div>
  );
}

const nodeTypes = { bloco: BlocoFechado, grupo: BlocoAberto, rough: RoughNode };

type Escolha = { tipo: "bloco"; id: string } | { tipo: "etapa"; flowId: string; nodeId: string } | { tipo: "seta"; id: string } | null;

interface Props {
  macro: MacroMontado;
  automacaoDe: (f: FlowDoc) => AutomacaoApiItem | null;
  onVoltar: () => void;
  onAbrirFluxo: (f: FlowDoc) => void;
}

function Interno({ macro, automacaoDe, onVoltar, onAbrirFluxo }: Props) {
  const rf = useReactFlow();
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [escolha, setEscolha] = useState<Escolha>(null);
  const [nodes, setNodes] = useState<Node[]>([]);

  const alterna = (id: string) => setAbertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const porId = useMemo(() => new Map(macro.fluxos.map((f) => [f.id, f])), [macro]);

  // refaz tudo quando abre/fecha um bloco (o arranjo manual de antes se perde de propósito: o tamanho mudou)
  const { montados, edges } = useMemo(() => {
    const prefixo = (p: string) => macro.fluxos.find((f) => f.id.startsWith(p))?.id;
    const internos = new Map(macro.fluxos.map((f) => {
      const v = verticaliza(f);
      const pos = new Map(v.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y, camada: 0 }]));
      const caixas = v.nodes.map((n) => ({ id: n.id, ...tamanhoDoTipo(n.type) }));
      const b = limites(pos, caixas);
      return [f.id, { v, b }] as const;
    }));
    const tam = (f: FlowDoc) => {
      if (!abertos.has(f.id)) return { w: BLOCO.w, h: BLOCO.h };
      const b = internos.get(f.id)!.b;
      return { w: Math.max(BLOCO.w, b.w + PAD * 2), h: b.h + TOPO + PAD };
    };
    const ligs = macro.def.ligacoes.map(([a, b]) => ({ source: prefixo(a) || "", target: prefixo(b) || "" })).filter((l) => l.source && l.target);
    const pos = layoutVertical(macro.fluxos.map((f, i) => ({ id: f.id, ...tam(f), ordem: i })), ligs);

    const ns: Node[] = [];
    const es: Edge[] = [];
    for (const f of macro.fluxos) {
      const a = automacaoDe(f);
      const cron = a ? interpretaCron(a.agenda) : null;
      const saude = a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
      const t = tam(f);
      const aberto = abertos.has(f.id);
      const dados: DadosBloco = {
        flowId: f.id, nome: nomeDoFluxo(f), icone: f.nodes.find((n) => n.type === "start")?.data.icon || "🗺️",
        horario: cron ? `⏰ ${cron.descricao}` : undefined, etapas: f.nodes.length,
        saude: saude ? SELO_SAUDE[saude].texto : undefined, cor: saude ? SELO_SAUDE[saude].bolinha : undefined,
        aposentada: ehAposentada(f), aberto, largura: t.w, altura: t.h, onAlternar: alterna, onAbrirFluxo: (id) => onAbrirFluxo(porId.get(id)!),
      };
      const p = pos.get(f.id)!;
      ns.push({ id: f.id, type: aberto ? "grupo" : "bloco", position: { x: p.x, y: p.y }, data: dados, style: aberto ? { width: t.w, height: t.h } : undefined });
      if (aberto) {
        const { v, b } = internos.get(f.id)!;
        for (const n of v.nodes) {
          ns.push({
            id: `${f.id}:${n.id}`, type: "rough", parentId: f.id, draggable: false,
            position: { x: n.position.x - b.x1 + (t.w - b.w) / 2, y: n.position.y - b.y1 + TOPO },
            data: { label: n.data.label, icon: n.data.icon, details: n.data.details, _flowType: n.type },
          });
        }
        for (const e of v.edges) {
          es.push(estiloSeta({ id: `${f.id}:${e.id}`, source: `${f.id}:${e.source}`, target: `${f.id}:${e.target}`, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }, !!e.isReturn, e.label));
        }
      }
    }
    macro.def.ligacoes.forEach(([a, b, rot], i) => {
      const s = prefixo(a), t = prefixo(b);
      if (s && t) es.push(estiloSeta({ id: `macro-${i}`, source: s, target: t, sourceHandle: "bottom", targetHandle: "top" }, false, rot));
    });
    return { montados: ns, edges: es };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macro, abertos]);

  useEffect(() => {
    setNodes(montados);
    const t = setTimeout(() => rf.fitView({ padding: 0.16, duration: 350, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
  }, [montados, rf]);

  const onNodesChange = (c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns));
  const flowDe = (id: string) => porId.get(id);
  const rotulo = "text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap";

  // painel
  const fBloco = escolha?.tipo === "bloco" ? flowDe(escolha.id) : null;
  const aBloco = fBloco ? automacaoDe(fBloco) : null;
  const cBloco = aBloco ? interpretaCron(aBloco.agenda) : null;
  const etapa = escolha?.tipo === "etapa" ? flowDe(escolha.flowId)?.nodes.find((n) => n.id === escolha.nodeId) : null;
  const seta = escolha?.tipo === "seta" ? edges.find((e) => e.id === escolha.id) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 md:px-4 py-2 flex items-center gap-x-3 gap-y-1 flex-wrap shrink-0">
        <button onClick={onVoltar} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap">← Voltar</button>
        <h2 className="text-base font-semibold truncate min-w-0 flex-1 basis-40">{macro.def.icone} {macro.def.titulo}</h2>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{macro.fluxos.length} fluxos num só desenho</span>
        <button className={rotulo} onClick={() => setAbertos(new Set(macro.fluxos.map((f) => f.id)))}>▾ Abrir todos</button>
        <button className={rotulo} onClick={() => setAbertos(new Set())}>▴ Recolher todos</button>
      </div>

      <div className="flex-1 min-h-0 relative">
        <style>{`.macro-canvas .react-flow__pane{cursor:grab}.macro-canvas .react-flow__pane.dragging{cursor:grabbing}`}</style>
        <div className="macro-canvas" style={{ position: "absolute", inset: 0 }}>
          <ReactFlow
            nodes={nodes.map((n) => ({ ...n, selected: (escolha?.tipo === "bloco" && escolha.id === n.id) || (escolha?.tipo === "etapa" && `${escolha.flowId}:${escolha.nodeId}` === n.id) }))}
            edges={edges.map((e) => ({ ...e, selected: escolha?.tipo === "seta" && escolha.id === e.id }))}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            nodesConnectable={false}
            connectionMode={ConnectionMode.Loose}
            onNodeClick={(_, n) => {
              if (n.id.includes(":")) { const [flowId, nodeId] = n.id.split(":"); setEscolha({ tipo: "etapa", flowId, nodeId }); }
              else setEscolha({ tipo: "bloco", id: n.id });
            }}
            onEdgeClick={(_, e) => setEscolha({ tipo: "seta", id: e.id })}
            onPaneClick={() => setEscolha(null)}
            deleteKeyCode={null}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            minZoom={0.1}
            maxZoom={1.6}
            fitView
            fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
            style={{ background: "#F5F0EA" }}
          >
            <Background gap={22} color="#E2DAD0" />
            <Controls showInteractive={false} showFitView={false} position="bottom-left" />
          </ReactFlow>
        </div>
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button className={rotulo} onClick={() => rf.fitView({ padding: 0.16, duration: 350, maxZoom: 1 })}>⤢ Encaixar na tela</button>
        </div>
        <p className="absolute bottom-2 right-3 z-10 text-[11px] text-[var(--text-muted)] pointer-events-none hidden sm:block">arraste o fundo para passear · role ou use dois dedos para o zoom</p>

        {escolha && (
          <aside className="absolute z-20 bg-[var(--bg-secondary)] shadow-2xl overflow-y-auto p-4 border-[var(--border)] inset-x-0 bottom-0 max-h-[62%] border-t rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[380px] sm:max-h-none sm:border-t-0 sm:border-l sm:rounded-none">
            <button onClick={() => setEscolha(null)} aria-label="Fechar" className="float-right text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
            {fBloco && (
              <div className="space-y-2 text-sm">
                <h3 className="text-base font-semibold">{nomeDoFluxo(fBloco)}</h3>
                {descricaoLimpa(fBloco) && <p className="text-[var(--text-secondary)]">{descricaoLimpa(fBloco)}</p>}
                {cBloco && <p className="text-xs">⏰ {cBloco.descricao}</p>}
                <p className="text-xs text-[var(--text-muted)]">{fBloco.nodes.length} etapas</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className={rotulo} onClick={() => alterna(fBloco.id)}>{abertos.has(fBloco.id) ? "▴ Recolher etapas" : "▾ Abrir etapas aqui"}</button>
                  <button className="text-xs px-2.5 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "var(--accent, #2D6B6B)" }} onClick={() => onAbrirFluxo(fBloco)}>Abrir fluxo completo ↗</button>
                </div>
              </div>
            )}
            {etapa && (
              <div className="space-y-2 text-sm">
                <h3 className="text-base font-semibold">{etapa.data.icon} {etapa.data.label}</h3>
                <p className="text-[var(--text-secondary)] whitespace-pre-line">{etapa.data.details || "Sem descrição ainda."}</p>
                {etapa.data.executor && <p className="text-xs"><span className="text-[var(--text-muted)]">Quem faz: </span>{etapa.data.executor}</p>}
                {etapa.data.tags?.length ? <p className="text-xs"><span className="text-[var(--text-muted)]">Ferramentas: </span>{etapa.data.tags.join(", ")}</p> : null}
              </div>
            )}
            {seta && (
              <div className="space-y-1 text-sm">
                <h3 className="text-base font-semibold">Ligação</h3>
                <p className="text-[var(--text-secondary)]">{seta.label ? `${seta.label}.` : "Segue direto."}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default function MacroDiagrama(props: Props) {
  return (
    <ReactFlowProvider>
      <Interno {...props} />
    </ReactFlowProvider>
  );
}
