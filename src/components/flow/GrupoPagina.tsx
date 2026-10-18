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
import { layoutHorizontal, pontasHorizontal } from "@/lib/flow/layout";
import { medePeca, larguraRotuloSeta } from "@/lib/flow/medida";
import { aplicaLeigo, leigoDoFluxo, quemNoBalao, fraseCurta, repete } from "@/lib/flow/leigo";
import { nomeDoFluxo, type MacroMontado } from "@/lib/flow/macro-fluxos";
import { ligacoesDoGrupo, desenhoPodeEstarVelho, decidirLigacao, type LigacoesFluxos } from "@/lib/flow/ligacoes";
import RoughNode from "./RoughNode";
import { estiloSeta } from "./estilo";
import { edgeTypes } from "./SetaEdge";
import { paraRFSetas } from "./rotas";
import { BotoesNivel, BlocoProcesso, useMedida, useFontes, type Bolinha, saudeDaAutomacao, fraseSaude } from "./PaginaPartes";

// =============================================
// Página de um GRUPO (v3): mesma estrutura da página do fluxo
//   cabeçalho do grupo, 3 níveis, a lista numerada das rotinas (clicáveis) e, embaixo, o diagrama em FAIXAS:
//   uma raia por rotina, as etapas deitadas dentro dela, e setas entre as raias
//   onde macro-fluxos.ts declara que uma rotina alimenta a outra.
// =============================================

const PAD = 14;
const CABECA = 40;
const ENTRE = 44;
const MARGEM_MIN = 72; // corredor mínimo à esquerda das raias, por onde passam as setas entre elas
const OFFSET_SETA = 24; // cada seta entre raias usa uma "pista" própria: 24, 38, 52…
const PASSO_SETA = 14;

interface DadosFaixa extends Record<string, unknown> {
  flowId: string;
  nome: string;
  icone: string;
  horario?: string;
  cor?: string;
  saude?: string;
  aposentada: boolean;
  /** (v3.4) quem esta rotina alimenta e de quem recebe, só quando há ligação real */
  alimenta?: string;
  recebe?: string;
  /** só no nível Código: o script mudou depois do desenho */
  velho?: boolean;
  largura: number;
  altura: number;
  /** (v3.6) modo Editar setas: a alça da esquerda aparece e dá para puxar uma seta daqui até outra raia */
  editando?: boolean;
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
        <span className="text-lg leading-none">{data.icone}</span>
        <span className="text-[14px] font-semibold truncate" style={{ color: "#2D3B3B" }}>{data.nome}</span>
        {data.cor && <span title={data.saude} className="text-xs">{data.cor}</span>}
        <span className="text-[11px] opacity-70 truncate hidden sm:inline" style={{ color: "#2D3B3B" }}>{data.aposentada ? "⛔ não roda mais" : data.horario}</span>
        {data.alimenta && <span className="text-[11px] truncate hidden md:inline px-2 py-0.5 rounded-full" style={{ color: "#2D6B6B", background: "rgba(45,107,107,0.12)" }} title={`Entrega algo para: ${data.alimenta}`}>→ alimenta: {data.alimenta}</span>}
        {data.recebe && <span className="text-[11px] truncate hidden md:inline px-2 py-0.5 rounded-full" style={{ color: "#6B5A2D", background: "rgba(196,164,96,0.18)" }} title={`Recebe algo de: ${data.recebe}`}>← recebe de: {data.recebe}</span>}
        {data.velho && <span className="text-[11px] truncate" style={{ color: "#B7791F" }} title="O código desta rotina mudou depois que o desenho foi feito">✏️ desenho pode estar velho</span>}
        <span className="flex-1" />
        <button
          className="nodrag nopan text-[11px] px-2.5 py-1 rounded-full border cursor-pointer whitespace-nowrap hover:bg-[#D4E8E8]"
          style={{ borderColor: "#2D6B6B", color: "#2D6B6B", background: "#fff" }}
          onClick={(e) => { e.stopPropagation(); data.onAbrir(data.flowId); }}
        >abrir fluxo ↗</button>
      </div>
      {/* as setas entre raias entram e saem pela esquerda, num corredor livre (não cortam as peças) */}
      <Handle
        id="left" type="source" position={Position.Left} className={data.editando ? "alca-editavel" : undefined}
        style={data.editando ? { width: 16, height: 16, left: -8, opacity: 1, pointerEvents: "all", background: "#2D6B6B", border: "2px solid #fff", cursor: "crosshair" } : alca}
      />
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
  /** ligações descobertas sozinhas pelo curador (opcional) */
  ligacoesAuto?: LigacoesFluxos | null;
}

