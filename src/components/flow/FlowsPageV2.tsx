"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FlowDoc } from "@/lib/types";
import { getFlowDocs, duplicateFlowDoc, updateFlowDoc } from "@/lib/storage";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron } from "@/lib/cron";
import { semAcento, ehAposentada, avaliaSaude, SELO_SAUDE, descricaoLimpa, type Saude } from "@/lib/radiografia";
import FlowRadiografia from "./FlowRadiografia";
import { useUI } from "../ui";

// =============================================
// Fluxos — radiografia (18/10/2026, branch fluxos-radiografar).
//
// Sem ?fluxo=…: GALERIA de todos os fluxos (com filtros e selos).
// Com ?fluxo=<id> ou ?titulo=<título>: a RADIOGRAFIA do fluxo, em 3 níveis
// (Leigo, Intermediário, Código) + a aba "Editar desenho" (o editor de sempre).
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

  const idPedido = params.get("fluxo");
  const tituloPedido = params.get("titulo");
  const nivelParam = params.get("nivel");
  const abaInicial: Aba = nivelParam === "editar" ? "editar" : nivelParam === "2" ? 2 : nivelParam === "3" ? 3 : 1;

  useEffect(() => {
    fetchCatalogo().then((c) => {
      setAutomacoes(c?.automacoes || []);
      setRelogioMudouEm(c?.crontab_modificado_em ?? null);
    });
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

  // Ainda carregando (ou o fluxo pedido ainda não chegou): esqueleto, nunca tela vazia
  if (loading && (idPedido || tituloPedido)) return <Esqueleto />;

  if (selected) {
    return (
      <FlowRadiografia
        key={selected.id}
        flow={selected}
        automacao={automacaoDe(selected)}
        relogioMudouEm={relogioMudouEm}
        abaInicial={abaInicial}
        saveState={saveState}
        onVoltar={() => router.push("/producao/fluxos")}
        onDuplicate={() => handleDuplicate(selected.id)}
        onCanvasChange={handleCanvasChange}
        avisar={avisar}
      />
    );
  }

  return (
    <Galeria
      flows={flows}
      loading={loading}
      naoAchou={!!(idPedido || tituloPedido)}
      automacaoDe={automacaoDe}
      relogioMudouEm={relogioMudouEm}
      onAbrir={(f) => router.push(`/producao/fluxos?fluxo=${f.id}`)}
      onAutomacoes={() => router.push("/producao/automacoes")}
    />
  );
}

// ── Galeria ─────────────────────────────────────────────────────────────
type FiltroStatus = "todos" | "ok" | "problema" | "aposentada" | "atrasado";

function Galeria({ flows, loading, naoAchou, automacaoDe, relogioMudouEm, onAbrir, onAutomacoes }: {
  flows: FlowDoc[];
  loading: boolean;
  naoAchou: boolean;
  automacaoDe: (f: FlowDoc) => AutomacaoApiItem | null;
  relogioMudouEm: string | null;
  onAbrir: (f: FlowDoc) => void;
  onAutomacoes: () => void;
}) {
  const [busca, setBusca] = useState("");
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

  const categorias = useMemo(() => [...new Set(itens.map((i) => i.grupo))].sort(), [itens]);

  const filtrados = itens.filter((i) => {
    if (cat !== "todas" && i.grupo !== cat) return false;
    if (status === "ok" && !(i.saude === "ok" && !i.aposentada)) return false;
    if (status === "problema" && !(i.saude === "atrasada" || i.saude === "muda")) return false;
    if (status === "aposentada" && !i.aposentada) return false;
    if (status === "atrasado" && !i.atrasado) return false;
    if (busca && !semAcento(`${i.f.title} ${i.f.description || ""}`).includes(semAcento(busca))) return false;
    return true;
  });

  const grupos = [...new Set(filtrados.map((i) => i.grupo))].sort();

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[260px]">
            <h1 className="text-lg font-semibold">🗺️ Fluxos</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Cada fluxo pode ser lido em três profundidades: Leigo, Intermediário e Código. Escolha um.
            </p>
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar fluxo…"
            className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] w-full sm:w-64"
          />
          <button onClick={onAutomacoes} className="text-sm px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap">
            ← Automações
          </button>
        </div>

        {naoAchou && !loading && (
          <p className="text-sm px-3 py-2 rounded-lg border" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
            Não achei o fluxo que você abriu pelo endereço. Escolha um da lista.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Chip ativo={cat === "todas"} onClick={() => setCat("todas")}>todas ({itens.length})</Chip>
          {categorias.map((c) => (
            <Chip key={c} ativo={cat === c} onClick={() => setCat(c)}>{c} ({itens.filter((i) => i.grupo === c).length})</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">mostrar:</span>
          {([
            ["todos", "tudo"],
            ["ok", "🟢 no ar"],
            ["problema", "🟡🔴 atrasadas ou sem sinal"],
            ["aposentada", "⛔ não rodam mais"],
            ["atrasado", "✏️ desenho pode estar atrasado"],
          ] as [FiltroStatus, string][]).map(([k, r]) => (
            <Chip key={k} ativo={status === k} onClick={() => setStatus(k)}>{r}</Chip>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando os fluxos…</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhum fluxo com esse filtro.</p>
        ) : (
          grupos.map((g) => (
            <section key={g}>
              <h2 className="text-sm font-semibold mb-2">{g}</h2>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filtrados.filter((i) => i.grupo === g).map((i) => {
                  const inicio = i.f.nodes.find((n) => n.type === "start");
                  return (
                    <button
                      key={i.f.id}
                      onClick={() => onAbrir(i.f)}
                      className="text-left rounded-xl border bg-[var(--bg-secondary)] hover:shadow-md transition-shadow p-3 cursor-pointer"
                      style={{ borderColor: i.aposentada ? "var(--danger)" : "var(--border)", opacity: i.aposentada ? 0.8 : 1 }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl leading-none">{inicio?.data.icon || "🗺️"}</span>
                        <p className="font-medium text-sm flex-1 min-w-0">{i.f.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                        {i.aposentada && <span style={{ color: "var(--danger)" }}>⛔ não roda mais</span>}
                        {i.saude && !i.aposentada && <span style={{ color: SELO_SAUDE[i.saude].cor }}>{SELO_SAUDE[i.saude].bolinha} {SELO_SAUDE[i.saude].texto}</span>}
                        {i.atrasado && !i.aposentada && <span style={{ color: "var(--warning)" }}>✏️ desenho pode estar atrasado</span>}
                        <span className="text-[var(--text-muted)]">{i.f.nodes.length} etapas</span>
                      </div>
                      {i.cron && <p className="text-[11px] text-[var(--text-secondary)] mt-1">⏰ {i.cron.descricao}</p>}
                      {descricaoLimpa(i.f) && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{descricaoLimpa(i.f)}</p>
                      )}
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
