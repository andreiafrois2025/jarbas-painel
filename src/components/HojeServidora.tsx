"use client";

// "Hoje" no modo Servidora (Fase 5-A, 18/10/2026).
//
// Esta é uma tela À PARTE, e não o HojePanel com coisas escondidas, de
// propósito: o HojePanel chama /api/hoje sem filtro, que devolve agenda, tarefas
// e escola do Luiz. Aqui o pedido é /api/hoje?modo=servidora, e é o SERVIDOR que
// responde só com a agenda do calendário do Igam e as tarefas de Trabalho; o
// dado pessoal nem chega ao navegador (e não "pisca" na tela antes de sumir).
//
// O feed "o que a equipe fez" vem do status.json público (o do semáforo), filtrado.

import { useStatus } from "@/lib/status";
import { tempoRelativo } from "@/lib/metrics";
import { ehPessoal, ehColaboradorOculto } from "@/lib/modo";
import { useHoje } from "@/lib/hoje";

export default function HojeServidora({ lateral }: { lateral?: React.ReactNode }) {
  const { status } = useStatus();
  const { dados, erro } = useHoje(true, "servidora");
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  // Feed "o que a equipe fez": some tudo que cita assunto pessoal ou
  // colaborador oculto. Na dúvida, some (melhor esconder demais que de menos).
  const atividades = (status?.atividades ?? []).filter(
    (a) => !ehPessoal(a.quem, a.texto) && !ehColaboradorOculto(a.quem),
  );

  return (
    <div className="p-4 md:p-6 w-full space-y-5">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize">🏠 {hoje}</h1>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {lateral && (
          <div className="w-full lg:w-[320px] lg:shrink-0">{lateral}</div>
        )}

        <div className="flex-1 min-w-0 space-y-5 w-full">
          {erro ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Não consegui carregar a agenda e as tarefas de trabalho agora.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📅 Agenda do Igam</h2>
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                  {dados ? (dados.agenda || "Sem compromissos hoje.") : "carregando…"}
                </pre>
                {dados?.agenda_semana && (
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
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">✅ Tarefas de trabalho</h2>
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
                  {dados ? (dados.tarefas || "Sem tarefas pendentes pra hoje.") : "carregando…"}
                </pre>
                {dados?.tarefas_semana && (
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
          )}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              ⚡ O que a equipe fez
            </h2>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
              {atividades.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade de trabalho recente.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-[var(--text-primary)]">
                  {atividades.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span>{a.icone}</span>
                      <span className="flex-1"><strong>{a.quem}</strong> {a.texto}</span>
                      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{tempoRelativo(a.quando)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
