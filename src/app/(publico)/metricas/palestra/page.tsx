"use client";

// 🎤 Modo palestra — tela limpa pra projetar em apresentações.
// Rota pública de propósito: sem login no palco, e a fonte de dados
// (metrics-history.json) já é um objeto público sem nada sensível.
// ?tema=trabalho → versão pro serviço público (sem a parte de criadora
// de conteúdo: some posts/Instagram, o foco vira automação e equipe).

import { useEffect, useState } from "react";
import { GraficoLinha } from "@/components/charts";
import { useMetricsHistory, semanasOrdenadas } from "@/lib/metrics";

const EQUIPE = [
  ["🤵", "Jarbas"], ["🗂️", "Donna"], ["🔍", "Mike"], ["✍️", "Izzy"],
  ["🎨", "Felipe"], ["🗺️", "Eric"], ["⚖️", "Dr. Harvey"], ["📜", "Katrina"],
  ["💻", "Junior"], ["📊", "Tonny"], ["🎬", "Theo"], ["🧭", "Rafaela"],
  ["💰", "Louis"], ["🥗", "Lara"], ["🧠", "Dra. Nara"], ["📚", "Sofia"],
];

function Contador({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl md:text-7xl font-bold" style={{ color: "#2D6B6B" }}>{valor}</div>
      <div className="mt-2 text-sm md:text-base uppercase tracking-widest" style={{ color: "#6B7A7A" }}>
        {rotulo}
      </div>
    </div>
  );
}

export default function PalestraPage() {
  const { data, hoje } = useMetricsHistory(5 * 60 * 1000);
  const [trabalho, setTrabalho] = useState(false);

  useEffect(() => {
    setTrabalho(new URLSearchParams(window.location.search).get("tema") === "trabalho");
  }, []);

  if (!data || !hoje) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#F5F0EA" }}>
        <span className="animate-pulse" style={{ color: "#6B7A7A" }}>Carregando…</span>
      </main>
    );
  }

  const taxaSemanal = semanasOrdenadas(data.radar_semanas)
    .filter((s) => s.valor?.taxa !== null && s.valor?.taxa !== undefined)
    .map((s) => ({ label: s.label, valor: Math.round((s.valor.taxa as number) * 100) }));

  const atividadesHoje = Object.values(hoje.atividades_por_agente ?? {}).reduce((a, b) => a + b, 0);

  const contadores: [string | number, string][] = trabalho
    ? [
        [EQUIPE.length, "agentes na equipe"],
        [`${hoje.saude?.crons_ok ?? "—"}+`, "rotinas automáticas diárias"],
        [atividadesHoje || hoje.fila?.cards_gerados_total || "—", "ações executadas hoje"],
        [`${Math.round(hoje.horas_economizadas ?? 0)}h`, "de trabalho economizado"],
      ]
    : [
        [EQUIPE.length, "agentes na equipe"],
        [hoje.fila?.cards_gerados_total ?? "—", "notícias e dicas curadas"],
        [hoje.enviados_total ?? "—", "posts publicados"],
        [`${Math.round(hoje.horas_economizadas ?? 0)}h`, "de trabalho economizado"],
      ];

  return (
    <main className="min-h-screen px-6 py-10 md:px-16 md:py-14 relative" style={{ background: "#F5F0EA", color: "#2D3B3B" }}>
      {/* voltar discreto — some na projeção, aparece pra quem procura */}
      <a href="/metricas" className="absolute top-3 left-4 text-sm opacity-30 hover:opacity-90 transition-opacity"
        style={{ color: "#2D3B3B" }}>
        ← painel
      </a>

      <header className="text-center mb-10">
        <p className="text-sm uppercase tracking-[0.3em]" style={{ color: "#A0583C" }}>
          {trabalho ? "Produtividade com IA, na prática" : "IA na prática, de verdade"}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">
          {trabalho ? "Meu escritório de agentes de IA" : "Minha fábrica de conteúdo com IA"}
        </h1>
        <p className="mt-2 text-base md:text-lg" style={{ color: "#6B7A7A" }}>
          {trabalho
            ? "agentes especializados trabalhando 24h · decisão sempre humana"
            : "rodando sozinha numa VPS · curadoria sempre humana · @andreiarfrois"}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-12">
        {contadores.map(([v, r]) => <Contador key={r} valor={v} rotulo={r} />)}
      </section>

      {!trabalho && (
        <section className="max-w-3xl mx-auto mb-12 rounded-2xl p-6 md:p-8" style={{ background: "#FFFFFF" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-1">
            A IA aprendendo o meu gosto 📈
          </h2>
          <p className="text-center text-sm mb-4" style={{ color: "#6B7A7A" }}>
            % das pautas propostas pela IA que eu aprovo, semana a semana
          </p>
          <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} altura={260} />
        </section>
      )}

      {trabalho && (
        <section className="max-w-3xl mx-auto mb-12 rounded-2xl p-6 md:p-8" style={{ background: "#FFFFFF" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-4">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
            <div><div className="text-3xl mb-2">🤖</div>Agentes especializados monitoram, organizam e preparam o trabalho repetitivo</div>
            <div><div className="text-3xl mb-2">👩🏽</div>A decisão é sempre humana: eu aprovo, ajusto ou descarto num quadro simples</div>
            <div><div className="text-3xl mb-2">📱</div>O sistema me avisa no WhatsApp e se monitora sozinho, 24h por dia</div>
          </div>
        </section>
      )}

      <section className="max-w-4xl mx-auto text-center">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#6B7A7A" }}>
          A equipe (cada um com sua especialidade)
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {EQUIPE.map(([icone, nome]) => (
            <div key={nome} className="rounded-xl py-3 px-1" style={{ background: "#FFFFFF" }}>
              <div className="text-2xl">{icone}</div>
              <div className="text-xs mt-1 font-medium">{nome}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center mt-12 text-sm" style={{ color: "#6B7A7A" }}>
        {trabalho ? "Andréia Frois · IA aplicada ao serviço público" : "andreiafrois.tech · Imersão IA na Prática"}
      </footer>
    </main>
  );
}
