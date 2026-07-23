"use client";

// 🏠 Tela "Hoje" — o resumo do dia + Caixa de aprovação com ação direta.
// Dados vêm da squad-api autenticada (agenda, tarefas, Radar, escola, feed).
//
// Layout (18/07): largura total. Agenda/tarefas/escola/feed à esquerda e centro;
// Caixa de aprovação na coluna direita, fila ÚNICA e só de NOTÍCIAS (dicas e
// reels ficam no kanban do Notion). Notícia UAU (Prioridade) em evidência.

import { useState } from "react";
import { useHoje, decidirCard, marcarLido, promoverProGrupo, type CardCaixa, type ItemParaMim } from "@/lib/hoje";
import { tempoRelativo } from "@/lib/metrics";

const AGENDA_URL = "https://calendar.google.com/calendar/u/0/r";
const REVISAO_DIARIA_URL = "https://www.notion.so/2fbb90b9061d81f8910aca4a14eb484e";

// Só notícias entram na caixa da home (pedido 18/07): dica e reel não.
const COLUNAS_CAIXA = new Set(["Pra avaliar - Prioridade", "Pra avaliar - Notícia"]);

// UAU agora é marcado no título com [Prioridade] (colunas de Prioridade
// foram extintas do Radar em 18/07; a checagem de coluna cobre a transição)
const ehUau = (c: CardCaixa) =>
  c.titulo.includes("[Prioridade]") || c.coluna === "Pra avaliar - Prioridade";

function CardAprovacao({ card, onDecidir }: { card: CardCaixa; onDecidir: (id: string, a: "aprovar" | "prioridade" | "descartar") => void }) {
  const [ocupado, setOcupado] = useState(false);
  const uau = ehUau(card);
  const meta = uau ? { rotulo: "🔥 UAU", cor: "#A0583C" } : { rotulo: "Notícia", cor: "#456B74" };
  const agir = async (a: "aprovar" | "prioridade" | "descartar") => {
    setOcupado(true);
    onDecidir(card.id, a);
  };
  return (
    <div
      className={`rounded-xl p-3 border ${ocupado ? "opacity-40" : ""} ${
        uau
          ? "border-2 border-[#A0583C] shadow-md"
          : "bg-[var(--bg-secondary)] border-[var(--border)]"
      }`}
      style={uau ? { background: "color-mix(in srgb, #A0583C 12%, var(--bg-secondary))" } : undefined}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: meta.cor }}>
          {meta.rotulo}
        </span>
        <a href={card.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--text-muted)] underline">abrir</a>
      </div>
      <p className={`text-sm text-[var(--text-primary)] ${uau ? "font-semibold" : ""}`}>
        {card.titulo.replace("[Prioridade] ", "")}
      </p>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button disabled={ocupado} onClick={() => agir("aprovar")}
          className="text-xs px-2.5 py-1 rounded-lg text-white font-medium" style={{ background: "#2D6B6B" }}>
          ✓ Aprovar
        </button>
        <button disabled={ocupado} onClick={() => agir("prioridade")}
          className="text-xs px-2.5 py-1 rounded-lg font-medium border" style={{ borderColor: "#A0583C", color: "#A0583C" }}>
          ★ Prioridade
        </button>
        <button disabled={ocupado} onClick={() => agir("descartar")}
          className="text-xs px-2.5 py-1 rounded-lg font-medium border border-red-300 text-red-600">
          ✕ Descartar
        </button>
      </div>
    </div>
  );
}

