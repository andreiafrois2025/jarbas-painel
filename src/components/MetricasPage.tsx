"use client";

// Página de Métricas v4 (F-Métricas, 12/07/2026) — 2 camadas:
//   1. Saúde do ecossistema (status.json + snapshot diário)
//   2. Produção com IA ("o Mike melhorando", envios, horas economizadas)
// Fonte: metrics-history.json publicado toda noite pelo metrics-snapshot.py.

import { GraficoLinha, GraficoBarras } from "./charts";
import {
  useMetricsHistory, semanasOrdenadas, tempoRelativo,
} from "@/lib/metrics";

const NOME_AUTOMACAO: Record<string, string> = {
  style_learner: "Aprendiz de estilo (Mike)",
  radar_to_ig: "Ponte Radar → Instagram",
  reels_pipeline: "Pipeline de reels",
  ronda_diaria: "Ronda diária (Jarbas)",
  status_saude: "Semáforo de saúde",
};

function Tile({ titulo, valor, sub, icone }: {
  titulo: string; valor: string | number; sub?: string; icone?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[#E5DED4]">
      <div className="text-xs text-[var(--text-secondary)]">{icone} {titulo}</div>
      <div className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{valor}</div>
      {sub && <div className="text-xs mt-1 text-[var(--text-secondary)]">{sub}</div>}
    </div>
  );
}

function CartaoGrafico({ titulo, sub, children }: {
  titulo: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[#E5DED4]">
      <h3 className="font-semibold text-[var(--text-primary)]">{titulo}</h3>
      {sub && <p className="text-xs text-[var(--text-secondary)] mb-3">{sub}</p>}
      {children}
    </div>
  );
}

export default function MetricasPage() {
  const { data, erro, hoje } = useMetricsHistory();

  if (erro) {
    return <p className="p-6 text-[var(--text-secondary)]">
      Não consegui carregar as métricas. A VPS publica o histórico toda noite — se acabou de configurar, aguarde a primeira rodada.
    </p>;
  }
  if (!data || !hoje) {
    return <p className="p-6 text-[var(--text-secondary)] animate-pulse">Carregando métricas…</p>;
  }

  const nivelUi = { verde: "🟢 Tudo funcionando", amarelo: "🟡 Atenção", vermelho: "🔴 Algo caiu" }[
    hoje.saude.nivel as "verde" | "amarelo" | "vermelho"
  ] ?? `⚪ ${hoje.saude.nivel}`;

  const taxaSemanal = semanasOrdenadas(data.radar_semanas)
    .filter((s) => s.valor.taxa !== null)
    .map((s) => ({
      label: s.label,
      valor: Math.round((s.valor.taxa as number) * 100),
      detalhe: `${s.valor.aprovados} aprov. / ${s.valor.descartados} desc.`,
    }));

  const enviosSemana = semanasOrdenadas(data.envios_semanas).map((s) => ({
    label: s.label,
    valor: s.valor as number,
  }));

  const sinais = Object.entries(hoje.saude?.sinais ?? {});

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">📊 Métricas</h1>
        <span className="text-xs text-[var(--text-secondary)]">
          snapshot diário · atualizado {tempoRelativo(data.updated_at)}
        </span>
      </div>

      {/* ── Camada 1: saúde do ecossistema ─────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Saúde do ecossistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile titulo="Estado geral" valor={nivelUi}
            sub={hoje.saude.problemas.length ? hoje.saude.problemas.join(" · ") : "nenhum problema aberto"} />
          <Tile icone="⏰" titulo="Rotinas automáticas" valor={`${hoje.saude.crons_ok}/${hoje.saude.crons_total}`}
            sub="rodando no horário" />
          <Tile icone="💾" titulo="Disco da VPS" valor={`${hoje.saude.disco_pct ?? "?"}%`} sub="usado" />
          <Tile icone="📬" titulo="Fila do grupo IA"
            valor={hoje.fila.pausado ? "⏸ pausada" : `${hoje.fila.aprovados} na fila`}
            sub={`${hoje.fila.pendentes} aguardando sua avaliação`} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[#E5DED4]">
            <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Sinais vitais</h3>
            <ul className="space-y-1 text-sm text-[var(--text-primary)]">
              {sinais.map(([nome, ok]) => (
                <li key={nome} className="flex justify-between">
                  <span className="capitalize">{nome}</span>
                  <span>{ok ? "✅ no ar" : "❌ fora"}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[#E5DED4]">
            <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Última execução das automações</h3>
            <ul className="space-y-1 text-sm text-[var(--text-primary)]">
              {Object.entries(hoje.automacoes ?? {}).map(([k, iso]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>{NOME_AUTOMACAO[k] ?? k}</span>
                  <span className="text-[var(--text-secondary)] whitespace-nowrap">{tempoRelativo(iso)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Camada 2: produção com IA ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Produção com IA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile icone="📤" titulo="Posts no grupo IA" valor={hoje.enviados_total}
            sub={`${hoje.fila.enviados_7d} nos últimos 7 dias`} />
          <Tile icone="⏱️" titulo="Horas economizadas" valor={`${hoje.horas_economizadas}h`}
            sub={`fórmula: ${data.formula_horas?.post_grupo_min ?? 25} min/post + ${data.formula_horas?.carrossel_min ?? 120} min/carrossel`} />
          <Tile icone="💡" titulo="Dicas do banco" valor={`${hoje.dicas.usadas}/${hoje.dicas.total}`}
            sub="já usadas em posts" />
          <Tile icone="🤖" titulo="Squads (jobs)" valor={hoje.jobs.concluidos}
            sub={`concluídos · ${hoje.jobs.ultimos_30d} nos últimos 30 dias`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <CartaoGrafico
            titulo="O Mike melhorando 📈"
            sub="Taxa de aprovação dos cards do Radar por semana de criação — quanto mais o aprendiz de estilo ajusta, mais cirúrgica a curadoria"
          >
            <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
          </CartaoGrafico>
          <CartaoGrafico
            titulo="Posts enviados ao grupo por semana"
            sub="Curadoria aprovada por você que chegou na comunidade"
          >
            <GraficoBarras pontos={enviosSemana} />
          </CartaoGrafico>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          🎤 Versão de palco pra projetar em palestras:{" "}
          <a href="/metricas/palestra" className="underline" target="_blank">/metricas/palestra</a>
        </p>
      </section>
    </div>
    </div>
  );
}
