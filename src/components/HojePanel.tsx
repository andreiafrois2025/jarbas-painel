"use client";

// 🏠 Tela "Hoje" — o resumo do dia + Caixa de aprovação com ação direta.
// Dados vêm da squad-api autenticada (agenda, tarefas, Radar, escola, feed).

import { useState } from "react";
import { useHoje, decidirCard, type CardCaixa } from "@/lib/hoje";
import { tempoRelativo } from "@/lib/metrics";

const COLUNA_LABEL: Record<string, { rotulo: string; cor: string }> = {
  "Pra avaliar - Prioridade": { rotulo: "Prioridade", cor: "#A0583C" },
  "Pra avaliar - Notícia": { rotulo: "Notícia", cor: "#456B74" },
  "Pra avaliar - Dicas": { rotulo: "Dica", cor: "#C4A460" },
  "Pra avaliar - Reels": { rotulo: "Reel", cor: "#2D6B6B" },
};

function CardAprovacao({ card, onDecidir }: { card: CardCaixa; onDecidir: (id: string, a: "aprovar" | "prioridade" | "descartar") => void }) {
  const [ocupado, setOcupado] = useState(false);
  const meta = COLUNA_LABEL[card.coluna] || { rotulo: card.coluna, cor: "#6B7A7A" };
  const agir = async (a: "aprovar" | "prioridade" | "descartar") => {
    setOcupado(true);
    onDecidir(card.id, a);
  };
  return (
    <div className={`bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border)] ${ocupado ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: meta.cor }}>
          {meta.rotulo}
        </span>
        <a href={card.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--text-muted)] underline">abrir</a>
      </div>
      <p className="text-sm text-[var(--text-primary)]">{card.titulo}</p>
      <div className="flex gap-1.5 mt-2">
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

export default function HojePanel() {
  const { dados, erro, recarregar } = useHoje();
  const [feitos, setFeitos] = useState<Set<string>>(new Set());

  const onDecidir = async (id: string, acao: "aprovar" | "prioridade" | "descartar") => {
    const ok = await decidirCard(id, acao);
    if (ok) setFeitos((s) => new Set(s).add(id));
  };

  if (erro) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">
      Não consegui carregar o resumo de hoje. (A tela Hoje precisa da squad-api ativa na VPS.)
    </div>;
  }
  if (!dados) {
    return <div className="p-6 text-sm text-[var(--text-secondary)] animate-pulse">Carregando seu dia…</div>;
  }

  const caixa = dados.caixa.filter((c) => !feitos.has(c.id));
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize">🏠 {hoje}</h1>
          <span className="text-xs text-[var(--text-secondary)]">
            atualizado {tempoRelativo(dados.gerado_em)}
          </span>
        </div>

        {/* Caixa de aprovação — o que espera sua decisão */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            📥 Caixa de aprovação {caixa.length > 0 && <span className="text-[var(--accent)]">({caixa.length})</span>}
          </h2>
          {caixa.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
              🎉 Nada esperando você! Tudo avaliado.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {caixa.slice(0, 12).map((c) => <CardAprovacao key={c.id} card={c} onDecidir={onDecidir} />)}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Agenda + tarefas */}
          <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📅 Agenda de hoje</h2>
            <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
              {dados.agenda || "Sem compromissos hoje."}
            </pre>
          </section>
          <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">✅ Tarefas</h2>
            <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
              {dados.tarefas || "Sem tarefas pendentes pra hoje."}
            </pre>
          </section>
        </div>

        {/* Escola do Luiz (se houver) */}
        {dados.escola.length > 0 && (
          <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🎒 Próximas do Luiz</h2>
            <ul className="space-y-1 text-sm text-[var(--text-primary)]">
              {dados.escola.slice(0, 6).map((e, i) => (
                <li key={i}>
                  <span className="text-[var(--text-muted)]">{new Date(e.data + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  {" · "}{{ prova: "🔴", avaliativa: "🟡", paracasa: "🟢" }[e.tipo] || "📌"} {e.disciplina} {e.nome ? `— ${e.nome}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

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

        <button onClick={recarregar} className="text-xs underline text-[var(--text-secondary)]">
          atualizar
        </button>
      </div>
    </div>
  );
}
