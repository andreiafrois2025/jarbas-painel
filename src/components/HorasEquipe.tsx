"use client";

// "Horas economizadas" da equipe inteira (18/10/2026): por agente (com o
// mascote), por tipo de entrega e o bloco "como calculamos", que mostra a
// tabela de minutos. Os dados vêm do metrics-history.json (campos
// horas_por_agente, horas_por_tipo e tabela_horas, escritos pelo
// metrics-snapshot.py a partir do livro-caixa /root/horas/entregas.jsonl).

import { useState } from "react";
import Mascote from "./Mascote";
import type { MetricsHistory, SnapshotDia } from "@/lib/metrics";

const EMOJI: Record<string, string> = {
  Jarbas: "🤖", Louis: "💰", Mike: "🔍", Izzy: "✍️", Felipe: "🎨", Katrina: "📑",
  Donna: "🗂️", Junior: "💻", Harvey: "⚖️", Theo: "🎬", Eric: "🗺️",
};

const fmtH = (v: number) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")}h`;

function Barra({ pct, cor = "#2D6B6B" }: { pct: number; cor?: string }) {
  return (
    <div className="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: cor }} />
    </div>
  );
}

export default function HorasEquipe({ hoje, tabela }: { hoje: SnapshotDia; tabela: MetricsHistory["tabela_horas"] }) {
  const [aberto, setAberto] = useState(false);
  const porAgente = Object.entries(hoje.horas_por_agente ?? {}).sort((a, b) => b[1] - a[1]);
  const porTipo = Object.entries(hoje.horas_por_tipo ?? {}).sort((a, b) => b[1] - a[1]);
  if (!porAgente.length) return null;
  const maxA = porAgente[0][1] || 1;
  const maxT = porTipo[0]?.[1] || 1;
  const rotulo = (t: string) => tabela?.tipos?.[t]?.rotulo ?? t;

  return (
    <section className="space-y-3" aria-label="Horas economizadas pela equipe">
      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "#A0583C" }}>
        Horas economizadas por toda a equipe
      </p>
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[#E5DED4] p-4">
          <h3 className="text-sm font-semibold">Por agente</h3>
          <p className="text-[10px] text-[var(--text-muted)] mb-3">quem mais devolveu tempo, no total acumulado</p>
          <ul className="space-y-2.5">
            {porAgente.map(([nome, h], i) => (
              <li key={nome} className="flex items-center gap-3">
                <Mascote nome={nome} emoji={EMOJI[nome] ?? "✨"} tamanho={i < 5 ? 40 : 28} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{nome}</span>
                    <span className="font-semibold tabular-nums" style={{ color: "#2D6B6B" }}>{fmtH(h)}</span>
                  </div>
                  <Barra pct={(h / maxA) * 100} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[#E5DED4] p-4">
          <h3 className="text-sm font-semibold">Por tipo de entrega</h3>
          <p className="text-[10px] text-[var(--text-muted)] mb-3">o que foi feito, somando os minutos da tabela</p>
          <ul className="space-y-2.5">
            {porTipo.map(([t, h]) => (
              <li key={t}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{rotulo(t)}</span>
                  <span className="font-semibold tabular-nums" style={{ color: "#A0583C" }}>{fmtH(h)}</span>
                </div>
                <Barra pct={(h / maxT) * 100} cor="#A0583C" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[#E5DED4] p-4">
        <button onClick={() => setAberto(!aberto)} aria-expanded={aberto}
          className="w-full flex items-center justify-between gap-2 text-left text-sm font-semibold">
          <span>Como calculamos</span>
          <span className="text-xs font-normal text-[var(--text-secondary)]">{aberto ? "esconder" : "ver a tabela de minutos"}</span>
        </button>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Cada entrega registrada vale os minutos que você levaria fazendo à mão. As estimativas são conservadoras e
          você pode ajustar: é só pedir ao Jarbas e tudo é recalculado, inclusive o passado.
        </p>
        {aberto && tabela?.tipos && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="py-1.5 pr-3 font-medium">Entrega</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Minutos</th>
                  <th className="py-1.5 font-medium">Por quê</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tabela.tipos).map(([t, v]) => (
                  <tr key={t} className="border-b border-[var(--border)]/50 align-top">
                    <td className="py-1.5 pr-3">{v.rotulo}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">{v.minutos}</td>
                    <td className="py-1.5 text-[var(--text-secondary)]">{v.porque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!!tabela.fora_da_conta?.length && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1">O que NÃO entra na conta</p>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-[var(--text-secondary)]">
                  {tabela.fora_da_conta.map((f) => (
                    <li key={f.fonte}><span className="text-[var(--text-primary)]">{f.fonte}</span>: {f.porque}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
