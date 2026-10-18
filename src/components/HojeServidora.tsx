"use client";

// "Hoje" no modo Servidora (Fase 5-A, 18/10/2026).
//
// Esta é uma tela À PARTE, e não o HojePanel com coisas escondidas, de
// propósito: o HojePanel chama /api/hoje, que devolve agenda, tarefas e escola
// do Luiz numa resposta só. Aqui nada disso é pedido ao servidor, então o dado
// pessoal nem chega ao navegador (e não "pisca" na tela antes de sumir).
//
// A única fonte é o status.json público (o mesmo do semáforo), filtrado.

import { useStatus } from "@/lib/status";
import { tempoRelativo } from "@/lib/metrics";
import { ehPessoal, ehColaboradorOculto, ROTULO_OCULTO } from "@/lib/modo";

export default function HojeServidora({ lateral }: { lateral?: React.ReactNode }) {
  const { status } = useStatus();
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
          <section className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">📅 Agenda e ✅ Tarefas</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Ocultas no modo Servidora ({ROTULO_OCULTO}). O painel nem pede esses dados ao servidor.
            </p>
          </section>

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
