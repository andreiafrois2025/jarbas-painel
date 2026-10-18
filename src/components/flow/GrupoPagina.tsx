"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, ConnectionMode,
  type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FlowDoc, FlowDocNode } from "@/lib/types";
import type { AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import { avaliaSaude, SELO_SAUDE, ehAposentada, descricaoLimpa, primeiraFrase, montaDesenho, caminhoDeArquivo, type Nivel } from "@/lib/radiografia";
import { layoutHorizontal, pontasHorizontal, tamanhoDoTipo } from "@/lib/flow/layout";
import { nomeDoFluxo, type MacroMontado } from "@/lib/flow/macro-fluxos";
import RoughNode from "./RoughNode";
import { estiloSeta } from "./estilo";
import { BotoesNivel, FaixaComeca, BlocoProcesso, useMedida, type Bolinha } from "./PaginaPartes";

// =============================================
// Página de um GRUPO (v3): mesma estrutura da página do fluxo
//   cabeçalho do grupo, 3 níveis, "Começa em", "O processo do início ao fim"
//   (bolinhas = cada rotina do grupo, clicáveis) e, embaixo, o diagrama em FAIXAS:
//   uma raia por rotina, as etapas deitadas dentro dela, e setas entre as raias
//   onde macro-fluxos.ts declara que uma rotina alimenta a outra.
// =============================================

const PAD = 14;
const CABECA = 40;
const ENTRE = 44;
const MARGEM = 96; // corredor à esquerda das raias, por onde passam as setas entre elas

interface DadosFaixa extends Record<string, unknown> {
  flowId: string;
  num: number;
  nome: string;
  icone: string;
  horario?: string;
  cor?: string;
  saude?: string;
  aposentada: boolean;
  largura: number;
  altura: number;
  onAbrir: (id: string) => void;
}

const alca = { width: 8, height: 8, opacity: 0, pointerEvents: "none" as const };

function Faixa({ data, selected }: { data: DadosFaixa; selected?: boolean }) {
  return (
    <div
      style={{
        width: data.largura, height: data.altura, borderRadius: 14, position: "relative",
        border: `1.5px dashed ${selected ? "#2D6B6B" : "#7FA9A9"}`, background: "rgba(212,232,232,0.30)",
      }}
    >
      <div className="absolute left-0 right-0 top-0 flex items-center gap-2 px-3" style={{ height: CABECA }}>
        <span className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center text-white shrink-0" style={{ background: "#2D6B6B" }}>{data.num}</span>
        <span className="text-lg leading-none">{data.icone}</span>
        <span className="text-[14px] font-semibold truncate" style={{ color: "#2D3B3B" }}>{data.nome}</span>
        {data.cor && <span title={data.saude} className="text-xs">{data.cor}</span>}
        <span className="text-[11px] opacity-70 truncate hidden sm:inline" style={{ color: "#2D3B3B" }}>{data.aposentada ? "⛔ não roda mais" : data.horario}</span>
        <span className="flex-1" />
        <button
          className="nodrag nopan text-[11px] px-2.5 py-1 rounded-full border cursor-pointer whitespace-nowrap hover:bg-[#D4E8E8]"
          style={{ borderColor: "#2D6B6B", color: "#2D6B6B", background: "#fff" }}
          onClick={(e) => { e.stopPropagation(); data.onAbrir(data.flowId); }}
        >abrir fluxo ↗</button>
      </div>
      {/* as setas entre raias entram e saem pela esquerda, num corredor livre (não cortam as peças) */}
      <Handle id="left" type="source" position={Position.Left} style={alca} />
    </div>
  );
}

const nodeTypes = { faixa: Faixa, rough: RoughNode };

interface Props {
  macro: MacroMontado;
  automacaoDe: (f: FlowDoc) => AutomacaoApiItem | null;
  nivel: Nivel;
  onNivel: (n: Nivel) => void;
  onAbrirFluxo: (f: FlowDoc) => void;
}

type Escolha = { flowId: string; nodeId: string } | null;

function Interno({ macro, automacaoDe, nivel, onNivel, onAbrirFluxo }: Props) {
  const [areaRef, area] = useMedida<HTMLDivElement>();
  const [escolha, setEscolha] = useState<Escolha>(null);

  const fluxos = useMemo(() => macro.fluxos.filter((f) => !ehAposentada(f)), [macro]);
  const porId = useMemo(() => new Map(fluxos.map((f) => [f.id, f])), [fluxos]);

  // ordem das raias: segue as ligações (quem alimenta vem antes), senão a ordem do grupo
  const ordenados = useMemo(() => {
    const pref = (p: string) => fluxos.find((f) => f.id.startsWith(p))?.id;
    const lig = macro.def.ligacoes.map(([a, b]) => [pref(a), pref(b)] as const).filter((x): x is readonly [string, string] => !!x[0] && !!x[1]);
    const ent = new Map(fluxos.map((f) => [f.id, 0]));
    lig.forEach(([, b]) => ent.set(b, (ent.get(b) || 0) + 1));
    const feitos: string[] = [];
    const resto = fluxos.map((f) => f.id);
    while (resto.length) {
      const i = resto.findIndex((id) => (ent.get(id) || 0) === 0);
      const id = resto.splice(i >= 0 ? i : 0, 1)[0];
      feitos.push(id);
      lig.filter(([a]) => a === id).forEach(([, b]) => ent.set(b, (ent.get(b) || 0) - 1));
    }
    return feitos.map((id) => porId.get(id)!);
  }, [fluxos, macro, porId]);

  const larguraFaixa = Math.max(520, area.w / 0.82 - 2 * PAD - MARGEM - 30);

  const montagem = useMemo(() => {
    if (!area.w) return null;
    // 1) cada raia: etapas deitadas
    const raias = ordenados.map((f) => {
      type No = { id: string; type: FlowDocNode["type"]; label: string; icon?: string; details?: string; executor?: string };
      let nos: No[]; let ligs: { id: string; source: string; target: string; label?: string; isReturn?: boolean }[];
      if (nivel === 1) {
        const d = montaDesenho(f, 1, 4);
        nos = d.pecas.map((p) => ({ id: p.id, type: p.type, label: p.label, icon: p.icon, details: p.membros[0]?.data.details }));
        ligs = d.setas.map((s) => ({ id: s.id, source: s.source, target: s.target, label: s.label }));
      } else {
        const ns = f.nodes.filter((n) => n.type !== "note");
        const ids = new Set(ns.map((n) => n.id));
        nos = ns.map((n) => {
          const ex = n.data.executor;
          return { id: n.id, type: n.type, label: n.data.label, icon: n.data.icon, details: n.data.details, executor: nivel === 3 ? (caminhoDeArquivo(ex) || ex || "").split("/").pop() : ex };
        });
        ligs = f.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, isReturn: e.isReturn }));
      }
      const caixas = nos.map((n, i) => ({ id: n.id, ...tamanhoDoTipo(n.type), ordem: i }));
      const pos = layoutHorizontal(caixas, ligs.map((l) => ({ source: l.source, target: l.target, retorno: l.isReturn })), larguraFaixa);
      let w = 0, h = 0;
      for (const c of caixas) { const p = pos.get(c.id)!; w = Math.max(w, p.x + c.w); h = Math.max(h, p.y + c.h); }
      const inicio = nos.find((n) => n.type === "start") || nos[0];
      const fim = [...nos].reverse().find((n) => n.type === "end") || [...nos].sort((a, b) => (pos.get(b.id)?.camada ?? 0) - (pos.get(a.id)?.camada ?? 0))[0];
      return { f, nos, ligs, pos, w, h, inicio, fim };
    });
    const W = Math.max(...raias.map((r) => r.w)) + 2 * PAD;

    // 2) empilha as raias
    const ns: Node[] = [];
    const es: Edge[] = [];
    let y = 0;
    raias.forEach((r, i) => {
      const a = automacaoDe(r.f);
      const cron = a ? interpretaCron(a.agenda) : null;
      const saude = a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
      const alturaR = CABECA + r.h + PAD;
      const dados: DadosFaixa = {
        flowId: r.f.id, num: i + 1, nome: nomeDoFluxo(r.f), icone: r.f.nodes.find((n) => n.type === "start")?.data.icon || "🗺️",
        horario: cron ? `⏰ ${cron.descricao}` : undefined, saude: saude ? SELO_SAUDE[saude].texto : undefined, cor: saude ? SELO_SAUDE[saude].bolinha : undefined,
        aposentada: false, largura: W, altura: alturaR, onAbrir: (id) => onAbrirFluxo(porId.get(id)!),
      };
      ns.push({ id: `lane:${r.f.id}`, type: "faixa", position: { x: MARGEM, y }, data: dados, style: { width: W, height: alturaR }, draggable: false, zIndex: 0 });
      for (const n of r.nos) {
        const p = r.pos.get(n.id)!;
        ns.push({
          id: `${r.f.id}:${n.id}`, type: "rough", parentId: `lane:${r.f.id}`, draggable: false, zIndex: 2,
          position: { x: PAD + p.x, y: CABECA + p.y },
          data: { label: n.label, icon: n.icon, details: n.details, executor: n.executor, _flowType: n.type },
        });
      }
      for (const l of r.ligs) {
        const pt = pontasHorizontal(r.pos.get(l.source), r.pos.get(l.target), l.isReturn);
        es.push(estiloSeta({ id: `${r.f.id}:${l.id}`, source: `${r.f.id}:${l.source}`, target: `${r.f.id}:${l.target}`, sourceHandle: pt.sourceHandle, targetHandle: pt.targetHandle }, pt.volta, l.label));
      }
      y += alturaR + ENTRE;
    });
    // 3) setas entre raias (de macro-fluxos.ts)
    macro.def.ligacoes.forEach(([de, para, rot], k) => {
      const A = raias.find((r) => r.f.id.startsWith(de));
      const B = raias.find((r) => r.f.id.startsWith(para));
      if (!A || !B) return;
      const e = estiloSeta({ id: `liga-${k}`, source: `lane:${A.f.id}`, target: `lane:${B.f.id}`, sourceHandle: "left", targetHandle: "left" }, false, rot);
      e.zIndex = 5;
      (e as Edge & { pathOptions?: { offset: number } }).pathOptions = { offset: 36 };
      e.style = { ...e.style, stroke: "#2D6B6B", strokeWidth: 2.2 };
      es.push(e);
    });
    return { ns, es, W: W + MARGEM, H: y - ENTRE, raias };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenados, nivel, larguraFaixa, area.w, macro]);

  // altura do quadro: o desenho cabe em zoom legível e a página rola (não o desenho)
  const zoomAlvo = montagem ? Math.min(1, Math.max(0.45, area.w / (montagem.W + 40))) : 1;
  const altura = montagem ? Math.max(420, Math.round(montagem.H * zoomAlvo + 70)) : 420;

  // ── textos da estrutura ──
  const sub = (f: FlowDoc) => primeiraFrase(descricaoLimpa(f)) || `${f.nodes.length} etapas`;
  const bolinhas: Bolinha[] = ordenados.map((f) => {
    const a = automacaoDe(f);
    const cron = a ? interpretaCron(a.agenda) : null;
    return {
      id: f.id,
      titulo: nomeDoFluxo(f),
      frase: nivel === 1 ? sub(f) : `${sub(f)}${cron ? ` · ⏰ ${cron.descricao}` : ""} · ${f.nodes.filter((n) => n.type !== "note").length} etapas`,
      codigo: nivel === 3 ? [a?.agenda ? `cron ${a.agenda} UTC` : "", a?.script || ""].filter(Boolean).join(" · ") || undefined : undefined,
    };
  });
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const textoDe = (f?: FlowDoc) => (f ? `${nomeDoFluxo(f)}${sub(f) ? ` — ${sub(f)}` : ""}` : "—");

  const etapa = escolha ? porId.get(escolha.flowId)?.nodes.find((n) => n.id === escolha.nodeId) : null;
  const fEtapa = escolha ? porId.get(escolha.flowId) : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-3 md:px-6 pt-4 pb-24 space-y-3 max-w-[2000px]">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Grupo de fluxos · {ordenados.length} rotinas</p>
          <h2 className="text-xl md:text-2xl font-semibold leading-tight">{macro.def.icone} {macro.def.titulo}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[90ch]">{macro.def.resumo}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[110ch]">Por que ficam juntos: {macro.def.porque}</p>
        </div>

        <BotoesNivel nivel={nivel} onMuda={onNivel} />
        <FaixaComeca texto={primeiro ? nomeDoFluxo(primeiro) : "—"} />
        <BlocoProcesso
          titulo="As rotinas do grupo, do início ao fim"
          rotuloComeca="Começa com:"
          rotuloTermina="Termina com:"
          comeca={textoDe(primeiro)}
          termina={textoDe(ultimo)}
          bolinhas={bolinhas}
          onEscolher={(id) => { const f = porId.get(id); if (f) onAbrirFluxo(f); }}
        />

        <div ref={areaRef} className="relative rounded-xl overflow-hidden border border-[var(--border)]" style={{ height: altura }}>
          {montagem && (
            <div className="absolute inset-0">
              <style>{`.grupo-canvas .react-flow__pane{cursor:grab}.grupo-canvas .react-flow__node-rough{cursor:pointer}`}</style>
              <ReactFlow
                className="grupo-canvas"
                key={`${macro.def.slug}-${nivel}-${Math.round(larguraFaixa / 40)}`}
                nodes={montagem.ns.map((n) => ({ ...n, selected: !!escolha && n.id === `${escolha.flowId}:${escolha.nodeId}` }))}
                edges={montagem.es}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                connectionMode={ConnectionMode.Loose}
                onNodeClick={(_, n) => {
                  if (n.id.startsWith("lane:")) return;
                  const i = n.id.indexOf(":");
                  setEscolha({ flowId: n.id.slice(0, i), nodeId: n.id.slice(i + 1) });
                }}
                onPaneClick={() => setEscolha(null)}
                deleteKeyCode={null}
                panOnDrag
                zoomOnScroll={false}
                preventScrolling={false}
                zoomOnPinch
                zoomOnDoubleClick={false}
                minZoom={0.1}
                maxZoom={1.8}
                fitView
                fitViewOptions={{ padding: 0.04, maxZoom: 1.1 }}
                style={{ background: "#F5F0EA" }}
              >
                <Background gap={22} color="#E2DAD0" />
                <Controls showInteractive={false} showFitView position="bottom-left" />
              </ReactFlow>
              <p className="absolute bottom-2 right-3 z-10 text-[11px] text-[var(--text-muted)] pointer-events-none hidden sm:block">arraste o fundo para passear · Ctrl + rolar para o zoom</p>
              {etapa && fEtapa && (
                <aside className="absolute z-20 bg-[var(--bg-secondary)] shadow-2xl overflow-y-auto p-4 pb-20 border-[var(--border)] inset-x-0 bottom-0 max-h-[62%] border-t rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[360px] sm:max-h-none sm:border-t-0 sm:border-l sm:rounded-none">
                  <button onClick={() => setEscolha(null)} aria-label="Fechar" className="float-right text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-[var(--text-muted)]">{nomeDoFluxo(fEtapa)}</p>
                    <h3 className="text-base font-semibold">{etapa.data.icon} {etapa.data.label}</h3>
                    <p className="text-[var(--text-secondary)] whitespace-pre-line">{etapa.data.details || "Sem descrição ainda."}</p>
                    {etapa.data.executor && <p className="text-xs"><span className="text-[var(--text-muted)]">Quem faz: </span>{etapa.data.executor}</p>}
                    {etapa.data.tags?.length ? <p className="text-xs"><span className="text-[var(--text-muted)]">Ferramentas: </span>{etapa.data.tags.join(", ")}</p> : null}
                    <button className="text-xs px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "var(--accent, #2D6B6B)" }} onClick={() => onAbrirFluxo(fEtapa)}>Abrir este fluxo ↗</button>
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GrupoPagina(props: Props) {
  return (
    <ReactFlowProvider>
      <Interno {...props} />
    </ReactFlowProvider>
  );
}
