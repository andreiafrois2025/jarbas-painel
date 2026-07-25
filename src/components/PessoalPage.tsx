"use client";

// 🤎 Hub Pessoal — tudo que não é trabalho: escola do Luiz, finanças
// pessoais e espaço pra crescer (saúde, casa, família).

import { useState } from "react";
import { useHoje, useFinancas, type ResumoFin } from "@/lib/hoje";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nomeMes = (mes: string) => {
  const [a, m] = mes.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m) - 1]}/${a}`;
};

type Aba = "luiz" | "financas";

const EMOJI_TIPO: Record<string, string> = { prova: "🔴", avaliativa: "🟡", paracasa: "🟢", envio: "➡️" };

const LINKS_FINANCAS = [
  { rotulo: "Finanças Pessoais (Notion)", url: "https://app.notion.com/p/2fbb90b9061d811b91aedee510b09f24" },
  { rotulo: "Revisão Diária (registrar o dia)", url: "https://app.notion.com/p/2fbb90b9061d81f8910aca4a14eb484e" },
];

export default function PessoalPage() {
  const [aba, setAba] = useState<Aba>("luiz");
  const { dados } = useHoje();
  const { financas, erroFin } = useFinancas();
  const escola = dados?.escola ?? [];

  const cardResumo = (titulo: string, r: ResumoFin) => (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        {titulo} <span className="normal-case font-normal text-[var(--text-muted)]">· {r.n} lançamento{r.n !== 1 ? "s" : ""}</span>
      </p>
      {r.n === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Sem lançamentos registrados este mês.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><p className="text-[11px] text-[var(--text-muted)]">Receitas</p><p className="text-base font-semibold" style={{ color: "#2D6B6B" }}>{brl(r.receitas)}</p></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Despesas</p><p className="text-base font-semibold" style={{ color: "#A0583C" }}>{brl(r.despesas)}</p></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Saldo</p><p className="text-base font-semibold" style={{ color: r.saldo >= 0 ? "#2D6B6B" : "#C0392B" }}>{brl(r.saldo)}</p></div>
        </div>
      )}
    </div>
  );

  const botao = (id: Aba, rotulo: string) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
        aba === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">🤎 Pessoal</h1>
        {botao("luiz", "🎒 Luiz — escola")}
        {botao("financas", "💰 Finanças")}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 w-full space-y-4">
          {aba === "luiz" ? (
            <>
              {/* 25/07 (tarde) — repensado com ela.
                  Ordem de leitura: primeiro O QUE É (contexto, lido uma vez),
                  depois O QUE TEM (as entregas, consultadas sempre). A
                  explicação absorveu os links do antigo "Enquanto isso": dois
                  cards lado a lado dizendo a mesma coisa gastavam espaço e
                  atenção sem acrescentar nada. */}
              <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
                <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
                  <div>
                    <h2 className="font-semibold text-[var(--text-primary)] mb-2">
                      📚 Como funciona a agenda escolar
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Você manda foto do caderno, print do Teams ou bilhete da escola{" "}
                      <strong>direto no WhatsApp</strong>, e a Donna identifica a atividade, a
                      disciplina e o prazo — colocando na sua agenda e na lista de tarefas.
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      As regras do assistente (horário das aulas, alternância Matemática/Robótica
                      das terças, envio × entrega) já estão salvas na VPS ✅.
                    </p>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                        Como ler as cores
                      </p>
                      <ul className="text-sm text-[var(--text-secondary)] space-y-0.5">
                        <li>🔴 Prova · 🟡 Atividade avaliativa</li>
                        <li>🟢 Para casa · ➡️ Envio da atividade</li>
                        <li>📌 Observação importante</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                        Atalhos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                          className="text-xs px-3 py-1.5 rounded-full border font-medium"
                          style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                          Agenda Google ↗
                        </a>
                        <a href="https://app.notion.com/p/a73b90b9061d8299899f81c8938e9de6" target="_blank" rel="noreferrer"
                          className="text-xs px-3 py-1.5 rounded-full border font-medium"
                          style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                          Lista de tarefas ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {escola.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
                  {(
                    [
                      ["prova", "🔴 Provas"],
                      ["paracasa", "🟢 Para casa"],
                      ["avaliativa", "🟡 Avaliativas"],
                      ["outros", "➡️ Outros avisos"],
                    ] as const
                  ).map(([tipo, titulo]) => {
                    const doTipo =
                      tipo === "outros"
                        ? escola.filter((e) => !["prova", "paracasa", "avaliativa"].includes(e.tipo))
                        : escola.filter((e) => e.tipo === tipo);
                    return (
                      <div key={tipo} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                        <div className="flex items-baseline justify-between gap-2 mb-2.5">
                          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{titulo}</h2>
                          {doTipo.length > 0 && (
                            <span className="text-xs text-[var(--text-muted)]">{doTipo.length}</span>
                          )}
                        </div>
                        {doTipo.length === 0 ? (
                          <p className="text-sm text-[var(--text-muted)]">nada por enquanto</p>
                        ) : (
                          <ul className="space-y-2.5">
                            {doTipo.map((e, i) => (
                              <li key={i} className="text-sm">
                                <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                                  {new Date(e.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  {tipo === "outros" ? ` ${EMOJI_TIPO[e.tipo] || "📌"}` : ""}
                                </span>
                                <span className="text-[var(--text-primary)]">
                                  <strong>{e.disciplina}</strong>
                                  {e.nome ? ` — ${e.nome}` : ""}
                                  {e.pontos ? <span className="text-[var(--text-muted)]"> ({e.pontos})</span> : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-8 border border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Nada na agenda do Luiz por enquanto. Quando você mandar uma foto do caderno
                    pra Donna, aparece aqui.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-semibold text-[var(--text-primary)]">
                💰 Resumo de {financas ? nomeMes(financas.mes) : "…"}
              </h2>
              {erroFin && (
                <p className="text-xs text-[var(--text-muted)]">Faça login pra ver o resumo. Seus links continuam abaixo.</p>
              )}
              {!financas && !erroFin && (
                <p className="text-sm text-[var(--text-muted)]">Carregando resumo do mês…</p>
              )}
              {financas && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
                  {cardResumo("Pessoal", financas.pessoal)}
                  {cardResumo("Empresa (Meraki)", financas.empresa)}
                  <p className="text-[11px] text-[var(--text-muted)] lg:col-span-2">
                    Soma das transações lançadas no mês (despesas já contam como saída). Lido ao vivo do seu Notion, sem expor nada em página pública.
                  </p>
                </div>
              )}
              <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)]">
                <h2 className="font-semibold text-[var(--text-primary)] mb-2">💰 Suas finanças no Notion</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Seus bancos de dados financeiros continuam no Segundo Cérebro (com o Louis
                  registrando por áudio no WhatsApp). Acesso direto:
                </p>
                <div className="flex flex-wrap gap-2">
                  {LINKS_FINANCAS.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full border font-medium" style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                      {l.rotulo} ↗
                    </a>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  O Louis registra por áudio no WhatsApp; o resumo acima lê esses lançamentos.
                </p>
              </div>
            </>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            Este hub cresce com você: saúde, casa e família ganham abas quando fizer sentido.
          </p>
        </div>
      </div>
    </div>
  );
}
