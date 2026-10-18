"use client";

import { useEffect, useMemo, useState } from "react";
import type { FlowDoc, FlowDocEdge, FlowDocNode } from "@/lib/types";
import type { AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import {
  montaDesenho, montaResumo, termosDoTexto, caminhoDeArquivo, ehAposentada,
  descricaoLimpa, avaliaSaude, SELO_SAUDE, tempoDesde, primeiraFrase,
  type Nivel, type Peca, type Desenho,
} from "@/lib/radiografia";
import { layoutVertical, layoutHorizontal, pontasHorizontal, verticaliza, horizontaliza, temSobreposicao } from "@/lib/flow/layout";
import { medePeca, type Medida } from "@/lib/flow/medida";
import { aplicaLeigo, leigoDoFluxo, quemNoBalao } from "@/lib/flow/leigo";
import { nomeDoFluxo } from "@/lib/flow/macro-fluxos";
import FlowViewer, { type Selecao, type NoVis, type SetaVis } from "./FlowViewer";
import FlowCanvas from "./FlowCanvas";
import { BotoesNivel, BlocoProcesso, useMedida, useFontes, type Bolinha } from "./PaginaPartes";
import { toMermaid, toPrompt, copy, download } from "./FlowExport";
import CodigoReal, { nomeCurto } from "./CodigoReal";
import { TYPE_LABEL, STROKE_BY_TYPE } from "./RoughNode";

// =============================================
// A página de UM fluxo (v3, 18/10/2026), na estrutura do mapa radiografado:
//   nome simples + 1 frase + quando roda/saúde, 3 botões de nível, "O processo do início ao fim"
//   (Começa / Termina / bolinhas numeradas) e, embaixo, o diagrama.
//  - v3.1: níveis Leigo e Intermediário falam em português simples (textos do curador, em data.leigo);
//    nome de arquivo, comando e horário em UTC só aparecem no nível Código
//  - cada peça tem o tamanho do texto que carrega (medida em lib/flow/medida.ts)
//  - o diagrama é HORIZONTAL no computador e vertical só quando a área tem menos de 700px
//  - fora do modo Editar, arrastar só passeia; no modo Editar move peças e setas e salva sozinho
//  - clicar numa bolinha destaca a peça no desenho (e vice-versa); o detalhe abre à direita só ao clicar
// =============================================

interface Props {
  flow: FlowDoc;
  automacao: AutomacaoApiItem | null;
  relogioMudouEm: string | null;
  nivel: Nivel;
  onNivel: (n: Nivel) => void;
  /** abre já no editor completo (renomear, adicionar, apagar) — usado depois de duplicar */
  editorInicial?: boolean;
  saveState: "idle" | "saving" | "saved";
  grupo?: { slug: string; titulo: string; icone: string } | null;
  onAbrirGrupo?: () => void;
  onDuplicate: () => void;
  onCanvasChange: (u: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => void;
  avisar: (msg: string) => void;
  /** o script desta rotina mudou depois do desenho (descoberto pelo curador) */
  scriptMudou?: { script_mudou_em: string; desenho_em: string } | null;
}

export default function FlowRadiografia({
  flow, automacao, relogioMudouEm, nivel, onNivel, editorInicial, saveState, grupo, onAbrirGrupo, onDuplicate, onCanvasChange, avisar, scriptMudou,
}: Props) {
  const [sel, setSel] = useState<Selecao>(null);
  const [foco, setFoco] = useState<{ id: string; n: number } | null>(null);
  const [editando, setEditando] = useState(false);
  const [completo, setCompleto] = useState(!!editorInicial);
  const [menu, setMenu] = useState(false);
  const [areaRef, area] = useMedida<HTMLDivElement>();
  const vertical = area.w > 0 && area.w < 700;

  const cron = automacao ? interpretaCron(automacao.agenda) : null;
  const aposentada = ehAposentada(flow);
  const desatualizado = !!(relogioMudouEm && flow.updated_at && new Date(relogioMudouEm) > new Date(flow.updated_at));
  const saude = automacao && cron ? avaliaSaude(automacao.ultima_execucao, cron.frequenciaMin) : null;

  const fv = useFontes(); // sobe quando a fonte do desenho carrega (as peças são remedidas)
  const lf = useMemo(() => leigoDoFluxo(flow), [flow]);
  // textos mostrados: simples nos níveis 1 e 2, originais no 3. Só para MOSTRAR: nunca é o que se salva.
  const flowTxt = useMemo(() => aplicaLeigo(flow, nivel), [flow, nivel]);
  const flowSimples = useMemo(() => aplicaLeigo(flow, 1), [flow]);
  const d1 = useMemo(() => montaDesenho(flowSimples, 1), [flowSimples]);
  const d2 = useMemo(() => montaDesenho(flowTxt, 2), [flowTxt]);
  const desenho: Desenho = nivel === 1 ? d1 : d2; // o nível 3 usa o desenho do 2 (mesmas peças)
  const resumo = useMemo(() => {
    const r = montaResumo(desenho, nivel, 99);
    // nos níveis 1 e 2, "começa" e "termina" são os textos simples do curador
    return nivel < 3 && lf ? { ...r, inicio: lf.comeca, fim: lf.termina } : r;
  }, [desenho, nivel, lf]);
  const modoEditar = editando && nivel !== 1;

  // texto de "arquivo/comando" de uma peça (nível 3)
  const arquivoDe = (p: Peca): string => {
    const m = p.membros[0];
    const ex = m.data.executor;
    const caminho = caminhoDeArquivo(ex) || ex || "";
    if (m.type === "start" && automacao) return [automacao.agenda ? `cron ${automacao.agenda} UTC` : "", automacao.script || caminho].filter(Boolean).join(" · ");
    return caminho;
  };

  // bolinhas numeradas
  const bolinhas: Bolinha[] = resumo.passos.map((p) => {
    const peca = desenho.pecas.find((x) => x.id === p.id)!;
    const frase = nivel === 1
      ? peca.membros.map((m) => primeiraFrase(m.data.details)).filter(Boolean).join(" ")
      : primeiraFrase(peca.membros[0].data.details);
    const cod = peca.membros[0].data.codigo;
    if (nivel === 3 && cod) {
      return { id: p.id, titulo: p.t, frase: cod.explicacao_tecnica || frase, codigo: `${nomeCurto(cod.arquivo)}:${cod.linhas}` };
    }
    return { id: p.id, titulo: p.t, frase, codigo: nivel === 3 ? arquivoDe(peca) || undefined : undefined };
  });

  // ── Vista vertical (celular) e horizontal (computador) ──
  const larguraMax = Math.max(480, area.w / 0.8 - 80);

  // o que cada peça mostra (nível 3: o nome do arquivo no lugar do "quem faz") e o tamanho que o texto pede
  const { txt, medidas, rotulos } = useMemo(() => {
    const rotulo3 = (tipo: FlowDocNode["type"], id: string) => {
      const pe = d2.pecas.find((p) => p.id === id);
      const cod = pe?.membros[0].data.codigo;
      if (cod) return `${nomeCurto(cod.arquivo)}:${cod.linhas}`;
      const s = pe ? arquivoDe(pe) : "";
      return tipo === "start" ? (automacao?.script ? automacao.script.split("/").pop() : s) : (s.split("/").pop() || s || undefined);
    };
    const t = new Map<string, { label: string; icon?: string; details?: string; executor?: string }>();
    const m = new Map<string, Medida>();
    for (const n of flowTxt.nodes) {
      const executor = nivel === 3 ? rotulo3(n.type, n.id) : quemNoBalao(n.data.executor);
      t.set(n.id, { label: n.data.label, icon: n.data.icon, details: n.data.details, executor });
      m.set(n.id, medePeca(n.type, n.data.label, executor, n.data.icon));
    }
    return { txt: t, medidas: m, rotulos: Object.fromEntries(flowTxt.edges.map((e) => [e.id, e.label])) as Record<string, string | undefined> };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowTxt, nivel, d2, automacao, fv]);

  const auto2V = useMemo(
    () => verticaliza({ nodes: flow.nodes.map((n) => ({ ...n, data: { ...n.data, layoutV: undefined } })), edges: flow.edges.map((e) => ({ ...e, sourceHandle: undefined, targetHandle: undefined })) }, medidas),
    [flow, medidas],
  );
  // posições salvas que fazem peças se cobrirem (arrasto antigo, desenho velho) não valem: usa a arrumação automática
  const flowV = useMemo(() => {
    const v = verticaliza(flow, medidas);
    return v.salvo && temSobreposicao(v.nodes, medidas) ? auto2V : v;
  }, [flow, medidas, auto2V]);
  const hAuto = useMemo(
    () => (area.w ? horizontaliza({ nodes: flow.nodes.map((n) => ({ ...n, data: { ...n.data, posH: undefined } })), edges: flow.edges.map((e) => ({ ...e, sourceHandleH: undefined, targetHandleH: undefined })) }, larguraMax, medidas, rotulos) : null),
    [flow, larguraMax, area.w, medidas, rotulos],
  );
  const hSalvo = useMemo(() => {
    if (!area.w) return null;
    const h = horizontaliza(flow, larguraMax, medidas, rotulos);
    return h.salvo && hAuto && temSobreposicao(h.nodes, medidas) ? hAuto : h;
  }, [flow, larguraMax, area.w, medidas, rotulos, hAuto]);
  const flowParaEditarH = useMemo<FlowDoc | null>(() => (hSalvo ? { ...flow, nodes: hSalvo.nodes, edges: hSalvo.edges } : null), [flow, hSalvo]);
  const flowParaEditar = useMemo<FlowDoc>(() => ({ ...flow, nodes: flowV.nodes, edges: flowV.edges }), [flow, flowV]);

  const vista = useMemo(() => {
    if (!area.w) return null;
    // monta a peça do desenho com o texto que ela mostra neste nível (o desenho salvo continua com os textos originais)
    const noDe = (n: FlowDocNode, position: { x: number; y: number }): NoVis => {
      const t = txt.get(n.id)!;
      return { id: n.id, type: n.type, label: t.label, icon: t.icon, details: t.details, executor: t.executor, position };
    };
    const setaDe = (e: FlowDocEdge): SetaVis => ({ id: e.id, source: e.source, target: e.target, label: rotulos[e.id], isReturn: !!e.isReturn, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle });
    if (nivel === 1) {
      const caixas = d1.pecas.map((p) => ({ id: p.id, ...medePeca(p.type, p.label, undefined, p.icon), ordem: p.y }));
      const ligs = d1.setas.map((s) => ({ source: s.source, target: s.target, retorno: s.isReturn, rotulo: s.label }));
      if (vertical) {
        const pos = layoutVertical(caixas, ligs);
        const nos: NoVis[] = d1.pecas.map((p) => ({ id: p.id, type: p.type, label: p.label, icon: p.icon, details: p.membros[0]?.data.details, position: pos.get(p.id)! }));
        const setas: SetaVis[] = d1.setas.map((s) => ({ ...s, isReturn: !!s.isReturn, sourceHandle: s.isReturn ? "right" : "bottom", targetHandle: s.isReturn ? "right" : "top" }));
        return { nos, setas, auto: Object.fromEntries(nos.map((n) => [n.id, n.position])), setasAuto: setas };
      }
      const pos = layoutHorizontal(caixas, ligs, larguraMax);
      const nos: NoVis[] = d1.pecas.map((p) => ({ id: p.id, type: p.type, label: p.label, icon: p.icon, details: p.membros[0]?.data.details, position: pos.get(p.id)! }));
      const setas: SetaVis[] = d1.setas.map((s) => {
        const pt = pontasHorizontal(pos.get(s.source), pos.get(s.target), s.isReturn);
        return { ...s, isReturn: pt.volta, sourceHandle: pt.sourceHandle, targetHandle: pt.targetHandle };
      });
      return { nos, setas, auto: Object.fromEntries(nos.map((n) => [n.id, n.position])), setasAuto: setas };
    }
    if (vertical) {
      const nos: NoVis[] = flowV.nodes.map((n) => noDe(n, n.position));
      const setas: SetaVis[] = flowV.edges.map(setaDe);
      return { nos, setas, auto: Object.fromEntries(auto2V.nodes.map((n) => [n.id, n.position])), setasAuto: auto2V.edges.map(setaDe) };
    }
    const h = hSalvo!;
    const nos: NoVis[] = h.nodes.map((n) => noDe(n, n.position));
    return { nos, setas: h.edges.map(setaDe), auto: hAuto!.auto, setasAuto: hAuto!.edges.map(setaDe) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel, vertical, d1, txt, rotulos, flowV, auto2V, hSalvo, hAuto, larguraMax, area.w]);

  // grava (chamado pelo viewer, com atraso, só no modo Editar)
  const salvarPosicoes = (pos: { id: string; x: number; y: number }[], ss: SetaVis[]) => {
    if (vertical) {
      const nodes: FlowDocNode[] = flowV.nodes.map((n) => {
        const p = pos.find((x) => x.id === n.id);
        return p ? { ...n, position: { x: p.x, y: p.y }, data: { ...n.data, layoutV: 1 } } : n;
      });
      const edges: FlowDocEdge[] = ss.map((s) => {
        const velha = flow.edges.find((e) => e.id === s.id);
        // o rótulo mostrado pode ser o simples: ao salvar, o original é o que vale
        return { ...(velha || {}), id: s.id, source: s.source, target: s.target, label: velha ? velha.label : s.label, isReturn: s.isReturn, sourceHandle: s.sourceHandle, targetHandle: s.targetHandle };
      });
      onCanvasChange({ nodes, edges });
      return;
    }
    const nodes: FlowDocNode[] = flow.nodes.map((n) => {
      const p = pos.find((x) => x.id === n.id);
      return p ? { ...n, data: { ...n.data, posH: { x: p.x, y: p.y } } } : n;
    });
    const edges: FlowDocEdge[] = ss.map((s) => {
      const velha = flow.edges.find((e) => e.id === s.id);
      return { ...(velha || {}), id: s.id, source: s.source, target: s.target, label: velha ? velha.label : s.label, isReturn: velha ? velha.isReturn : s.isReturn, sourceHandleH: s.sourceHandle, targetHandleH: s.targetHandle };
    });
    onCanvasChange({ nodes, edges });
  };

  // o editor completo mostra o desenho deitado: o que ele devolve vai para posH / pontas H, e a vista de celular fica intacta
  const salvarDoEditorH = (u: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => {
    const ymax = flow.nodes.reduce((m, n) => Math.max(m, n.position?.y ?? 0), 0);
    const nodes: FlowDocNode[] = u.nodes.map((n) => {
      const velho = flow.nodes.find((x) => x.id === n.id);
      return { id: n.id, type: n.type, position: velho ? velho.position : { x: 0, y: ymax + 190 }, data: { ...n.data, posH: { x: Math.round(n.position.x), y: Math.round(n.position.y) } } };
    });
    const edges: FlowDocEdge[] = u.edges.map((e) => {
      const velha = flow.edges.find((x) => x.id === e.id);
      return { ...(velha || { sourceHandle: "bottom", targetHandle: "top" }), id: e.id, source: e.source, target: e.target, label: e.label, isReturn: e.isReturn, sourceHandleH: e.sourceHandle, targetHandleH: e.targetHandle };
    });
    onCanvasChange({ nodes, edges });
  };

  const trocaNivel = (novo: Nivel) => {
    // mantém a peça escolhida ao trocar de nível (leigo agrupa, então mapeia)
    if (sel?.tipo === "peca") {
      if (novo === 1) {
        const lider = d1.mapa.get(sel.id);
        setSel(lider ? { tipo: "peca", id: lider } : null);
      } else if (nivel === 1) {
        const p = d1.pecas.find((x) => x.id === sel.id);
        setSel(p ? { tipo: "peca", id: p.membros[0].id } : null);
      }
    } else if (sel?.tipo === "seta") {
      setSel(null);
    }
    if (novo === 1) setEditando(false);
    onNivel(novo);
    setMenu(false);
  };

  const escolheBolinha = (id: string) => {
    setSel({ tipo: "peca", id });
    setFoco((f) => ({ id, n: (f?.n || 0) + 1 }));
  };

  const ligaEditar = () => {
    if (editando) { setEditando(false); return; }
    if (nivel === 1) onNivel(2);
    setSel(null);
    setEditando(true);
  };

  // atalhos: 1/2/3 trocam o nível, Esc fecha o painel
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (completo) return;
      if (e.key === "1" || e.key === "2" || e.key === "3") trocaNivel(Number(e.key) as Nivel);
      else if (e.key === "Escape") { setSel(null); setMenu(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, sel, d1, nivel]);

  const pecaSel = sel?.tipo === "peca" ? desenho.pecas.find((p) => p.id === sel.id) || null : null;
  const setaSel = sel?.tipo === "seta" ? desenho.setas.find((s) => s.id === sel.id) || null : null;
  const painelAberto = !!(pecaSel || setaSel);
  const titulo = nomeDoFluxo(flow);
  const sub = nivel < 3 && lf ? lf.frase : descricaoLimpa(flow);

  const itemMenu = "w-full text-left text-sm px-3 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" onClick={() => menu && setMenu(false)}>
      <div className="px-3 md:px-6 pt-4 pb-24 space-y-3 max-w-[2000px]">
        {/* ── Cabeçalho: título, subtítulo, ações ── */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1 basis-64">
            {grupo && (
              <button onClick={onAbrirGrupo} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer mb-0.5">
                ← {grupo.icone} {grupo.titulo}
              </button>
            )}
            <h2 className="text-xl md:text-2xl font-semibold leading-tight">{titulo}</h2>
            {sub && <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[90ch]" title={sub} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sub}</p>}
            <p className="text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
              {cron && <span className="text-[var(--text-secondary)]">⏰ {cron.descricao}</span>}
              {aposentada ? (
                <span style={{ color: "var(--danger)" }} title="A revisão semanal viu que esta rotina não está mais no relógio do servidor">⛔ não roda mais</span>
              ) : saude ? (
                <span style={{ color: SELO_SAUDE[saude].cor }} title={automacao ? `Último sinal de vida: ${tempoDesde(automacao.ultima_execucao)}` : undefined}>{SELO_SAUDE[saude].bolinha} {SELO_SAUDE[saude].texto}</span>
              ) : null}
            </p>
            {/* detalhes de bastidor: só no nível Código */}
            {nivel === 3 && (
              <p className="text-[11px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5 items-center text-[var(--text-muted)]">
                {flow.title !== titulo && <span className="font-mono break-all">{flow.title}</span>}
                {automacao && <span>última execução: {tempoDesde(automacao.ultima_execucao)}</span>}
                {desatualizado && !aposentada && <span style={{ color: "var(--warning)" }} title="O relógio da VPS mudou depois da última vez que este desenho foi mexido">✏️ desenho pode estar atrasado</span>}
                {scriptMudou && !aposentada && <span style={{ color: "var(--warning)" }} title={`O código mudou em ${new Date(scriptMudou.script_mudou_em).toLocaleDateString("pt-BR")}, depois do desenho`}>✏️ desenho pode estar velho: o código mudou depois dele</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveState === "saving" && <span className="text-xs text-[var(--text-muted)]">salvando…</span>}
            {saveState === "saved" && <span className="text-xs text-[var(--success)]">salvo ✓</span>}
            {!completo && (
              <button
                onClick={ligaEditar}
                className="text-sm px-3 py-2 rounded-lg border cursor-pointer whitespace-nowrap"
                style={modoEditar ? { background: "var(--accent, #2D6B6B)", color: "#fff", borderColor: "var(--accent, #2D6B6B)" } : { borderColor: "var(--border)" }}
                title={modoEditar ? "Terminar de editar" : "Mover peças e setas (salva sozinho)"}
              >
                {modoEditar ? "✓ Pronto" : "✏️ Editar"}
              </button>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} aria-label="Mais opções" aria-expanded={menu} className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-tertiary)] cursor-pointer">⋯</button>
              {menu && (
                <div className="absolute right-0 top-full mt-1 z-40 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl py-1">
                  <button className={itemMenu} onClick={() => { setCompleto((v) => !v); setEditando(false); setMenu(false); }}>{completo ? "← Voltar ao mapa" : "🛠 Editor completo (renomear, adicionar, apagar etapas)"}</button>
                  <button className={itemMenu} onClick={async () => { await copy(toMermaid(flow)); avisar("Mermaid copiado, cola em qualquer IA."); setMenu(false); }}>📋 Copiar como Mermaid</button>
                  <button className={itemMenu} onClick={async () => { await copy(toPrompt(flow)); avisar("Descrição copiada, cola em qualquer IA."); setMenu(false); }}>📝 Copiar como texto (prompt)</button>
                  <button className={itemMenu} onClick={() => { download(`${flow.title}.json`, JSON.stringify(flow, null, 2), "application/json"); setMenu(false); }}>💾 Baixar JSON</button>
                  <a
                    href={`https://claude.ai/new?q=${encodeURIComponent(`Me explique este fluxo como se eu fosse leiga e depois em detalhes técnicos, e diga o que pode dar errado:\n\n${toPrompt(flow)}`.slice(0, 6000))}`}
                    target="_blank" rel="noopener noreferrer"
                    className={`${itemMenu} block`}
                  >↗ Perguntar no claude.ai</a>
                  {flow.is_seed && <button className={itemMenu} onClick={() => { onDuplicate(); setMenu(false); }}>⎘ Duplicar (para editar sem o curador mexer)</button>}
                </div>
              )}
            </div>
          </div>
        </div>

        <BotoesNivel nivel={nivel} onMuda={trocaNivel} />
        <BlocoProcesso
          comeca={resumo.inicio}
          termina={resumo.fim}
          bolinhas={bolinhas}
          selecionada={sel?.tipo === "peca" ? sel.id : null}
          onEscolher={escolheBolinha}
        />

        {/* ── O diagrama, embaixo ── */}
        <div
          ref={areaRef}
          className="relative rounded-xl overflow-hidden"
          style={{
            height: "clamp(420px, calc(100dvh - 150px), 1400px)",
            border: modoEditar ? "2px dashed var(--accent, #2D6B6B)" : "1px solid var(--border)",
          }}
        >
          {completo ? (
            <>
              {vertical || !hSalvo ? (
                <FlowCanvas flow={flowParaEditar} onChange={onCanvasChange} />
              ) : (
                // mesmo desenho deitado do modo de leitura (não pula para a vista de celular)
                <FlowCanvas flow={flowParaEditarH!} onChange={salvarDoEditorH} horizontal />
              )}
              <button
                onClick={() => setCompleto(false)}
                className="absolute top-3 right-3 z-30 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                ← Voltar ao mapa
              </button>
            </>
          ) : vista ? (
            <>
              <FlowViewer
                key={`${flow.id}-${nivel}-${vertical ? "v" : "h"}`}
                nos={vista.nos}
                setas={vista.setas}
                selecao={sel}
                onSelect={setSel}
                editando={modoEditar}
                onSalvar={salvarPosicoes}
                posicoesAuto={vista.auto}
                setasAuto={vista.setasAuto}
                foco={foco}
                semMiniMapa={painelAberto || vertical}
              />
              {painelAberto && (
                <aside className="absolute z-20 bg-[var(--bg-secondary)] shadow-2xl overflow-y-auto p-4 pb-20 border-[var(--border)] inset-x-0 bottom-0 max-h-[62%] border-t rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[380px] sm:max-h-none sm:border-t-0 sm:border-l sm:rounded-none">
                  {pecaSel ? (
                    <PainelPeca
                      key={pecaSel.id + nivel}
                      peca={pecaSel}
                      nivel={nivel}
                      flow={flow}
                      desenho={desenho}
                      d1={d1}
                      automacao={automacao}
                      cronDescricao={cron?.descricao}
                      onSelect={setSel}
                      onIrParaLeigo={(id) => { onNivel(1); setSel({ tipo: "peca", id }); }}
                      avisar={avisar}
                    />
                  ) : setaSel ? (
                    <PainelSeta key={setaSel.id} seta={setaSel} desenho={desenho} onSelect={setSel} />
                  ) : null}
                </aside>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Painéis ─────────────────────────────────────────────────────────────
export function BlocoScript({ automacao, avisar }: { automacao: AutomacaoApiItem | null; avisar: (m: string) => void }) {
  if (!automacao) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[var(--border-light)] p-3 text-xs text-[var(--text-secondary)]">
        Este fluxo não está ligado a uma linha do relógio da VPS (squad, rotina manual ou reação a um evento), então não há comando de cron para mostrar.
      </div>
    );
  }
  return (
    <div className="mt-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">📄 Script principal</h3>
      {automacao.script ? <CaminhoCopiavel valor={automacao.script} avisar={avisar} /> : <p className="text-xs text-[var(--text-muted)]">a squad-api não indicou o script</p>}
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-3 mb-1">⌨️ Comando do cron <span className="normal-case">({automacao.agenda} UTC)</span></h3>
      <Codigo texto={automacao.comando} />
    </div>
  );
}

export function PainelPeca({ peca, nivel, flow, desenho, d1, automacao, cronDescricao, onSelect, onIrParaLeigo, avisar }: {
  peca: Peca;
  nivel: Nivel;
  flow: FlowDoc;
  desenho: Desenho;
  d1: Desenho;
  automacao: AutomacaoApiItem | null;
  cronDescricao?: string;
  onSelect: (s: Selecao) => void;
  onIrParaLeigo: (id: string) => void;
  avisar: (m: string) => void;
}) {
  const m0: FlowDocNode = peca.membros[0];
  const vem = desenho.setas.filter((s) => s.target === peca.id);
  const vai = desenho.setas.filter((s) => s.source === peca.id);
  const porId = new Map(desenho.pecas.map((p) => [p.id, p]));
  const tags = [...new Set(peca.membros.flatMap((m) => m.data.tags || []))].filter((t) => nivel === 3 || !/^(rss|supabase|cron|api|painel)$/i.test(t));
  const executores = [...new Set(peca.membros.map((m) => m.data.executor).filter(Boolean) as string[])];
  const textos = peca.membros.flatMap((m) => [m.data.label, m.data.details, m.data.executor, ...(m.data.tags || [])]);
  if (nivel === 3 && m0.type === "start" && cronDescricao) textos.push("cron UTC");
  const extras = peca.membros.flatMap((m) => m.data.glossario || []);
  const termos = termosDoTexto(textos, extras);
  const lider = nivel > 1 ? d1.mapa.get(peca.id) : null;
  const liderPeca = lider ? d1.pecas.find((p) => p.id === lider) : null;

  return (
    <div>
      <div className="flex items-start gap-2 mb-1">
        <span className="text-2xl leading-none">{peca.icon || "▫️"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">{peca.label}</h3>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: STROKE_BY_TYPE[peca.type] }}>{TYPE_LABEL[peca.type]}</span>
        </div>
        <button onClick={() => onSelect(null)} aria-label="Fechar detalhe" className="text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
      </div>

      {nivel > 1 && liderPeca && (
        <button onClick={() => onIrParaLeigo(liderPeca.id)} className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer mb-2 text-left">
          📍 No nível Leigo isto é parte de: {liderPeca.label}
        </button>
      )}

      {/* Nível 1: só o que acontece, em português de gente */}
      {nivel === 1 && (
        <div className="space-y-2 text-sm mt-2">
          {peca.membros.map((m) => (
            <div key={m.id}>
              {peca.membros.length > 1 && <p className="font-medium">{m.data.icon} {m.data.label}</p>}
              <p className="text-[var(--text-secondary)]">{primeiraFrase(m.data.details) || "Sem descrição ainda."}</p>
            </div>
          ))}
          {tags.length > 0 && <p className="text-xs text-[var(--text-muted)]">usa: {tags.join(", ")}</p>}
          {m0.type === "start" && cronDescricao && <p className="text-xs text-[var(--text-muted)]">⏰ {cronDescricao}</p>}
        </div>
      )}

      {/* Nível 2: peças e horários */}
      {nivel >= 2 && (
        <div className="space-y-2 text-sm mt-2">
          {m0.data.details ? (
            <p className="whitespace-pre-line text-[var(--text-secondary)]">{m0.data.details}</p>
          ) : (
            <p className="text-[var(--text-muted)]">Sem descrição ainda.</p>
          )}
          <Linha rotulo="Quem faz" valor={executores.join(", ") || "não informado"} />
          {tags.length > 0 && <Linha rotulo="Ferramentas" valor={tags.join(", ")} />}
          {m0.type === "start" && cronDescricao && <Linha rotulo="Quando" valor={cronDescricao} />}
        </div>
      )}

      {/* Nível 3: o arquivo e o trecho de verdade (lido do arquivo pelo curador) */}
      {nivel === 3 && (
        <div className="mt-3 space-y-2">
          {m0.data.codigo ? (
            <CodigoReal codigo={m0.data.codigo} avisar={avisar} />
          ) : (
            <>
              {executores.map((ex) => {
                const caminho = caminhoDeArquivo(ex);
                return caminho ? <CaminhoCopiavel key={ex} valor={caminho} avisar={avisar} /> : null;
              })}
              <div className="rounded-lg border border-dashed border-[var(--border-light)] p-3 text-xs text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text-primary)] mb-0.5">Sem trecho de código próprio</p>
                {m0.type === "start" || m0.type === "end"
                  ? "Esta etapa marca o começo ou o fim do fluxo e não tem uma linha de código só dela."
                  : executores.length
                    ? `Esta etapa é feita por ${executores.join(", ")}, sem um trecho de script dedicado.`
                    : "O curador não achou um trecho de código dedicado a esta etapa."}
              </div>
            </>
          )}
          {m0.type === "start" ? <BlocoScript automacao={automacao} avisar={avisar} /> : null}
        </div>
      )}

      {termos.length > 0 && (
        <details className="mt-4 rounded-lg border border-[var(--border)]">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium">📖 Glossário ({termos.length})</summary>
          <dl className="px-3 pb-3 space-y-2 text-xs">
            {termos.map((t) => (
              <div key={t.termo}>
                <dt className="font-semibold">{t.termo}</dt>
                <dd className="text-[var(--text-secondary)]">{t.definicao}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {(vem.length > 0 || vai.length > 0) && (
        <div className="mt-4 text-xs space-y-2">
          {vem.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Vem de</p>
              <div className="flex flex-wrap gap-1">
                {vem.map((s) => porId.get(s.source) && (
                  <button key={s.id} onClick={() => onSelect({ tipo: "peca", id: s.source })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">{porId.get(s.source)!.label}</button>
                ))}
              </div>
            </div>
          )}
          {vai.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Vai para</p>
              <div className="flex flex-wrap gap-1">
                {vai.map((s) => porId.get(s.target) && (
                  <button key={s.id} onClick={() => onSelect({ tipo: "peca", id: s.target })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    {s.label ? `${s.label}: ` : ""}{porId.get(s.target)!.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {nivel === 3 && <p className="mt-4 text-[10px] text-[var(--text-muted)] break-all">Fluxo: {flow.title}</p>}
    </div>
  );
}

export function PainelSeta({ seta, desenho, onSelect }: { seta: Desenho["setas"][number]; desenho: Desenho; onSelect: (s: Selecao) => void }) {
  const a = desenho.pecas.find((p) => p.id === seta.source);
  const b = desenho.pecas.find((p) => p.id === seta.target);
  if (!a || !b) return null;
  return (
    <div>
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-base font-semibold leading-tight flex-1">{a.label} → {b.label}</h3>
        <button onClick={() => onSelect(null)} aria-label="Fechar detalhe" className="text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {seta.isReturn
          ? `Volta atrás: depois de "${a.label}", o fluxo retorna para "${b.label}" e repete o trecho${seta.label ? ` (${seta.label})` : ""}.`
          : seta.label
            ? `Quando a resposta é "${seta.label}", o fluxo segue de "${a.label}" para "${b.label}".`
            : `Terminou "${a.label}", segue direto para "${b.label}".`}
      </p>
      <div className="flex gap-1 mt-3 text-xs">
        <button onClick={() => onSelect({ tipo: "peca", id: a.id })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">ver {a.label}</button>
        <button onClick={() => onSelect({ tipo: "peca", id: b.id })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">ver {b.label}</button>
      </div>
    </div>
  );
}

// ── Peças pequenas ──────────────────────────────────────────────────────
function Selo({ cor, titulo, children }: { cor: string; titulo?: string; children: React.ReactNode }) {
  return (
    <span title={titulo} className="text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ color: cor, borderColor: cor }}>
      {children}
    </span>
  );
}

function Botao({ onClick, titulo, children }: { onClick: () => void; titulo: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={titulo} className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap">
      {children}
    </button>
  );
}

export function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="text-xs">
      <span className="text-[var(--text-muted)]">{rotulo}: </span>
      <span className="text-[var(--text-primary)] break-words">{valor}</span>
    </p>
  );
}

export function Codigo({ texto }: { texto: string }) {
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded p-2 border border-[var(--border)] overflow-x-auto max-h-72">
      {texto}
    </pre>
  );
}

export function CaminhoCopiavel({ valor, avisar }: { valor: string; avisar: (m: string) => void }) {
  return (
    <button
      onClick={async () => { await copy(valor); avisar("Caminho copiado."); }}
      title="Copiar o caminho"
      className="w-full text-left font-mono text-[11px] bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer break-all"
    >
      📄 {valor} <span className="text-[var(--text-muted)]">· copiar</span>
    </button>
  );
}