type Escolha = { flowId: string; nodeId: string } | null;

function Interno({ macro, automacaoDe, nivel, onNivel, onAbrirFluxo, ligacoesAuto = null }: Props) {
  const [areaRef, area] = useMedida<HTMLDivElement>();
  const [escolha, setEscolha] = useState<Escolha>(null);
  const fv = useFontes();
  // (v3.6) modo Editar setas
  const [editando, setEditando] = useState(false);
  const [selPar, setSelPar] = useState<[string, string] | null>(null); // seta escolhida (ids de 8 caracteres)
  const [confirma, setConfirma] = useState(false);
  const [novaDe, setNovaDe] = useState("");
  const [novaPara, setNovaPara] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const fluxos = useMemo(() => macro.fluxos.filter((f) => !ehAposentada(f)), [macro]);
  const porId = useMemo(() => new Map(fluxos.map((f) => [f.id, f])), [fluxos]);
  // setas entre rotinas: as declaradas em macro-fluxos.ts + as que o curador descobriu lendo o código
  const ligs = useMemo(() => ligacoesDoGrupo({ ...macro, fluxos }, ligacoesAuto), [macro, fluxos, ligacoesAuto]);

  const nomeCurto = (id8: string) => { const f = fluxos.find((x) => x.id.startsWith(id8)); return f ? nomeDoFluxo(f) : id8; };
  const existe = (a: string, b: string) => ligs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const sair = () => { setEditando(false); setSelPar(null); setConfirma(false); setAviso(null); };

  async function excluir() {
    if (!selPar) return;
    setOcupado(true); setAviso(null);
    try {
      await decidirLigacao("excluir", selPar[0], selPar[1]);
      setAviso({ ok: true, texto: `Pronto: a seta ${nomeCurto(selPar[0])} → ${nomeCurto(selPar[1])} foi excluída e não volta sozinha.` });
      setSelPar(null); setConfirma(false);
    } catch (e) { setAviso({ ok: false, texto: `Não consegui excluir: ${(e as Error).message}` }); }
    setOcupado(false);
  }

  async function criar() {
    if (!novaDe || !novaPara || novaDe === novaPara) { setAviso({ ok: false, texto: "Escolha duas rotinas diferentes: de onde sai e para onde vai." }); return; }
    if (existe(novaDe, novaPara)) { setAviso({ ok: false, texto: "Já existe uma seta entre essas duas rotinas." }); return; }
    setOcupado(true); setAviso(null);
    try {
      await decidirLigacao("criar", novaDe, novaPara, novoMotivo.trim());
      setAviso({ ok: true, texto: `Pronto: ${nomeCurto(novaDe)} → ${nomeCurto(novaPara)} foi criada.` });
      setNovaDe(""); setNovaPara(""); setNovoMotivo("");
    } catch (e) { setAviso({ ok: false, texto: `Não consegui criar: ${(e as Error).message}` }); }
    setOcupado(false);
  }

  // ordem das raias: segue as ligações (quem alimenta vem antes), senão a ordem do grupo
  const ordenados = useMemo(() => {
    const pref = (p: string) => fluxos.find((f) => f.id.startsWith(p))?.id;
    const lig = ligs.map(([a, b]) => [pref(a), pref(b)] as const).filter((x): x is readonly [string, string] => !!x[0] && !!x[1]);
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
    // (v3.4) as que têm ligação vêm primeiro (quem alimenta antes de quem recebe); as soltas ficam depois, na ordem do grupo
    const ligadas = new Set(lig.flat());
    return [...feitos.filter((id) => ligadas.has(id)), ...feitos.filter((id) => !ligadas.has(id))].map((id) => porId.get(id)!);
  }, [fluxos, ligs, porId]);

  // o corredor das setas entre raias cresce conforme o maior rótulo (senão ele sai cortado à esquerda)
  const MARGEM = useMemo(() => {
    const folga = ligs.map(([, , rot], k) => OFFSET_SETA + PASSO_SETA * k + (rot ? larguraRotuloSeta(rot) / 2 : 0) + 14);
    return Math.max(MARGEM_MIN, Math.round(Math.max(0, ...folga)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligs, fv]);
  const larguraFaixa = Math.max(520, area.w / 0.82 - 2 * PAD - MARGEM - 30);

  const montagem = useMemo(() => {
    if (!area.w) return null;
    // 1) cada raia: etapas deitadas
    const raias = ordenados.map((f) => {
      type No = { id: string; type: FlowDocNode["type"]; label: string; icon?: string; details?: string; executor?: string };
      let nos: No[]; let ligs: { id: string; source: string; target: string; label?: string; isReturn?: boolean }[];
      const ft = aplicaLeigo(f, nivel); // textos simples nos níveis 1 e 2; originais no 3
      if (nivel === 1) {
        const d = montaDesenho(ft, 1, 4);
        nos = d.pecas.map((p) => ({ id: p.id, type: p.type, label: p.label, icon: p.icon, details: p.membros[0]?.data.details }));
        ligs = d.setas.map((sa) => ({ id: sa.id, source: sa.source, target: sa.target, label: sa.label, isReturn: sa.isReturn }));
      } else {
        const ns = ft.nodes.filter((n) => n.type !== "note");
        const ids = new Set(ns.map((n) => n.id));
        nos = ns.map((n) => {
          const ex = n.data.executor;
          return { id: n.id, type: n.type, label: n.data.label, icon: n.data.icon, details: n.data.details, executor: nivel === 3 ? (caminhoDeArquivo(ex) || ex || "").split("/").pop() : quemNoBalao(ex) };
        });
        ligs = ft.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, isReturn: e.isReturn }));
      }
      const caixas = nos.map((n, i) => ({ id: n.id, ...medePeca(n.type, n.label, n.executor, n.icon), ordem: i }));
      const pos = layoutHorizontal(caixas, ligs.map((l) => ({ source: l.source, target: l.target, retorno: l.isReturn, rotulo: l.label })), larguraFaixa);
      let w = 0, h = 0;
      for (const c of caixas) { const p = pos.get(c.id)!; w = Math.max(w, p.x + c.w); h = Math.max(h, p.y + c.h); }
      const inicio = nos.find((n) => n.type === "start") || nos[0];
      const fim = [...nos].reverse().find((n) => n.type === "end") || [...nos].sort((a, b) => (pos.get(b.id)?.camada ?? 0) - (pos.get(a.id)?.camada ?? 0))[0];
      // setas da raia: mesmas rotas do mapa de um fluxo só (voltas e desvios contornam as peças, sem cruzar nem se sobrepor)
      const setasRaia = ligs.map((l) => {
        const pt = pontasHorizontal(pos.get(l.source), pos.get(l.target), l.isReturn);
        return { id: l.id, source: l.source, target: l.target, label: l.label, isReturn: pt.volta, sourceHandle: pt.sourceHandle, targetHandle: pt.targetHandle };
      });
      const arestas = paraRFSetas(setasRaia, nos.map((n) => ({ id: n.id, type: n.type, label: n.label, icon: n.icon, executor: n.executor, position: pos.get(n.id)! })));
      return { f, nos, ligs, pos, w, h, inicio, fim, arestas };
    });
    // volta que entra pela direita da última peça precisa de um respiro à direita da raia
    const folgaDireita = raias.some((r) => r.arestas.some((e) => e.targetHandle === "right")) ? 90 : 0;
    const W = Math.max(...raias.map((r) => r.w)) + 2 * PAD + folgaDireita;

    // 2) empilha as raias
    const ns: Node[] = [];
    const es: Edge[] = [];
    let y = 0;
    raias.forEach((r) => {
      const a = automacaoDe(r.f);
      const cron = a ? interpretaCron(a.agenda) : null;
      const saude = a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
      const alturaR = CABECA + r.h + PAD;
      const quemAlimenta = ligs.filter(([de]) => r.f.id.startsWith(de)).map(([, para]) => raias.find((x) => x.f.id.startsWith(para))?.f).filter((x): x is FlowDoc => !!x).map((x) => nomeDoFluxo(x));
      const quemRecebe = ligs.filter(([, para]) => r.f.id.startsWith(para)).map(([de]) => raias.find((x) => x.f.id.startsWith(de))?.f).filter((x): x is FlowDoc => !!x).map((x) => nomeDoFluxo(x));
      const dados: DadosFaixa = {
        flowId: r.f.id, alimenta: quemAlimenta.join(", ") || undefined, recebe: quemRecebe.join(", ") || undefined, nome: nomeDoFluxo(r.f), icone: r.f.nodes.find((n) => n.type === "start")?.data.icon || "🗺️",
        horario: cron ? `⏰ ${cron.descricao}` : undefined, saude: saude ? SELO_SAUDE[saude].texto : undefined, cor: saude ? SELO_SAUDE[saude].bolinha : undefined,
        aposentada: false, velho: nivel === 3 && !!desenhoPodeEstarVelho(r.f, ligacoesAuto), largura: W, altura: alturaR, onAbrir: (id) => onAbrirFluxo(porId.get(id)!),
      };
      ns.push({ id: `lane:${r.f.id}`, type: "faixa", position: { x: MARGEM, y }, data: dados, style: { width: W, height: alturaR }, draggable: false, zIndex: 0 });
      for (const n of r.nos) {
        const p = r.pos.get(n.id)!;
        ns.push({
          id: `${r.f.id}:${n.id}`, type: "rough", parentId: `lane:${r.f.id}`, draggable: false, zIndex: 2,
          position: { x: PAD + p.x, y: CABECA + p.y },
          data: { label: n.label, icon: n.icon, details: n.details, executor: n.executor, _flowType: n.type, semRotuloTipo: true },
        });
      }
      for (const e of r.arestas) {
        es.push({ ...e, id: `${r.f.id}:${e.id}`, source: `${r.f.id}:${e.source}`, target: `${r.f.id}:${e.target}` });
      }
      y += alturaR + ENTRE;
    });
    // 3) setas entre raias (de macro-fluxos.ts)
    ligs.forEach(([de, para, rot, auto], k) => {
      const A = raias.find((r) => r.f.id.startsWith(de));
      const B = raias.find((r) => r.f.id.startsWith(para));
      if (!A || !B) return;
      const e = estiloSeta({ id: `liga-${k}`, source: `lane:${A.f.id}`, target: `lane:${B.f.id}`, sourceHandle: "left", targetHandle: "left" }, false, rot);
      e.zIndex = 5;
      (e as Edge & { pathOptions?: { offset: number } }).pathOptions = { offset: OFFSET_SETA + PASSO_SETA * k };
      e.style = { ...e.style, stroke: "#2D6B6B", strokeWidth: 2.2, ...(auto ? { strokeDasharray: "7 5" } : {}) };
      es.push(e);
    });
    // peça invisível na ponta esquerda: o "encaixar na tela" conta ela e o corredor das setas (com os rótulos) fica à vista
    ns.push({ id: "margem", type: "default", position: { x: 0, y: 0 }, data: {}, style: { width: 1, height: 1, opacity: 0, pointerEvents: "none" }, draggable: false, selectable: false, focusable: false });
    return { ns, es, W: W + MARGEM, H: y - ENTRE, raias };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenados, nivel, larguraFaixa, area.w, macro, ligs, ligacoesAuto, MARGEM, fv]);

  // altura do quadro: o desenho cabe em zoom legível e a página rola (não o desenho)
  const zoomAlvo = montagem ? Math.min(1, Math.max(0.45, area.w / (montagem.W + 40))) : 1;
  const altura = montagem ? Math.max(420, Math.round(montagem.H * zoomAlvo + 70)) : 420;

  // ── textos da estrutura ──
  // (v3.3) a lista mostra só o título de cada rotina
  const bolinhas: Bolinha[] = ordenados.map((f) => ({ id: f.id, titulo: nomeDoFluxo(f), semNumero: true, situacao: { saude: saudeDaAutomacao(automacaoDe(f)), frase: fraseSaude(automacaoDe(f)) } }));

  const etapa = escolha ? porId.get(escolha.flowId)?.nodes.find((n) => n.id === escolha.nodeId) : null;
  const fEtapa = escolha ? porId.get(escolha.flowId) : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-3 md:px-6 pt-4 pb-24 space-y-3 max-w-[2000px]">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold leading-tight">{macro.def.icone} {macro.def.titulo}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[90ch]">{fraseCurta(macro.def.resumo)}</p>
        </div>

        <BotoesNivel nivel={nivel} onMuda={onNivel} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => (editando ? sair() : setEditando(true))}
            aria-pressed={editando}
            className="text-sm px-3.5 py-1.5 rounded-lg border cursor-pointer"
            style={editando ? { background: "#2D6B6B", color: "#fff", borderColor: "#2D6B6B" } : { borderColor: "#2D6B6B", color: "#2D6B6B", background: "transparent" }}
          >{editando ? "✓ Terminar de editar as setas" : "✏️ Editar as setas entre rotinas"}</button>
          {!editando && <span className="text-xs text-[var(--text-muted)]">apagar ou criar as setas «alimenta / recebe de»</span>}
        </div>
        {editando && (
          <div className="rounded-xl border p-3 space-y-3 text-sm" style={{ borderColor: "#7FA9A9", background: "rgba(212,232,232,0.30)" }}>
            <p className="text-[13px] text-[var(--text-secondary)]">
              <strong>Modo Editar setas.</strong> Clique numa seta do desenho para escolher e poder excluir. Para criar, puxe a bolinha verde da esquerda de uma rotina até a bolinha de outra, ou use a caixinha abaixo.
            </p>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto] items-end">
              <label className="text-xs text-[var(--text-muted)] space-y-1 block">Sai de
                <select value={novaDe} onChange={(e) => setNovaDe(e.target.value)} className="w-full text-sm rounded-lg border px-2 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)]" style={{ borderColor: "var(--border)" }}>
                  <option value="">escolha a rotina…</option>
                  {ordenados.map((f) => <option key={f.id} value={f.id.slice(0, 8)}>{nomeDoFluxo(f)}</option>)}
                </select>
              </label>
              <label className="text-xs text-[var(--text-muted)] space-y-1 block">Vai para
                <select value={novaPara} onChange={(e) => setNovaPara(e.target.value)} className="w-full text-sm rounded-lg border px-2 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)]" style={{ borderColor: "var(--border)" }}>
                  <option value="">escolha a rotina…</option>
                  {ordenados.map((f) => <option key={f.id} value={f.id.slice(0, 8)}>{nomeDoFluxo(f)}</option>)}
                </select>
              </label>
              <label className="text-xs text-[var(--text-muted)] space-y-1 block">Motivo (opcional)
                <input value={novoMotivo} maxLength={140} onChange={(e) => setNovoMotivo(e.target.value)} placeholder="ex.: o resultado vira entrada da outra" className="w-full text-sm rounded-lg border px-2 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)]" style={{ borderColor: "var(--border)" }} />
              </label>
              <button disabled={ocupado} onClick={criar} className="text-sm px-3.5 py-1.5 rounded-lg text-white cursor-pointer disabled:opacity-60" style={{ background: "#2D6B6B" }}>{ocupado ? "Criando…" : "Criar seta"}</button>
            </div>
          </div>
        )}
        <BlocoProcesso
          titulo="As rotinas deste grupo"
          bolinhas={bolinhas}
          onEscolher={(id) => { const f = porId.get(id); if (f) onAbrirFluxo(f); }}
        />

        <div ref={areaRef} className="relative rounded-xl overflow-hidden border border-[var(--border)]" style={{ height: altura }}>
          {montagem && (
            <div className="absolute inset-0">
              <style>{`.grupo-canvas .react-flow__pane{cursor:grab}.grupo-canvas .react-flow__node-rough{cursor:pointer}.grupo-canvas .react-flow__handle{opacity:0;pointer-events:none}.grupo-canvas .react-flow__handle.alca-editavel{opacity:1;pointer-events:all}`}</style>
              <ReactFlow
                className="grupo-canvas"
                key={`${macro.def.slug}-${nivel}-${Math.round(larguraFaixa / 40)}-${ligs.length}`}
                nodes={montagem.ns.map((n) => ({ ...n, selected: !!escolha && n.id === `${escolha.flowId}:${escolha.nodeId}`, ...(n.type === "faixa" ? { data: { ...n.data, editando } } : {}) }))}
                edges={montagem.es.map((e) => {
                  const k = selPar ? ligs.findIndex(([a, b]) => a === selPar[0] && b === selPar[1]) : -1;
                  return editando && k >= 0 && e.id === `liga-${k}` ? { ...e, selected: true, style: { ...e.style, stroke: "#A0583C", strokeWidth: 3.2 } } : e;
                })}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
                nodesConnectable={editando}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={40}
                isValidConnection={(c) => !!c.source && !!c.target && c.source !== c.target && c.source.startsWith("lane:") && c.target.startsWith("lane:")}
                onConnect={(c) => {
                  if (!editando || !c.source || !c.target) return;
                  setNovaDe(c.source.slice(5, 13)); setNovaPara(c.target.slice(5, 13)); setSelPar(null); setConfirma(false);
                  setAviso({ ok: true, texto: "Seta puxada. Escreva o motivo (se quiser) e confirme em «Criar seta»." });
                }}
                onEdgeClick={(_, e) => {
                  if (!editando || !e.id.startsWith("liga-")) return;
                  const l = ligs[Number(e.id.slice(5))];
                  if (l) { setSelPar([l[0], l[1]]); setConfirma(false); setAviso(null); }
                }}
                onNodeClick={(_, n) => {
                  if (n.id.startsWith("lane:")) return;
                  const i = n.id.indexOf(":");
                  setEscolha({ flowId: n.id.slice(0, i), nodeId: n.id.slice(i + 1) });
                }}
                onPaneClick={() => { setEscolha(null); setSelPar(null); setConfirma(false); }}
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
              {editando && (selPar || aviso) && (
                <div className="fixed z-40 bottom-20 left-3 right-3 sm:left-auto sm:right-5 sm:w-[440px] space-y-2 shadow-2xl">
            {selPar && (
                  <div className="rounded-lg p-3 border space-y-2 text-sm" style={{ borderColor: "#A0583C", background: "var(--bg-secondary)" }}>
                    <p>Seta escolhida: <strong>{nomeCurto(selPar[0])}</strong> → <strong>{nomeCurto(selPar[1])}</strong></p>
                    {!confirma ? (
                      <button onClick={() => setConfirma(true)} className="text-sm px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "#A0583C" }}>Excluir ligação</button>
                    ) : (
                      <div className="space-y-2" role="alertdialog" aria-label="Confirmar exclusão">
                        <p>Excluir esta seta? Ela não volta sozinha, nem quando o curador rodar. Você pode criar de novo quando quiser.</p>
                        <div className="flex gap-2">
                          <button disabled={ocupado} onClick={excluir} className="text-sm px-3 py-1.5 rounded-lg text-white cursor-pointer disabled:opacity-60" style={{ background: "#A0583C" }}>{ocupado ? "Excluindo…" : "Sim, excluir"}</button>
                          <button disabled={ocupado} onClick={() => setConfirma(false)} className="text-sm px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: "var(--border)" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                  {aviso && !selPar && <p role="status" className="rounded-lg border px-3 py-2 text-[13px] bg-[var(--bg-secondary)]" style={{ borderColor: aviso.ok ? "#2D6B6B" : "#B03A2E", color: aviso.ok ? "#2D6B6B" : "#B03A2E" }}>{aviso.texto}</p>}
                </div>
              )}
              <p className="absolute bottom-2 right-3 z-10 text-[11px] text-[var(--text-muted)] pointer-events-none hidden sm:block">arraste o fundo para passear · Ctrl + rolar para o zoom{ligs.some((l) => l[3]) ? " · seta tracejada = achada sozinha no código" : ligs.length ? " · seta = uma rotina entrega algo que a outra usa" : " · estas rotinas não passam nada umas para as outras"}</p>
              {etapa && fEtapa && (
                <aside className="absolute z-20 bg-[var(--bg-secondary)] shadow-2xl overflow-y-auto p-4 pb-20 border-[var(--border)] inset-x-0 bottom-0 max-h-[62%] border-t rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[360px] sm:max-h-none sm:border-t-0 sm:border-l sm:rounded-none">
                  <button onClick={() => setEscolha(null)} aria-label="Fechar" className="float-right text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-[var(--text-muted)]">{nomeDoFluxo(fEtapa)}</p>
                    <h3 className="text-base font-semibold">{etapa.data.icon} {nivel < 3 ? etapa.data.leigo?.rotulo || etapa.data.label : etapa.data.label}</h3>
                    {(() => {
                      const titEtapa = nivel < 3 ? etapa.data.leigo?.rotulo || etapa.data.label : etapa.data.label;
                      const desc = (nivel < 3 ? etapa.data.leigo?.frase : null) || etapa.data.details || "Sem descrição ainda.";
                      return repete(titEtapa, desc) ? null : <p className="text-[var(--text-secondary)] whitespace-pre-line">{desc}</p>;
                    })()}
                    {(etapa.data.leigo?.quem || (nivel === 3 ? etapa.data.executor : undefined)) && <p className="text-xs"><span className="text-[var(--text-muted)]">Quem faz: </span>{etapa.data.leigo?.quem || etapa.data.executor}</p>}
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
