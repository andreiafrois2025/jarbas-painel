"use client";

import { useEffect, useMemo, useState } from "react";
import type { FlowDoc, FlowDocEdge, FlowDocNode } from "@/lib/types";
import { rascunhosApi, type Rascunho } from "@/lib/flow/rascunhos";
import { layoutVertical, tamanhoDoTipo, verticaliza } from "@/lib/flow/layout";
import FlowCanvas from "./FlowCanvas";
import FlowViewer, { type Selecao } from "./FlowViewer";
import VozNovoFluxo from "./VozNovoFluxo";

// =============================================
// Rascunho de fluxo (criado por voz). Editável: mover, renomear, apagar, adicionar etapa.
// Selo fixo "RASCUNHO · nada roda". Aprovar só muda o estado e registra:
// NÃO constrói nem liga automação.
// =============================================

const assinatura = (nodes: FlowDocNode[], edges: FlowDocEdge[], titulo: string) =>
  JSON.stringify([
    titulo,
    nodes.map((n) => [n.id, n.type, n.data.label, n.data.details, n.data.executor, n.data.icon, Math.round(n.position.x), Math.round(n.position.y)]),
    edges.map((e) => [e.id, e.source, e.target, e.label, e.sourceHandle, e.targetHandle]),
  ]);

interface Props {
  id: string;
  onVoltar: () => void;
  avisar: (m: string) => void;
}

