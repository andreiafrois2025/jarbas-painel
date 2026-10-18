"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FlowDoc, FlowGrupo } from "@/lib/types";
import { getFlowDocs, duplicateFlowDoc, updateFlowDoc, getFlowGrupos } from "@/lib/storage";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { semAcento, ehAposentada } from "@/lib/radiografia";
import FlowRadiografia from "./FlowRadiografia";
import GrupoPagina from "./GrupoPagina";
import RascunhoFluxo from "./RascunhoFluxo";
import VozNovoFluxo from "./VozNovoFluxo";
import { rascunhosApi, type RascunhoResumo } from "@/lib/flow/rascunhos";
import { montaMacros, nomeDoFluxo } from "@/lib/flow/macro-fluxos";
import { useLigacoesAuto, desenhoPodeEstarVelho } from "@/lib/flow/ligacoes";
import { useNivel, lerUltimaVista, guardarUltimaVista } from "@/lib/flow/nivel";
import { useUI } from "../ui";
import { usePainel } from "@/lib/painel-context";
import { ehPessoal } from "@/lib/modo";

// =============================================
// Mapa dos Fluxos (v3, 18/10/2026): UMA tela.
//  À esquerda, a lista (recolhível; no celular vira gaveta) com os grupos, cada um expansível
//  mostrando seus fluxos com a bolinha de saúde, mais "Rascunhos" e "Aposentadas".
//  À direita, o que foi escolhido: a página do grupo (diagrama em faixas) ou a do fluxo.
//  1 clique em qualquer fluxo abre. Abre no último visto (localStorage) ou no primeiro grupo.
//
// O endereço manda: ?macro=<slug> | ?fluxo=<id> | ?titulo=<título> | ?rascunho=<id>
// (Voltar do navegador desfaz exatamente um passo; sem ouvinte de popstate.)
// =============================================

