"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FlowDoc, FlowGrupo } from "@/lib/types";
import { getFlowDocs, duplicateFlowDoc, updateFlowDoc, getFlowGrupos } from "@/lib/storage";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import { semAcento, ehAposentada, avaliaSaude, type Saude } from "@/lib/radiografia";
import FlowRadiografia from "./FlowRadiografia";
import GrupoPagina from "./GrupoPagina";
import RascunhoFluxo from "./RascunhoFluxo";
import VozNovoFluxo from "./VozNovoFluxo";
import { rascunhosApi, type RascunhoResumo } from "@/lib/flow/rascunhos";
import { montaMacros, nomeDoFluxo, temGruposNoBanco } from "@/lib/flow/macro-fluxos";
import { useLigacoesAuto, desenhoPodeEstarVelho } from "@/lib/flow/ligacoes";
import { leigoDoFluxo } from "@/lib/flow/leigo";
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

const COR_SAUDE: Record<Saude, string> = {
  ok: "var(--success)",
  atrasada: "var(--warning)",
  muda: "var(--danger)",
  desconhecida: "var(--text-muted)",
};
const PESO: Record<Saude, number> = { muda: 3, atrasada: 2, desconhecida: 0, ok: 1 };

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
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [aposentadasAbertas, setAposentadasAbertas] = useState(false);
  const [busca, setBusca] = useState("");
  const [grupos, setGrupos] = useState<FlowGrupo[] | null>(null); // null = migração 006 ainda não aplicada
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvoDrop, setAlvoDrop] = useState<string | null>(null);
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
  const saudeDe = (f: FlowDoc): Saude | null => {
    const a = automacaoDe(f);
    const cron = a ? interpretaCron(a.agenda) : null;
    return a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
  };

  const macros = useMemo(() => montaMacros(flows, grupos), [flows, grupos]);
  const podeArrastar = temGruposNoBanco(flows, grupos); // só com a migração 006 aplicada
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

  // lembra o que estava aberto e deixa o grupo dele expandido na lista
  useEffect(() => {
    if (selected) {
      guardarUltimaVista(`fluxo=${selected.id}`);
      if (grupoDoSelecionado) setExpandidos((s) => (s.has(grupoDoSelecionado.def.slug) ? s : new Set(s).add(grupoDoSelecionado.def.slug)));
    } else if (macro) {
      guardarUltimaVista(`macro=${macro.def.slug}`);
      setExpandidos((s) => (s.has(macro.def.slug) ? s : new Set(s).add(macro.def.slug)));
    }
  }, [selected, macro, grupoDoSelecionado]);

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

  // Arrastar um fluxo da lista para outro grupo (só com a migração 006). Salva na hora; se falhar, desfaz.
  const moverFluxo = async (idFluxo: string, slug: string) => {
    const f = flows.find((x) => x.id === idFluxo);
    const atual = macros.find((m) => m.fluxos.some((x) => x.id === idFluxo))?.def.slug;
    if (!f || !atual || atual === slug) return;
    const alvo = macros.find((m) => m.def.slug === slug);
    const ordem = Math.max(0, ...(alvo?.fluxos || []).map((x) => x.ordem ?? 0)) + 1;
    const antes = flows;
    setFlows((fs) => fs.map((x) => (x.id === idFluxo ? { ...x, grupo: slug, ordem } : x)));
    setExpandidos((s) => new Set(s).add(slug));
    try {
      await updateFlowDoc(idFluxo, { grupo: slug, ordem });
      const nomeGrupo = grupos?.find((g) => g.slug === slug)?.nome || "Outros";
      avisar(`«${nomeDoFluxo(f)}» agora está em «${nomeGrupo}».`);
    } catch (e) {
      console.error("Erro ao mover o fluxo de grupo:", e);
      setFlows(antes);
      avisar("Não consegui mover o fluxo. Tente de novo.");
    }
  };

  const alterna = (slug: string) => setExpandidos((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  const filtra = (f: FlowDoc) => !busca || semAcento(`${nomeDoFluxo(f)} ${f.description || ""}`).includes(semAcento(busca));

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
  const linhaFluxo = (f: FlowDoc) => {
    const s = saudeDe(f);
    const ativo = selected?.id === f.id;
    return (
      <button
        key={f.id}
        onClick={() => abrirFluxo(f)}
        title={leigoDoFluxo(f)?.frase || nomeDoFluxo(f)}
        draggable={podeArrastar}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", f.id); e.dataTransfer.effectAllowed = "move"; setArrastando(f.id); }}
        onDragEnd={() => { setArrastando(null); setAlvoDrop(null); }}
        className={`w-full text-left flex items-center gap-2 pl-7 pr-2 py-1.5 rounded-md text-[13px] hover:bg-[var(--bg-tertiary)] ${ativo ? ativoClasse : ""} ${arrastando === f.id ? "opacity-40" : ""} ${podeArrastar ? "cursor-grab" : "cursor-pointer"}`}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={s ? { background: COR_SAUDE[s] } : { border: "1.5px solid var(--text-muted)" }} aria-label={s ? `saúde: ${s}` : "sem horário fixo"} />
        <span className="truncate">{nomeDoFluxo(f)}</span>
      </button>
    );
  };

  const painelLista = (
    <nav
      aria-label="Grupos e fluxos"
      className={`${lista === null ? "hidden md:flex" : lista ? "flex" : "hidden"} flex-col shrink-0 w-[290px] max-w-[86vw] border-r border-[var(--border)] bg-[var(--bg-secondary)] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl min-h-0`}
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
        {podeArrastar && <p className="px-2 pb-1 text-[11px] text-[var(--text-muted)]">Arraste um fluxo para outro grupo para mudá-lo de lugar.</p>}
        {loading && <p className="text-xs text-[var(--text-muted)] animate-pulse p-2">carregando…</p>}
        {macros.map((m) => {
          const vivos = m.fluxos.filter((f) => !ehAposentada(f));
          if (!vivos.length) return null;
          const visiveis = vivos.filter(filtra);
          if (busca && !visiveis.length) return null;
          const pior = vivos.reduce<Saude | null>((acc, f) => { const s = saudeDe(f); return s && (!acc || PESO[s] > PESO[acc]) ? s : acc; }, null);
          const aberto = busca ? true : expandidos.has(m.def.slug);
          const ativo = macro?.def.slug === m.def.slug && !selected;
          return (
            <div
              key={m.def.slug}
              onDragOver={podeArrastar && arrastando ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (alvoDrop !== m.def.slug) setAlvoDrop(m.def.slug); } : undefined}
              onDragLeave={podeArrastar ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvoDrop((a) => (a === m.def.slug ? null : a)); } : undefined}
              onDrop={podeArrastar ? (e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || arrastando; setAlvoDrop(null); setArrastando(null); if (id) moverFluxo(id, m.def.slug); } : undefined}
              className={alvoDrop === m.def.slug ? "rounded-md outline outline-2 outline-[var(--accent,#2D6B6B)] bg-[var(--accent-soft,rgba(45,107,107,0.12))]" : ""}
            >
              <div className={`flex items-center rounded-md hover:bg-[var(--bg-tertiary)] ${ativo ? ativoClasse : ""}`}>
                <button onClick={() => alterna(m.def.slug)} aria-expanded={aberto} aria-label={aberto ? "Recolher o grupo" : "Expandir o grupo"} className="w-7 h-8 text-[11px] text-[var(--text-muted)] cursor-pointer shrink-0">{aberto ? "▾" : "▸"}</button>
                <button onClick={() => abrirGrupo(m.def.slug)} title={m.def.resumo} className="flex-1 min-w-0 flex items-center gap-2 py-1.5 pr-2 text-left text-sm cursor-pointer">
                  <span className="shrink-0">{m.def.icone}</span>
                  <span className="truncate font-medium">{m.def.titulo}</span>
                  <span className="ml-auto flex items-center gap-1.5 shrink-0">
                    {pior && pior !== "ok" && <span className="w-2 h-2 rounded-full" style={{ background: COR_SAUDE[pior] }} aria-label={`pior saúde do grupo: ${pior}`} />}
                    <span className="text-[11px] text-[var(--text-muted)]">{vivos.length}</span>
                  </span>
                </button>
              </div>
              {aberto && <div className="mb-1">{visiveis.map(linhaFluxo)}</div>}
            </div>
          );
        })}

        {rascunhos.length > 0 && (
          <div className="pt-2 mt-2 border-t border-[var(--border)]">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">📝 Rascunhos ({rascunhos.length})</p>
            {rascunhos.filter((r) => !busca || semAcento(r.titulo).includes(semAcento(busca))).map((r) => (
              <button
                key={r.id}
                onClick={() => { router.push(href(`rascunho=${r.id}`)); if (window.innerWidth < 768) setLista(false); }}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] cursor-pointer hover:bg-[var(--bg-tertiary)] ${rascunhoPedido === r.id ? ativoClasse : ""}`}
              >
                <span className="block truncate">✏️ {r.titulo}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">{r.estado === "aprovado" ? "aprovado · aguardando o Jarbas" : "rascunho · nada roda"} · {r.etapas} etapas</span>
              </button>
            ))}
          </div>
        )}

        {aposentadas.length > 0 && (
          <div className="pt-2 mt-2 border-t border-[var(--border)]">
            <button onClick={() => setAposentadasAbertas((v) => !v)} aria-expanded={aposentadasAbertas} className="w-full text-left px-2 py-1 text-[11px] uppercase tracking-wider text-[var(--text-muted)] cursor-pointer">
              {aposentadasAbertas ? "▾" : "▸"} ⛔ Aposentadas ({aposentadas.length})
            </button>
            {aposentadasAbertas && aposentadas.filter(filtra).map((f) => (
              <button key={f.id} onClick={() => abrirFluxo(f)} className={`w-full text-left pl-5 pr-2 py-1.5 rounded-md text-[13px] cursor-pointer hover:bg-[var(--bg-tertiary)] opacity-75 truncate ${selected?.id === f.id ? ativoClasse : ""}`}>{nomeDoFluxo(f)}</button>
            ))}
          </div>
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
