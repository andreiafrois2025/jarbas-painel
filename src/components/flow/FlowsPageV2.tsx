"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FlowDoc } from "@/lib/types";
import { getFlowDocs, duplicateFlowDoc, updateFlowDoc } from "@/lib/storage";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import { semAcento, ehAposentada, avaliaSaude, SELO_SAUDE, descricaoLimpa, type Saude } from "@/lib/radiografia";
import FlowRadiografia from "./FlowRadiografia";
import MacroDiagrama from "./MacroDiagrama";
import RascunhoFluxo from "./RascunhoFluxo";
import VozNovoFluxo from "./VozNovoFluxo";
import { rascunhosApi, type RascunhoResumo } from "@/lib/flow/rascunhos";
import { montaMacros, nomeDoFluxo } from "@/lib/flow/macro-fluxos";
import { useUI } from "../ui";

// =============================================
// Fluxos — radiografia (18/10/2026, branch fluxos-radiografar).
//
// Sem parâmetro: GALERIA (grupos de fluxos ou todos), filtros recolhidos, botão de voz.
// ?fluxo=<id> ou ?titulo=<título>: a RADIOGRAFIA do fluxo, em 3 níveis (de cima para baixo).
// ?macro=<slug>: um diagrama único que encadeia vários fluxos (cada um é um bloco).
// ?rascunho=<id>: rascunho criado por voz (nada executa).
//
// O endereço manda: quem decide o fluxo aberto é a URL (useSearchParams), então
// o botão Voltar do navegador desfaz exatamente um passo. Sem ouvinte de
// popstate (foi ele que causou o "pulo duplo" de 25/07).
// =============================================

type Aba = 1 | 2 | 3 | "editar";