export default function RascunhoFluxo({ id, onVoltar, avisar }: Props) {
  const [r, setR] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [desenho, setDesenho] = useState<{ nodes: FlowDocNode[]; edges: FlowDocEdge[] }>({ nodes: [], edges: [] });
  const [base, setBase] = useState("");
  const [versao, setVersao] = useState(0);
  const [voz, setVoz] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [confirma, setConfirma] = useState<"aprovar" | "descartar" | null>(null);
  const [sel, setSel] = useState<Selecao>(null);

  const carrega = (d: Rascunho) => {
    const v = verticaliza({ nodes: d.nodes, edges: d.edges });
    setR(d);
    setTitulo(d.titulo);
    setDesenho({ nodes: v.nodes, edges: v.edges });
    setBase(assinatura(v.nodes, v.edges, d.titulo));
    setVersao((x) => x + 1);
  };

  useEffect(() => {
    rascunhosApi.obter(id).then(carrega).catch((e) => setErro((e as Error).message));
  }, [id]);

  const sujo = r?.estado === "rascunho" && assinatura(desenho.nodes, desenho.edges, titulo) !== base;

  const flowParaCanvas = useMemo<FlowDoc>(
    () => ({ id, title: titulo, category: "automation", nodes: desenho.nodes, edges: desenho.edges }),
    // o canvas só reinicia quando a versão muda (carregou/refez), não a cada arrastada
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, versao],
  );

  const salvar = async (silencioso = false) => {
    if (!r) return null;
    setOcupado(true);
    try {
      const novo = await rascunhosApi.salvar(r.id, { titulo: titulo.trim() || "Fluxo sem nome", description: r.description, nodes: desenho.nodes, edges: desenho.edges });
      setR(novo);
      setBase(assinatura(desenho.nodes, desenho.edges, titulo));
      if (!silencioso) avisar("Rascunho salvo.");
      return novo;
    } catch (e) { avisar((e as Error).message); return null; }
    finally { setOcupado(false); }
  };

  const aprovar = async () => {
    if (!r) return;
    setOcupado(true);
    try {
      if (sujo) { const s = await salvar(true); if (!s) return; }
      const novo = await rascunhosApi.aprovar(r.id);
      setR(novo);
      setConfirma(null);
      avisar("Aprovado. Nada foi construído: o Jarbas é avisado e você decide a construção com ele.");
    } catch (e) { avisar((e as Error).message); }
    finally { setOcupado(false); }
  };

  const descartar = async () => {
    if (!r) return;
    setOcupado(true);
    try { await rascunhosApi.descartar(r.id); avisar("Rascunho descartado."); onVoltar(); }
    catch (e) { avisar((e as Error).message); setOcupado(false); }
  };

  if (erro) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm" style={{ color: "var(--danger)" }}>Não consegui abrir o rascunho: {erro}</p>
        <button onClick={onVoltar} className="text-sm px-3 py-2 rounded-lg border border-[var(--border)] cursor-pointer">← Voltar aos fluxos</button>
      </div>
    );
  }
  if (!r) return <div className="flex-1 flex items-center justify-center"><span className="text-sm text-[var(--text-muted)] animate-pulse">abrindo o rascunho…</span></div>;

  const aprovado = r.estado === "aprovado";
  const btn = "text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap disabled:opacity-40";

  // visão só-leitura (aprovado)
  const nosLeitura = desenho.nodes.map((n) => ({ id: n.id, type: n.type, label: n.data.label, icon: n.data.icon, details: n.data.details, position: n.position }));
  const setasLeitura = desenho.edges.map((e) => ({ ...e, isReturn: !!e.isReturn }));
  const posAuto = layoutVertical(desenho.nodes.map((n) => ({ id: n.id, ...tamanhoDoTipo(n.type) })), desenho.edges.map((e) => ({ source: e.source, target: e.target, retorno: e.isReturn })));

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 md:px-4 py-2 flex items-center gap-x-3 gap-y-2 flex-wrap shrink-0">
        <button onClick={() => { if (sujo && !window.confirm("Há mudanças não salvas neste rascunho. Sair mesmo assim?")) return; onVoltar(); }} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap">← Voltar</button>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={aprovado ? { background: "#D4E8E8", color: "#2D6B6B" } : { background: "#FFF9C4", color: "#8A6D1B", border: "1px solid #C4A460" }}
        >
          {aprovado ? "APROVADO · aguardando o Jarbas construir · nada roda" : "RASCUNHO · nada roda"}
        </span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={aprovado}
          aria-label="Nome do fluxo"
          className="flex-1 basis-48 min-w-0 text-base font-semibold bg-transparent border-b border-dashed border-[var(--border)] focus:outline-none focus:border-[var(--accent)] px-1 py-0.5"
        />
        {!aprovado && (
          <>
            <button className={btn} disabled={ocupado} onClick={() => setVoz(true)} title="Fala de novo e o desenho é refeito">🎙 Refazer por voz</button>
            <button className={btn} disabled={ocupado || !sujo} onClick={() => salvar()}>{sujo ? "💾 Salvar rascunho" : "💾 Salvo"}</button>
            {confirma === "aprovar" ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">Isso NÃO constrói nada.</span>
                <button className="text-sm px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "var(--accent, #2D6B6B)" }} disabled={ocupado} onClick={aprovar}>Confirmar aprovação</button>
                <button className={btn} onClick={() => setConfirma(null)}>Voltar</button>
              </span>
            ) : confirma === "descartar" ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">Apagar este rascunho?</span>
                <button className="text-sm px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "var(--danger)" }} disabled={ocupado} onClick={descartar}>Apagar</button>
                <button className={btn} onClick={() => setConfirma(null)}>Voltar</button>
              </span>
            ) : (
              <>
                <button className="text-sm px-3 py-1.5 rounded-lg text-white cursor-pointer whitespace-nowrap disabled:opacity-40" style={{ background: "var(--accent, #2D6B6B)" }} disabled={ocupado} onClick={() => setConfirma("aprovar")}>✅ Aprovar</button>
                <button className={btn} disabled={ocupado} onClick={() => setConfirma("descartar")} aria-label="Descartar rascunho">🗑</button>
              </>
            )}
          </>
        )}
      </div>

      {r.description && <p className="px-4 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border-b border-[var(--border)] shrink-0">{r.description}</p>}

      <div className="flex-1 min-h-0 relative">
        {aprovado ? (
          <FlowViewer
            nos={nosLeitura}
            setas={setasLeitura}
            selecao={sel}
            onSelect={setSel}
            editando={false}
            posicoesAuto={Object.fromEntries([...posAuto].map(([k, v]) => [k, { x: v.x, y: v.y }]))}
          />
        ) : (
          <FlowCanvas
            key={versao}
            flow={flowParaCanvas}
            onChange={(u) => setDesenho(u)}
          />
        )}
      </div>

      {voz && (
        <VozNovoFluxo
          refazerId={r.id}
          onFechar={() => setVoz(false)}
          onPronto={(novo) => { setVoz(false); carrega(novo); avisar("Desenho refeito."); }}
        />
      )}
    </div>
  );
}
