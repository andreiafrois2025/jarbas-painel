"use client";

// Página de Métricas v5 (12/07/2026) — menu superior com 3 visões:
//   Painel Geral (default, resumo tipo palestra) · Produtividade IA · Saúde do sistema
// Fonte: metrics-history.json publicado toda noite pelo metrics-snapshot.py.

import { useState } from "react";
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

const EQUIPE: [string, string][] = [
  ["🤵", "Jarbas"], ["🗂️", "Donna"], ["🔍", "Mike"], ["✍️", "Izzy"],
  ["🎨", "Felipe"], ["🗺️", "Eric"], ["⚖️", "Dr. Harvey"], ["📜", "Katrina"],
  ["💻", "Junior"], ["📊", "Tonny"], ["🎬", "Theo"], ["🧭", "Rafaela"],
  ["💰", "Louis"], ["🥗", "Lara"], ["🧠", "Dra. Nara"], ["📚", "Sofia"],
];

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

type Aba = "geral" | "producao" | "saude";

export default function MetricasPage() {
  const { data, erro, hoje } = useMetricsHistory();
  const [aba, setAba] = useState<Aba>("geral");

  if (erro) {
    return <p className="p-6 text-[var(--text-secondary)]">
      Não consegui carregar as métricas. A VPS publica o histórico toda noite — se acabou de configurar, aguarde a primeira rodada.
    </p>;
  }
  if (!data || !hoje) {
    return <p className="p-6 text-[var(--text-secondary)] animate-pulse">Carregando métricas…</p>;
  }

  const taxaSemanal = semanasOrdenadas(data.radar_semanas)
    .filter((s) => s.valor?.taxa !== null && s.valor?.taxa !== undefined)
    .map((s) => ({
      label: s.label,
      valor: Math.round((s.valor.taxa as number) * 100),
      detalhe: `${s.valor.aprovados} aprov. / ${s.valor.descartados} desc.`,
    }));

  const botaoAba = (id: Aba, rotulo: string) => (
    <button
      onClick={() => setAba(id)}
      className={`px-3 md:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
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
      {/* Menu superior */}
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">📊 Métricas</h1>
        {botaoAba("geral", "🎤 Painel Geral")}
        {botaoAba("producao", "🤖 Produtividade IA")}
        {botaoAba("saude", "❤️ Saúde do sistema")}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
          <p className="text-xs text-[var(--text-secondary)] text-right">
            snapshot diário · atualizado {tempoRelativo(data.updated_at)}
          </p>

          {aba === "geral" && <AbaGeral data={data} hoje={hoje} taxaSemanal={taxaSemanal} />}
          {aba === "producao" && <AbaProducao data={data} hoje={hoje} taxaSemanal={taxaSemanal} />}
          {aba === "saude" && <AbaSaude hoje={hoje} />}
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AbaGeral({ data, hoje, taxaSemanal }: { data: any; hoje: any; taxaSemanal: { label: string; valor: number }[] }) {
  return (
    <div className="space-y-6">
      <section className="text-center py-4">
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "#A0583C" }}>Minha fábrica com IA</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-6">
          {[
            [EQUIPE.length, "agentes na equipe"],
            [hoje.fila?.cards_gerados_total ?? "—", "notícias e dicas curadas"],
            [hoje.enviados_total ?? "—", "posts publicados"],
            [`${Math.round(hoje.horas_economizadas ?? 0)}h`, "de trabalho economizado"],
          ].map(([v, r]) => (
            <div key={String(r)}>
              <div className="text-4xl md:text-5xl font-bold" style={{ color: "#2D6B6B" }}>{v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">{r}</div>
            </div>
          ))}
        </div>
      </section>

      <CartaoGrafico titulo="A IA aprendendo o meu gosto 📈"
        sub="% das pautas propostas pela IA que eu aprovo, semana a semana">
        <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
      </CartaoGrafico>

      <section className="text-center">
        <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">A equipe</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {EQUIPE.map(([icone, nome]) => (
            <div key={nome} className="rounded-xl py-2.5 px-1 bg-[var(--bg-secondary)] border border-[#E5DED4]">
              <div className="text-xl">{icone}</div>
              <div className="text-[11px] mt-0.5 font-medium text-[var(--text-primary)]">{nome}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 justify-center text-sm">
        <a href="/metricas/palestra" target="_blank"
          className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: "#2D6B6B" }}>
          🎤 Modo palco (tela cheia)
        </a>
        <a href="/metricas/palestra?tema=trabalho" target="_blank"
          className="px-4 py-2 rounded-lg font-medium border" style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
          🏛️ Modo palco — serviço público (sem parte de conteúdo)
        </a>
      </div>
    </div>
  );
}

function AbaProducao({ data, hoje, taxaSemanal }: { data: any; hoje: any; taxaSemanal: { label: string; valor: number; detalhe?: string }[] }) {
  const enviosSemana = semanasOrdenadas(data.envios_semanas).map((s) => ({
    label: s.label, valor: s.valor as number,
  }));
  const porAgente = Object.entries((hoje.atividades_por_agente ?? {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1]);
  const icones: Record<string, string> = Object.fromEntries(EQUIPE.map(([i, n]) => [n, i]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icone="📤" titulo="Posts no grupo IA" valor={hoje.enviados_total ?? "—"}
          sub={`${hoje.fila?.enviados_7d ?? 0} nos últimos 7 dias`} />
        <Tile icone="⏱️" titulo="Horas economizadas" valor={`${hoje.horas_economizadas ?? 0}h`}
          sub={`fórmula: ${data.formula_horas?.post_grupo_min ?? 25} min/post + ${data.formula_horas?.carrossel_min ?? 120} min/carrossel`} />
        <Tile icone="💡" titulo="Dicas do banco" valor={`${hoje.dicas?.usadas ?? 0}/${hoje.dicas?.total ?? 0}`}
          sub="já usadas em posts" />
        <Tile icone="🤖" titulo="Squads (jobs)" valor={hoje.jobs?.concluidos ?? 0}
          sub={`concluídos · ${hoje.jobs?.ultimos_30d ?? 0} nos últimos 30 dias`} />
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[#E5DED4]">
        <h3 className="font-semibold text-[var(--text-primary)]">Atividades de hoje por agente</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Execuções registradas no feed do escritório (envios, curadorias, rondas)
        </p>
        {porAgente.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade registrada hoje ainda.</p>
        ) : (
          <ul className="space-y-2">
            {porAgente.map(([quem, n]) => (
              <li key={quem} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <span className="w-28 shrink-0">{icones[quem] ?? "🤖"} {quem}</span>
                <span className="h-3 rounded-full" style={{
                  background: "#2D6B6B",
                  width: `${Math.min(100, (n / Math.max(...porAgente.map(([, v]) => v))) * 100)}%`,
                  minWidth: 12,
                }} />
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <CartaoGrafico titulo="O Mike melhorando 📈"
          sub="Taxa de aprovação dos cards do Radar por semana de criação">
          <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Posts enviados ao grupo por semana"
          sub="Curadoria aprovada por você que chegou na comunidade">
          <GraficoBarras pontos={enviosSemana} />
        </CartaoGrafico>
      </div>
    </div>
  );
}

function AbaSaude({ hoje }: { hoje: any }) {
  const nivelUi = { verde: "🟢 Tudo funcionando", amarelo: "🟡 Atenção", vermelho: "🔴 Algo caiu" }[
    hoje.saude?.nivel as "verde" | "amarelo" | "vermelho"
  ] ?? `⚪ ${hoje.saude?.nivel ?? "?"}`;
  const sinais = Object.entries((hoje.saude?.sinais ?? {}) as Record<string, boolean>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile titulo="Estado geral" valor={nivelUi}
          sub={hoje.saude?.problemas?.length ? hoje.saude.problemas.join(" · ") : "nenhum problema aberto"} />
        <Tile icone="⏰" titulo="Rotinas automáticas" valor={`${hoje.saude?.crons_ok ?? "?"}/${hoje.saude?.crons_total ?? "?"}`}
          sub="rodando no horário" />
        <Tile icone="💾" titulo="Disco da VPS" valor={`${hoje.saude?.disco_pct ?? "?"}%`} sub="usado" />
        <Tile icone="📬" titulo="Fila do grupo IA"
          valor={hoje.fila?.pausado ? "⏸ pausada" : `${hoje.fila?.aprovados ?? 0} na fila`}
          sub={`${hoje.fila?.pendentes ?? 0} aguardando sua avaliação`} />
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
            {Object.entries((hoje.automacoes ?? {}) as Record<string, string | null>).map(([k, iso]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{NOME_AUTOMACAO[k] ?? k}</span>
                <span className="text-[var(--text-secondary)] whitespace-nowrap">{tempoRelativo(iso)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