export default function FlowsPageV2() {
  const router = useRouter();
  const params = useSearchParams();
  const { avisar } = useUI();
  const [flows, setFlows] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [automacoes, setAutomacoes] = useState<AutomacaoApiItem[]>([]);
  const [relogioMudouEm, setRelogioMudouEm] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<RascunhoResumo[]>([]);
  const [vozAberta, setVozAberta] = useState(false);

  const idPedido = params.get("fluxo");
  const macroPedido = params.get("macro");
  const rascunhoPedido = params.get("rascunho");
  const tituloPedido = params.get("titulo");
  const nivelParam = params.get("nivel");
  const abaInicial: Aba = nivelParam === "editar" ? "editar" : nivelParam === "2" ? 2 : nivelParam === "3" ? 3 : 1;

  useEffect(() => {
    fetchCatalogo().then((c) => {
      setAutomacoes(c?.automacoes || []);
      setRelogioMudouEm(c?.crontab_modificado_em ?? null);
    });
    rascunhosApi.listar().then(setRascunhos).catch(() => setRascunhos([]));
    getFlowDocs()
      .then(setFlows)
      .catch((e) => console.error("Erro ao carregar fluxos:", e))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => {
    if (idPedido) return flows.find((f) => f.id === idPedido) || null;
    if (tituloPedido) return flows.find((f) => semAcento(f.title) === semAcento(tituloPedido)) || null;
    return null;
  }, [flows, idPedido, tituloPedido]);

  const automacaoDe = (f: FlowDoc) => automacoes.find((a) => a.flow && semAcento(a.flow) === semAcento(f.title)) || null;

  const handleDuplicate = async (id: string) => {
    const f = await duplicateFlowDoc(id);
    setFlows(await getFlowDocs());
    router.push(`/producao/fluxos?fluxo=${f.id}&nivel=editar`);
  };

  const handleCanvasChange = async (updates: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => {
    if (!selected) return;
    setSaveState("saving");
    await updateFlowDoc(selected.id, updates);
    setFlows((fs) => fs.map((f) => (f.id === selected.id ? { ...f, ...updates } : f)));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

    const macros = useMemo(() => montaMacros(flows), [flows]);
  const macro = macroPedido ? macros.find((m) => m.def.slug === macroPedido) || null : null;
  const abrirFluxo = (f: FlowDoc, de?: string) => router.push(`/producao/fluxos?fluxo=${f.id}${de ? `&de=${de}` : ""}`);
  const voltar = () => { const de = params.get("de"); router.push(de ? `/producao/fluxos?macro=${de}` : "/producao/fluxos"); };

  if (rascunhoPedido) return <RascunhoFluxo key={rascunhoPedido} id={rascunhoPedido} onVoltar={() => router.push("/producao/fluxos")} avisar={avisar} />;

  // Ainda carregando (ou o fluxo pedido ainda não chegou): esqueleto, nunca tela vazia
  if (loading && (idPedido || tituloPedido || macroPedido)) return <Esqueleto />;

  if (macro) {
    return (
      <MacroDiagrama
        key={macro.def.slug}
        macro={macro}
        automacaoDe={automacaoDe}
        onVoltar={() => router.push("/producao/fluxos")}
        onAbrirFluxo={(f) => router.push(`/producao/fluxos?fluxo=${f.id}&de=${macro.def.slug}`)}
      />
    );
  }

  if (selected) {
    return (
      <FlowRadiografia
        key={selected.id}
        flow={selected}
        automacao={automacaoDe(selected)}
        relogioMudouEm={relogioMudouEm}
        abaInicial={abaInicial}
        saveState={saveState}
        onVoltar={voltar}
        onDuplicate={() => handleDuplicate(selected.id)}
        onCanvasChange={handleCanvasChange}
        avisar={avisar}
      />
    );
  }

  return (
    <>
      <Galeria
        flows={flows}
        macros={macros}
        rascunhos={rascunhos}
        loading={loading}
        naoAchou={!!(idPedido || tituloPedido || macroPedido)}
        automacaoDe={automacaoDe}
        relogioMudouEm={relogioMudouEm}
        onAbrir={(f) => abrirFluxo(f)}
        onAbrirMacro={(slug) => router.push(`/producao/fluxos?macro=${slug}`)}
        onAbrirRascunho={(id) => router.push(`/producao/fluxos?rascunho=${id}`)}
        onVoz={() => setVozAberta(true)}
        onAutomacoes={() => router.push("/producao/automacoes")}
      />
      {vozAberta && (
        <VozNovoFluxo
          onFechar={() => setVozAberta(false)}
          onPronto={(r) => { setVozAberta(false); router.push(`/producao/fluxos?rascunho=${r.id}`); }}
        />
      )}
    </>
  );
}

// ── Galeria ─────────────────────────────────────────────────────────────
type FiltroStatus = "todos" | "ok" | "problema" | "aposentada" | "atrasado";
type Modo = "grupos" | "todos";

function Galeria({ flows, macros, rascunhos, loading, naoAchou, automacaoDe, relogioMudouEm, onAbrir, onAbrirMacro, onAbrirRascunho, onVoz, onAutomacoes }: {
  flows: FlowDoc[];
  macros: ReturnType<typeof montaMacros>;
  rascunhos: RascunhoResumo[];
  loading: boolean;
  naoAchou: boolean;
  automacaoDe: (f: FlowDoc) => AutomacaoApiItem | null;
  relogioMudouEm: string | null;
  onAbrir: (f: FlowDoc) => void;
  onAbrirMacro: (slug: string) => void;
  onAbrirRascunho: (id: string) => void;
  onVoz: () => void;
  onAutomacoes: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>("grupos");
  const [filtros, setFiltros] = useState(false);
  const [cat, setCat] = useState("todas");
  const [status, setStatus] = useState<FiltroStatus>("todos");

  const itens = useMemo(
    () =>
      flows.map((f) => {
        const a = automacaoDe(f);
        const cron = a ? interpretaCron(a.agenda) : null;
        const saude: Saude | null = a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
        const grupo =
          a?.categoria ||
          f.kanban_column ||
          (f.category === "squad" ? "🤖 Squads" : f.category === "manual" ? "👋 Rotinas manuais" : "🔔 Reage a um evento");
        const atrasado = !!(relogioMudouEm && f.updated_at && new Date(relogioMudouEm) > new Date(f.updated_at));
        return { f, a, cron, saude, grupo, aposentada: ehAposentada(f), atrasado };
      }),
    [flows, automacaoDe, relogioMudouEm],
  );
  const porId = useMemo(() => new Map(itens.map((i) => [i.f.id, i])), [itens]);

  const categorias = useMemo(() => [...new Set(itens.map((i) => i.grupo))].sort(), [itens]);
  const filtrosAtivos = (cat !== "todas" ? 1 : 0) + (status !== "todos" ? 1 : 0);

  const filtrados = itens.filter((i) => {
    if (cat !== "todas" && i.grupo !== cat) return false;
    if (status === "ok" && !(i.saude === "ok" && !i.aposentada)) return false;
    if (status === "problema" && !(i.saude === "atrasada" || i.saude === "muda")) return false;
    if (status === "aposentada" && !i.aposentada) return false;
    if (status === "atrasado" && !i.atrasado) return false;
    if (busca && !semAcento(`${nomeDoFluxo(i.f)} ${i.f.description || ""}`).includes(semAcento(busca))) return false;
    return true;
  });
  const grupos = [...new Set(filtrados.map((i) => i.grupo))].sort();

  const macrosFiltrados = macros.filter((m) =>
    !busca || semAcento(`${m.def.titulo} ${m.def.resumo} ${m.fluxos.map(nomeDoFluxo).join(" ")}`).includes(semAcento(busca)),
  );
  const rascunhosVisiveis = rascunhos.filter((r) => !busca || semAcento(r.titulo).includes(semAcento(busca)));

  const botao = "text-sm px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap";

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-4 md:px-8 py-5 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold mr-auto">🗺️ Fluxos</h1>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar…"
            aria-label="Buscar fluxo"
            className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] w-full sm:w-56"
          />
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm" role="tablist" aria-label="Como ver os fluxos">
            {([["grupos", "Grupos"], ["todos", `Todos (${flows.length})`]] as [Modo, string][]).map(([k, r]) => (
              <button key={k} role="tab" aria-selected={modo === k} onClick={() => setModo(k)}
                className={`px-3 py-2 cursor-pointer ${modo === k ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"}`}
                style={modo === k ? { background: "var(--accent, #2D6B6B)" } : undefined}>{r}</button>
            ))}
          </div>
          {modo === "todos" && (
            <button className={botao} onClick={() => setFiltros((v) => !v)} aria-expanded={filtros}>
              ⚙ Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ""}
            </button>
          )}
          <button className={botao} onClick={onAutomacoes}>← Automações</button>
          <button
            onClick={onVoz}
            className="text-sm px-4 py-2 rounded-lg text-white cursor-pointer whitespace-nowrap"
            style={{ background: "var(--accent, #2D6B6B)" }}
            title="Fale o fluxo que você quer; o Jarbas desenha um rascunho. Nada executa."
          >
            🎙 Novo fluxo por voz
          </button>
        </div>

        {modo === "todos" && filtros && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--text-muted)] w-16">categoria</span>
              <Chip ativo={cat === "todas"} onClick={() => setCat("todas")}>todas</Chip>
              {categorias.map((c) => (<Chip key={c} ativo={cat === c} onClick={() => setCat(c)}>{c}</Chip>))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--text-muted)] w-16">mostrar</span>
              {([
                ["todos", "tudo"],
                ["ok", "🟢 no ar"],
                ["problema", "🟡🔴 com problema"],
                ["aposentada", "⛔ não rodam mais"],
                ["atrasado", "✏️ desenho atrasado"],
              ] as [FiltroStatus, string][]).map(([k, r]) => (
                <Chip key={k} ativo={status === k} onClick={() => setStatus(k)}>{r}</Chip>
              ))}
            </div>
          </div>
        )}

        {naoAchou && !loading && (
          <p className="text-sm px-3 py-2 rounded-lg border" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
            Não achei o que você abriu pelo endereço. Escolha na lista.
          </p>
        )}

        {rascunhosVisiveis.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Seus rascunhos</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {rascunhosVisiveis.map((r) => (
                <button key={r.id} onClick={() => onAbrirRascunho(r.id)} className="text-left rounded-xl border border-dashed bg-[var(--bg-secondary)] hover:shadow-md transition-shadow p-3 cursor-pointer" style={{ borderColor: "#C4A460" }}>
                  <p className="font-medium text-sm truncate">✏️ {r.titulo}</p>
                  <p className="text-[11px] mt-1" style={{ color: r.estado === "aprovado" ? "var(--accent, #2D6B6B)" : "#8A6D1B" }}>
                    {r.estado === "aprovado" ? "aprovado · aguardando o Jarbas" : "rascunho · nada roda"} · {r.etapas} etapas
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando os fluxos…</p>
        ) : modo === "grupos" ? (
          macrosFiltrados.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Nada com essa busca.</p>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {macrosFiltrados.map((m) => {
                const problemas = m.fluxos.filter((f) => { const i = porId.get(f.id); return i && (i.saude === "atrasada" || i.saude === "muda"); }).length;
                const paradas = m.fluxos.filter((f) => porId.get(f.id)?.aposentada).length;
                return (
                  <button key={m.def.slug} onClick={() => onAbrirMacro(m.def.slug)} className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:shadow-lg transition-shadow p-4 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl leading-none">{m.def.icone}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[15px] leading-snug">{m.def.titulo}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{m.def.resumo}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-3">
                      {m.fluxos.length} {m.fluxos.length === 1 ? "fluxo" : "fluxos"}
                      {problemas > 0 && <span style={{ color: "var(--warning)" }}> · ⚠ {problemas} com problema</span>}
                      {paradas > 0 && <span style={{ color: "var(--danger)" }}> · ⛔ {paradas} parado</span>}
                    </p>
                  </button>
                );
              })}
            </div>
          )
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhum fluxo com esse filtro.</p>
        ) : (
          grupos.map((g) => (
            <section key={g}>
              <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">{g}</h2>
              <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filtrados.filter((i) => i.grupo === g).map((i) => {
                  const inicio = i.f.nodes.find((n) => n.type === "start");
                  const ponto = i.aposentada ? { c: "var(--danger)", t: "não roda mais" } : i.saude ? { c: SELO_SAUDE[i.saude].cor, t: SELO_SAUDE[i.saude].texto } : null;
                  return (
                    <button
                      key={i.f.id}
                      onClick={() => onAbrir(i.f)}
                      title={descricaoLimpa(i.f) || nomeDoFluxo(i.f)}
                      className="text-left rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:shadow-md transition-shadow px-3 py-2.5 cursor-pointer relative"
                      style={{ opacity: i.aposentada ? 0.7 : 1 }}
                    >
                      {ponto && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full" style={{ background: ponto.c }} title={ponto.t} aria-label={ponto.t} />}
                      <div className="flex items-start gap-2 pr-3">
                        <span className="text-lg leading-none">{inicio?.data.icon || "🗺️"}</span>
                        <p className="font-medium text-[13px] leading-snug line-clamp-2">{nomeDoFluxo(i.f)}</p>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">{i.cron ? `⏰ ${i.cron.descricao}` : `${i.f.nodes.length} etapas`}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border cursor-pointer transition-colors ${
        ativo ? "text-white border-transparent" : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
      style={ativo ? { background: "var(--accent, #2D6B6B)" } : undefined}
    >
      {children}
    </button>
  );
}

// Esqueleto: mesma moldura do conteúdo real, em cinza (evita o "pisca" de tela vazia)
function Esqueleto() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 shrink-0">
        <span className="text-sm text-[var(--text-muted)]">← Voltar</span>
        <span className="block rounded animate-pulse flex-1" style={{ maxWidth: "40%", height: 16, background: "var(--bg-tertiary, #EDE8E1)" }} />
      </div>
      <div className="flex-1 min-h-[420px] flex items-center justify-center">
        <span className="text-sm text-[var(--text-muted)] animate-pulse">abrindo o fluxo…</span>
      </div>
    </div>
  );
}