export default function FlowsPageV2() {
  const router = useRouter();
  const base = usePathname() || "/producao/fluxos";
  const params = useSearchParams();
  const { avisar } = useUI();
  const { servidora } = usePainel();
  const [flows, setFlows] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [automacoes, setAutomacoes] = useState<AutomacaoApiItem[]>([]);
  const [relogioMudouEm, setRelogioMudouEm] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<RascunhoResumo[]>([]);
  const [vozAberta, setVozAberta] = useState(false);
  const [lista, setLista] = useState<boolean | null>(null); // null = ainda não escolheu (aberta no computador, fechada no celular)
  const [busca, setBusca] = useState("");
  const [grupos, setGrupos] = useState<FlowGrupo[] | null>(null); // null = migração 006 ainda não aplicada
  const ligacoesAuto = useLigacoesAuto();

  const idPedido = params.get("fluxo");
  const macroPedido = params.get("macro");
  const rascunhoPedido = params.get("rascunho");
  const tituloPedido = params.get("titulo");
  const nivelParam = params.get("nivel");
  const [nivel, setNivel] = useNivel(nivelParam);

  const carregaRascunhos = () => rascunhosApi.listar().then(setRascunhos).catch(() => setRascunhos([]));

  useEffect(() => {
    fetchCatalogo().then((c) => {
      setAutomacoes((c?.automacoes || []).filter((a) => !(servidora && ehPessoal(a.nome, a.descricao, a.comando))));
      setRelogioMudouEm(c?.crontab_modificado_em ?? null);
    });
    carregaRascunhos();
    getFlowGrupos().then(setGrupos).catch(() => setGrupos(null));
    getFlowDocs()
      // Modo Servidora: fluxos pessoais nem entram na lista
      .then((todos) => setFlows(servidora ? todos.filter((f) => !ehPessoal(f.title, f.description)) : todos))
      .catch((e) => console.error("Erro ao carregar fluxos:", e))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => {
    if (idPedido) return flows.find((f) => f.id === idPedido) || null;
    if (tituloPedido) return flows.find((f) => semAcento(f.title) === semAcento(tituloPedido)) || null;
    return null;
  }, [flows, idPedido, tituloPedido]);

  const automacaoDe = (f: FlowDoc) => automacoes.find((a) => a.flow && semAcento(a.flow) === semAcento(f.title)) || null;

  const macros = useMemo(() => montaMacros(flows, grupos), [flows, grupos]);
  const macro = macroPedido ? macros.find((m) => m.def.slug === macroPedido) || null : null;
  const grupoDoSelecionado = selected ? macros.find((m) => m.fluxos.some((f) => f.id === selected.id)) || null : null;
  const aposentadas = useMemo(() => flows.filter((f) => ehAposentada(f)), [flows]);

  const href = (q: string) => `${base}?${q}`;
  const abrirFluxo = (f: FlowDoc) => { router.push(href(`fluxo=${f.id}`)); if (typeof window !== "undefined" && window.innerWidth < 768) setLista(false); };
  const abrirGrupo = (slug: string) => { router.push(href(`macro=${slug}`)); if (typeof window !== "undefined" && window.innerWidth < 768) setLista(false); };

  // sem endereço: volta ao último visto, senão ao primeiro grupo
  useEffect(() => {
    if (loading || idPedido || macroPedido || rascunhoPedido || tituloPedido) return;
    const ultimo = lerUltimaVista();
    const [k, v] = (ultimo || "").split("=");
    if (k === "macro" && macros.some((m) => m.def.slug === v)) return router.replace(href(`macro=${v}`));
    if (k === "fluxo" && flows.some((f) => f.id === v)) return router.replace(href(`fluxo=${v}`));
    if (macros[0]) router.replace(href(`macro=${macros[0].def.slug}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, idPedido, macroPedido, rascunhoPedido, tituloPedido, macros, flows]);

  // lembra o que estava aberto
  useEffect(() => {
    if (selected) guardarUltimaVista(`fluxo=${selected.id}`);
    else if (macro) guardarUltimaVista(`macro=${macro.def.slug}`);
  }, [selected, macro]);

  const handleDuplicate = async (id: string) => {
    const f = await duplicateFlowDoc(id);
    setFlows(await getFlowDocs());
    router.push(href(`fluxo=${f.id}&nivel=editar`));
  };

  const handleCanvasChange = async (updates: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => {
    if (!selected) return;
    setSaveState("saving");
    try {
      await updateFlowDoc(selected.id, updates);
      setFlows((fs) => fs.map((f) => (f.id === selected.id ? { ...f, ...updates } : f)));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1400);
    } catch (e) {
      console.error("Erro ao salvar o desenho:", e);
      setSaveState("idle");
      avisar("Não consegui salvar o desenho. Tente de novo.");
    }
  };

  const termo = semAcento(busca.trim());
  const bate = (texto: string) => semAcento(texto).includes(termo);

  // ── Conteúdo à direita ──
  let conteudo: React.ReactNode;
  if (rascunhoPedido) {
    conteudo = <RascunhoFluxo key={rascunhoPedido} id={rascunhoPedido} onVoltar={() => { carregaRascunhos(); router.push(href(macros[0] ? `macro=${macros[0].def.slug}` : "")); }} avisar={avisar} />;
  } else if (loading || (!selected && !macro && !(idPedido || tituloPedido || macroPedido))) {
    conteudo = <Esqueleto />;
  } else if (selected) {
    conteudo = (
      <FlowRadiografia
        key={selected.id}
        flow={selected}
        automacao={automacaoDe(selected)}
        relogioMudouEm={relogioMudouEm}
        nivel={nivel}
        onNivel={setNivel}
        editorInicial={nivelParam === "editar"}
        saveState={saveState}
        scriptMudou={desenhoPodeEstarVelho(selected, ligacoesAuto)}
        grupo={grupoDoSelecionado ? { slug: grupoDoSelecionado.def.slug, titulo: grupoDoSelecionado.def.titulo, icone: grupoDoSelecionado.def.icone } : null}
        onAbrirGrupo={() => grupoDoSelecionado && abrirGrupo(grupoDoSelecionado.def.slug)}
        onDuplicate={() => handleDuplicate(selected.id)}
        onCanvasChange={handleCanvasChange}
        avisar={avisar}
      />
    );
  } else if (macro) {
    conteudo = (
      <GrupoPagina
        key={macro.def.slug}
        macro={macro}
        automacaoDe={automacaoDe}
        nivel={nivel}
        onNivel={setNivel}
        onAbrirFluxo={abrirFluxo}
        ligacoesAuto={ligacoesAuto}
      />
    );
  } else {
    conteudo = (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-center" style={{ color: "var(--danger)" }}>
        Não achei o que você abriu pelo endereço. Escolha na lista ao lado.
      </div>
    );
  }

  const ativoClasse = "bg-[var(--accent-soft,rgba(45,107,107,0.12))] font-semibold";
  const itemBusca = "w-full text-left px-2.5 py-2 rounded-md text-[13px] leading-snug cursor-pointer hover:bg-[var(--bg-tertiary)]";

  // (v3.5) busca: grupos, rotinas (inclusive aposentadas) e rascunhos que batem, numa lista simples
  const resultados = termo ? (
    <div className="space-y-0.5">
      {macros.filter((m) => bate(`${m.def.titulo} ${m.def.resumo}`)).map((m) => (
        <button key={`g-${m.def.slug}`} onClick={() => abrirGrupo(m.def.slug)} className={itemBusca}>{m.def.icone} <span className="font-medium">{m.def.titulo}</span></button>
      ))}
      {flows.filter((f) => bate(`${nomeDoFluxo(f)} ${f.description || ""}`)).map((f) => {
        const g = macros.find((m) => m.fluxos.some((x) => x.id === f.id));
        return (
          <button key={f.id} onClick={() => abrirFluxo(f)} className={`${itemBusca} ${selected?.id === f.id ? ativoClasse : ""}`}>
            <span className="block">{nomeDoFluxo(f)}{ehAposentada(f) ? " ⛔" : ""}</span>
            {g && <span className="block text-[11px] text-[var(--text-muted)]">{g.def.icone} {g.def.titulo}</span>}
          </button>
        );
      })}
      {rascunhos.filter((r) => bate(r.titulo)).map((r) => (
        <button key={r.id} onClick={() => { router.push(href(`rascunho=${r.id}`)); if (window.innerWidth < 768) setLista(false); }} className={`${itemBusca} ${rascunhoPedido === r.id ? ativoClasse : ""}`}>
          <span className="block">✏️ {r.titulo}</span>
          <span className="block text-[11px] text-[var(--text-muted)]">rascunho · nada roda</span>
        </button>
      ))}
    </div>
  ) : null;
  const semResultado = termo && resultados && !macros.some((m) => bate(`${m.def.titulo} ${m.def.resumo}`)) && !flows.some((f) => bate(`${nomeDoFluxo(f)} ${f.description || ""}`)) && !rascunhos.some((r) => bate(r.titulo));

  const painelLista = (
    <nav
      aria-label="Grupos de fluxos"
      className={`${lista === null ? "hidden md:flex" : lista ? "flex" : "hidden"} flex-col shrink-0 w-[300px] max-w-[86vw] border-r border-[var(--border)] bg-[var(--bg-secondary)] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl min-h-0`}
    >
      <div className="p-2.5 border-b border-[var(--border)] flex items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="buscar fluxo…"
          aria-label="Buscar fluxo"
          className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
        <button onClick={() => setLista(false)} aria-label="Recolher a lista" title="Recolher a lista" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 cursor-pointer">«</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && <p className="text-xs text-[var(--text-muted)] animate-pulse p-2">carregando…</p>}
        {termo ? (
          <>
            {resultados}
            {semResultado && <p className="text-xs text-[var(--text-muted)] p-2">Nada encontrado para «{busca}».</p>}
          </>
        ) : (
          macros.map((m) => {
            const ativo = macro?.def.slug === m.def.slug || grupoDoSelecionado?.def.slug === m.def.slug;
            return (
              <button
                key={m.def.slug}
                onClick={() => abrirGrupo(m.def.slug)}
                title={m.def.resumo}
                aria-current={ativo ? "page" : undefined}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left text-sm leading-snug cursor-pointer hover:bg-[var(--bg-tertiary)] ${ativo ? ativoClasse : "font-medium"}`}
              >
                <span className="shrink-0">{m.def.icone}</span>
                <span className="min-w-0">{m.def.titulo}</span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );

  return (
    <div className="flex-1 min-h-0 flex relative">
      {painelLista}
      {lista && <button aria-label="Fechar a lista" className="md:hidden absolute inset-0 z-30 bg-black/30 cursor-default" onClick={() => setLista(false)} />}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
        {lista !== true && (
          <div className={`px-3 pt-2 shrink-0 ${lista === null ? "md:hidden" : ""}`}>
            <button
              onClick={() => setLista(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              title="Mostrar a lista de fluxos"
            >
              ☰ Fluxos
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col">
          {conteudo}
        </div>

        <button
          onClick={() => setVozAberta(true)}
          className="absolute bottom-4 right-4 z-30 text-sm px-4 py-2.5 rounded-full text-white cursor-pointer shadow-lg whitespace-nowrap"
          style={{ background: "var(--accent, #2D6B6B)" }}
          title="Fale o fluxo que você quer; o Jarbas desenha um rascunho. Nada executa."
        >
          🎙 <span className="max-sm:hidden">Novo fluxo por voz</span>
        </button>
      </div>

      {vozAberta && (
        <VozNovoFluxo
          onFechar={() => setVozAberta(false)}
          onPronto={(r) => { setVozAberta(false); carregaRascunhos(); router.push(href(`rascunho=${r.id}`)); }}
        />
      )}
    </div>
  );
}

// Esqueleto: mesma moldura do conteúdo real, em cinza (evita o "pisca" de tela vazia)
function Esqueleto() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-5 space-y-3">
        <span className="block rounded animate-pulse" style={{ width: "40%", height: 24, background: "var(--bg-tertiary, #EDE8E1)" }} />
        <span className="block rounded animate-pulse" style={{ width: "70%", height: 14, background: "var(--bg-tertiary, #EDE8E1)" }} />
      </div>
      <div className="flex-1 min-h-[420px] flex items-center justify-center">
        <span className="text-sm text-[var(--text-muted)] animate-pulse">abrindo o mapa…</span>
      </div>
    </div>
  );
}