// 📰 "Pra você ficar por dentro" (F4): notícias de IA que NÃO foram pro grupo,
// só pra ela se manter antenada do mercado. Leitura, não decisão — separado da
// caixa de aprovação de propósito.
function ParaVoceFicarPorDentro({ itens, onToggleLido, onProGrupo }: {
  itens: ItemParaMim[];
  onToggleLido: (url: string, lido: boolean) => void;
  onProGrupo: (url: string) => void;
}) {
  if (itens.length === 0) return null;
  const naoLidas = itens.filter((n) => !n.lido).length;
  return (
    <section>
      <details open>
        <summary className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 cursor-pointer select-none">
          📰 Pra você ficar por dentro <span className="text-[var(--text-muted)] font-normal normal-case">({naoLidas} não lidas) · notícia de mercado, não vai pro grupo</span>
        </summary>
        <div className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border)] mt-2 max-h-72 overflow-y-auto space-y-1.5">
          {itens.map((n) => (
            <div key={n.url} className={`flex items-start gap-2 text-sm border-b border-[var(--border)] last:border-0 pb-1.5 last:pb-0 ${n.lido ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                checked={!!n.lido}
                onChange={(e) => onToggleLido(n.url, e.target.checked)}
                title={n.lido ? "Marcado como lido (desmarque pra voltar)" : "Marcar como lido"}
                className="mt-1 shrink-0 accent-[var(--accent)] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <a href={n.url} target="_blank" rel="noreferrer"
                  className={`hover:text-[var(--accent)] hover:underline ${n.lido ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                  {n.titulo}
                </a>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  {n.fonte}{n.tema ? ` · ${n.tema}` : ""}
                </span>
              </div>
              <button onClick={() => onProGrupo(n.url)}
                title="Mandar pra caixa de aprovação do grupo"
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] whitespace-nowrap shrink-0 border border-[var(--border)] rounded px-1.5 py-0.5">
                ↑ grupo
              </button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function LinkCanto({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-[var(--text-muted)] underline hover:text-[var(--accent)] whitespace-nowrap"
    >
      {rotulo} ↗
    </a>
  );
}

export default function HojePanel({ lateral }: { lateral?: React.ReactNode }) {
  const { dados, erro, recarregar } = useHoje();
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  const [lidosOverride, setLidosOverride] = useState<Map<string, boolean>>(new Map());
  const [promovidos, setPromovidos] = useState<Set<string>>(new Set());

  const onDecidir = async (id: string, acao: "aprovar" | "prioridade" | "descartar") => {
    const ok = await decidirCard(id, acao);
    if (ok) setFeitos((s) => new Set(s).add(id));
  };

  // caixa de seleção lido/não lido: alterna o estado, o item continua na lista
  const onToggleLido = async (url: string, novo: boolean) => {
    setLidosOverride((m) => new Map(m).set(url, novo));
    marcarLido(url, novo); // persiste no servidor (melhor esforço)
  };

  // manda a notícia pra caixa de aprovação do grupo (vira card pra aprovar)
  const onProGrupo = async (url: string) => {
    setPromovidos((s) => new Set(s).add(url)); // some do feed pessoal na hora
    const ok = await promoverProGrupo(url);
    if (ok) setTimeout(recarregar, 800); // traz o novo card pra caixa
  };

  if (erro) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">
      Não consegui carregar o resumo de hoje. (A tela Hoje precisa da squad-api ativa na VPS.)
    </div>;
  }
  if (!dados) {
    return <div className="p-6 text-sm text-[var(--text-secondary)] animate-pulse">Carregando seu dia…</div>;
  }

  // Só notícias, UAU primeiro
  const caixa = dados.caixa
    .filter((c) => COLUNAS_CAIXA.has(c.coluna) && !feitos.has(c.id))
    .sort((a, b) => Number(ehUau(b)) - Number(ehUau(a)));
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <div className="p-4 md:p-6 max-w-[1500px] mx-auto space-y-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize">🏠 {hoje}</h1>
          <span className="text-xs text-[var(--text-secondary)]">
            atualizado às {new Date(dados.gerado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {" "}({tempoRelativo(dados.gerado_em)})
            {" · "}
            <button onClick={recarregar} className="underline hover:text-[var(--text-primary)] cursor-pointer">
              ↻ atualizar
            </button>
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Lateral esquerda: assistentes por área (coluna estreita, do topo).
              A altura acompanha o miolo (termina na linha do "O que a equipe
              fez"); se a lista for maior, rola por dentro. */}
          {lateral && (
            <div className="w-full lg:w-[270px] lg:shrink-0 order-3 lg:order-none lg:self-stretch lg:relative">
              <div className="lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-1">
                {lateral}
              </div>
            </div>
          )}

          {/* Centro: o dia dela */}
          <div className="flex-1 min-w-0 space-y-5 order-2 lg:order-none">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Agenda + tarefas */}
              <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">📅 Agenda de hoje</h2>
                  <LinkCanto href={AGENDA_URL} rotulo="abrir agenda" />
                </div>
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                  {dados.agenda || "Sem compromissos hoje."}
                </pre>
                {dados.agenda_semana && (
                  <details className="mt-3 border-t border-[var(--border)] pt-2">
                    <summary className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
                      🗓️ Semana
                    </summary>
                    <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans max-h-48 overflow-y-auto mt-2">
                      {dados.agenda_semana}
                    </pre>
                  </details>
                )}
              </section>
              <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">✅ Tarefas</h2>
                  <LinkCanto href={REVISAO_DIARIA_URL} rotulo="revisão diária" />
                </div>
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                  {dados.tarefas || "Sem tarefas pendentes pra hoje."}
                </pre>
                {dados.tarefas_semana && (
                  <details className="mt-3 border-t border-[var(--border)] pt-2">
                    <summary className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
                      🗓️ Tarefas da semana
                    </summary>
                    <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans max-h-48 overflow-y-auto mt-2">
                      {dados.tarefas_semana}
                    </pre>
                  </details>
                )}
              </section>
            </div>

            {/* Escola do Luiz (23/07: card tirado da home a pedido da Andréia —
                fica só em Pessoal → Luiz escola) */}

            {/* Feed do que os agentes fizeram */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                ⚡ O que a equipe fez
              </h2>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <ul className="space-y-1.5 text-sm text-[var(--text-primary)]">
                  {dados.atividades.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span>{a.icone}</span>
                      <span className="flex-1"><strong>{a.quem}</strong> {a.texto}</span>
                      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{tempoRelativo(a.quando)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Notícias de mercado (separado da caixa do grupo) */}
            <ParaVoceFicarPorDentro
              itens={(dados.para_mim || [])
                .filter((n) => !promovidos.has(n.url))
                .map((n) => ({
                  ...n,
                  lido: lidosOverride.has(n.url) ? !!lidosOverride.get(n.url) : !!n.lido,
                }))}
              onToggleLido={onToggleLido}
              onProGrupo={onProGrupo}
            />
          </div>

          {/* Coluna direita: caixa de aprovação (fila única, só notícias) */}
          <section className="w-full lg:w-[350px] lg:shrink-0 order-1 lg:order-none">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              📥 Caixa de aprovação {caixa.length > 0 && <span className="text-[var(--accent)]">({caixa.length})</span>}
            </h2>
            {caixa.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                🎉 Nenhuma notícia esperando você!
              </p>
            ) : (
              // Altura limitada + rolagem interna: fila cheia não empurra mais o
              // escritório lá pra baixo (pedido 19/07). Rola por dentro da coluna.
              <div className="space-y-2 lg:max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
                {caixa.map((c) => <CardAprovacao key={c.id} card={c} onDecidir={onDecidir} />)}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
