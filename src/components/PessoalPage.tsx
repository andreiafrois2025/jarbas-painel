"use client";

// 💛 Hub Pessoal — tudo que não é trabalho: escola do Luiz, finanças
// pessoais e espaço pra crescer (saúde, casa, família).

import { useState } from "react";
import { useHoje } from "@/lib/hoje";

type Aba = "luiz" | "financas";

const EMOJI_TIPO: Record<string, string> = { prova: "🔴", avaliativa: "🟡", paracasa: "🟢", envio: "➡️" };

const LINKS_FINANCAS = [
  { rotulo: "Finanças Pessoais (Notion)", url: "https://app.notion.com/p/2fbb90b9061d811b91aedee510b09f24" },
  { rotulo: "Revisão Diária (registrar o dia)", url: "https://app.notion.com/p/2fbb90b9061d81f8910aca4a14eb484e" },
];

export default function PessoalPage() {
  const [aba, setAba] = useState<Aba>("luiz");
  const { dados } = useHoje();
  const escola = dados?.escola ?? [];

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
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">💛 Pessoal</h1>
        {botao("luiz", "🎒 Luiz — escola")}
        {botao("financas", "💰 Finanças")}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          {aba === "luiz" ? (
            <>
              {escola.length > 0 && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)]">
                  <h2 className="font-semibold text-[var(--text-primary)] mb-3">📚 Próximas entregas do Luiz</h2>
                  <ul className="space-y-2">
                    {escola.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                        <span className="text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(e.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        <span>{EMOJI_TIPO[e.tipo] || "📌"}</span>
                        <span><strong>{e.disciplina}</strong>{e.nome ? ` — ${e.nome}` : ""}{e.pontos ? ` (${e.pontos})` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)]">
                <h2 className="font-semibold text-[var(--text-primary)] mb-2">📚 Como funciona a agenda escolar</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  A Central de Captura da Donna está em implantação: você vai mandar foto do
                  caderno, print do Teams ou bilhete da escola <strong>direto no WhatsApp</strong>,
                  e ela identifica a atividade, a disciplina e o prazo — colocando na sua agenda
                  e na lista de tarefas, no padrão que você já usa:
                </p>
                <div className="mt-3 text-sm rounded-lg p-3 font-mono" style={{ background: "var(--bg-primary)" }}>
                  🔴 Prova · 🟡 Atividade avaliativa · 🟢 Para casa<br />
                  ➡️ Envio da atividade · 📌 Observação importante
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  As regras do seu assistente (horário semanal das aulas, alternância
                  Matemática/Robótica das terças, envio × entrega) já estão salvas na VPS ✅.
                  Quando a captura entrar no ar, a agenda completa aparece aqui nesta tela.
                </p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border)]">
                <h2 className="font-semibold text-[var(--text-primary)] mb-2">Enquanto isso</h2>
                <div className="flex flex-wrap gap-2">
                  <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full border font-medium" style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                    Agenda Google ↗
                  </a>
                  <a href="https://app.notion.com/p/a73b90b9061d8299899f81c8938e9de6" target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full border font-medium" style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                    Lista de tarefas ↗
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
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
                  Próximo passo (roadmap): resumo do mês aqui nesta tela, lendo os DBs do
                  Notion sem expor nada em página pública.
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
