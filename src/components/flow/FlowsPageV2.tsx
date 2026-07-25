"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FlowDoc } from "@/lib/types";
import { getFlowDocs, duplicateFlowDoc, updateFlowDoc } from "@/lib/storage";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron, formataProxima } from "@/lib/cron";
import FlowCanvas from "./FlowCanvas";
import { toMermaid, toPrompt, copy, download } from "./FlowExport";

// =============================================
// Fluxos — a mesa de desenho.
//
// 25/07/2026: esta tela deixou de ter lista própria. A porta de entrada dos
// fluxos passou a ser Produção › Automações, que agrupa por categoria e tem o
// botão de criar. Aqui só se desenha, chegando por um card de lá.
// =============================================

export default function FlowsPageV2() {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  // 25/07 (tarde): a janelinha que abria por cima do card virou ESTA página.
  // Ela pediu: "essa janela poderia ser a página do fluxo, ocupando a tela toda,
  // e no campo como funciona por dentro aparecer o fluxo direto". Então o
  // cabeçalho ganhou o que estava lá (quando roda, próxima, última, comando) e
  // o desenho ocupa o resto — já editável, sem precisar de outro botão.
  const [automacoes, setAutomacoes] = useState<AutomacaoApiItem[]>([]);

  const load = async (): Promise<FlowDoc[]> => {
    setLoading(true);
    try {
      const list = await getFlowDocs();
      setFlows(list);
      return list;
    } catch (e) {
      console.error("Erro ao carregar fluxos:", e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogo().then((c) => setAutomacoes(c?.automacoes || []));
  }, []);

  useEffect(() => {
    // Deep-link: /producao/fluxos?fluxo=<id>&cat=<categoria> sobrevive ao F5
    const params = new URLSearchParams(window.location.search);
    const fluxo = params.get("fluxo");
    if (fluxo) setSelectedId(fluxo);
    // Deep-link por TÍTULO (?titulo=…): usado pelos cards de Biblioteca ›
    // Automações, que sabem o nome do fluxo mas não o id do banco.
    const titulo = params.get("titulo");
    load().then((lista) => {
      if (!titulo || fluxo) return;
      const alvo = lista.find((f) => f.title.toLowerCase() === titulo.toLowerCase());
      if (alvo) setSelectedId(alvo.id);
    });
  }, []);

  // 25/07/2026 — sobre o "voltar" do navegador.
  //
  // Primeira tentativa (de manhã): eu tinha posto um ouvinte de "popstate" aqui
  // pra sincronizar o fluxo aberto com a URL. Ele criava um efeito colateral
  // ruim: ao apertar Voltar, esta tela re-renderizava por um instante no estado
  // "nenhum fluxo aberto" ANTES do navegador concluir a saída. Dava a impressão
  // de que o Voltar não tinha funcionado — e a reação natural é apertar de novo,
  // aí sim pulando duas páginas pra trás (foi como ela caiu no painel de Saúde).
  //
  // Correção: esta tela não mexe mais no histórico nem escuta popstate. Quem
  // manda é o navegador. O caminho de ida é sempre router.push a partir de um
  // card de Automações, então o Voltar desfaz exatamente esse passo.

  const selected = flows.find((f) => f.id === selectedId) || null;
  const semAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const automacao = selected
    ? automacoes.find((a) => a.flow && semAcento(a.flow) === semAcento(selected.title)) || null
    : null;
  const cron = automacao ? interpretaCron(automacao.agenda) : null;

  const handleDuplicate = async (id: string) => {
    const f = await duplicateFlowDoc(id);
    await load();
    setSelectedId(f.id);
  };

  const handleCanvasChange = async (updates: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => {
    if (!selected) return;
    setSaveState("saving");
    await updateFlowDoc(selected.id, updates);
    setFlows((fs) => fs.map((f) => (f.id === selected.id ? { ...f, ...updates } : f)));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  // ─── Modo canvas (fluxo aberto) ───
  if (selected) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-2 flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/producao/automacoes")}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            ← Voltar pras Automações
          </button>
          <h2 className="text-base font-semibold truncate flex-1">{selected.title}</h2>
          {selected.is_seed && (
            <span
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--af-teal)] text-white"
              title="Fluxo veio dos seeds do sistema. Pode editar à vontade."
            >
              seed
            </span>
          )}
          {saveState === "saving" && <span className="text-[11px] text-[var(--text-muted)]">salvando…</span>}
          {saveState === "saved" && <span className="text-[11px] text-[var(--success)]">salvo ✓</span>}
          <div className="flex gap-1">
            <button
              onClick={async () => {
                await copy(toMermaid(selected));
                alert("Mermaid copiado! Cola em qualquer IA.");
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Copia como Mermaid (formato de fluxo em texto)"
            >
              📋 Mermaid
            </button>
            <button
              onClick={async () => {
                await copy(toPrompt(selected));
                alert("Descrição copiada! Cola em qualquer IA sem estrutura de código.");
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Copia como prompt textual"
            >
              📝 Prompt
            </button>
            <button
              onClick={() => download(`${selected.title}.json`, JSON.stringify(selected, null, 2), "application/json")}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              title="Baixa JSON estruturado"
            >
              💾 JSON
            </button>
            {selected.is_seed && (
              <button
                onClick={() => handleDuplicate(selected.id)}
                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                title="Duplica pra editar"
              >
                ⎘ Duplicar
              </button>
            )}
          </div>
        </div>
        {selected.description && (
          <div className="bg-[var(--bg-tertiary)] px-4 py-2 text-xs text-[var(--text-secondary)] shrink-0 border-b border-[var(--border)]">
            {selected.description.replace(/^\[[^\]]+\]\s*/, "")}
          </div>
        )}

        {automacao && cron && (
          <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Dado rotulo="Quando roda" valor={cron.descricao} extra={`${automacao.agenda} (UTC)`} />
              <Dado rotulo="Próxima" valor={formataProxima(cron.proxima)} />
              <Dado rotulo="Última execução" valor={quandoFoi(automacao.ultima_execucao)}
                extra={!automacao.log ? "não deixa registro" : automacao.log_compartilhado ? "sinal indireto" : undefined} />
              <Dado
                rotulo="Custo por execução"
                valor={automacao.usa_ia ? "🤖 usa IA" : "🐍 sem IA"}
                extra={automacao.custo_execucao}
              />
            </div>
            <details className="mt-2">
              <summary className="text-[11px] text-[var(--text-muted)] cursor-pointer select-none">
                comando que roda na VPS
              </summary>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded p-2 border border-[var(--border)]">
                {automacao.comando}
              </pre>
            </details>
          </div>
        )}

        <div className="flex-1 min-h-[420px] relative">
          <FlowCanvas flow={selected} onChange={handleCanvasChange} />
        </div>
      </div>
    );
  }

  // ─── Sem fluxo aberto ───
  //
  // 25/07/2026: aqui existia o KANBAN de fluxos, aposentado a pedido da Andréia
  // — era a tela que ela abria e nunca usava ("eu clico porque quero ver o
  // fluxo direto"). Além disso, o card do kanban e o card de Automações eram
  // praticamente a mesma coisa, com o kanban só adicionando uma parada.
  //
  // Agora a porta de entrada é Produção › Automações, que lista os mesmos
  // fluxos agrupados por categoria (como ela procura) e tem o botão de criar.
  // Esta tela ficou sendo o que ela sempre foi de fato: o lugar de desenhar.
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-3xl">🗺️</span>
      <div>
        <p className="font-semibold text-[var(--text-primary)]">Escolha um fluxo pra desenhar</p>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mt-1">
          Os fluxos moram em <strong>Automações</strong>, agrupados por categoria. Clique num card de
          lá e o desenho abre aqui — é também de onde se cria um fluxo novo.
        </p>
      </div>
      <button
        onClick={() => router.push("/producao/automacoes")}
        className="text-sm px-4 py-2 rounded-full font-medium text-white hover:opacity-90 cursor-pointer"
        style={{ background: "var(--accent, #2D6B6B)" }}
      >
        Ir pra Automações
      </button>
      {!loading && flows.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">{flows.length} fluxos desenhados</p>
      )}
    </div>
  );
}

function Dado({ rotulo, valor, extra }: { rotulo: string; valor: string; extra?: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{rotulo}</p>
      <p className="text-sm text-[var(--text-primary)]">{valor}</p>
      {extra && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 break-words">{extra}</p>}
    </div>
  );
}

function quandoFoi(iso: string | null | undefined): string {
  if (!iso) return "não sei dizer";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}
