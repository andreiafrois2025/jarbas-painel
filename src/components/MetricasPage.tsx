"use client";

// Números (19/10/2026, mock aprovado "numeros-novo"): três abas.
//   Visão geral  · horas economizadas (HorasEquipe.tsx; dados do livro-caixa)
//   Por agente   · atividades por agente (hoje e 30 dias) + "outros gráficos"
//   Diário de bordo · linha do tempo dos snapshots diários
// Fontes: metrics-history.json (snapshot noturno) e /api/numeros/resumo (livro-caixa).
// ChipsArea/Area continuam exportados: o modo palco público (/metricas/palestra) os usa.

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraficoLinha, GraficoBarras, GraficoPizza } from "./charts";
import { usePainel } from "@/lib/painel-context";
import { ehPessoal, ehColaboradorOculto, pareceComando } from "@/lib/modo";
import { useMetricsHistory, semanasOrdenadas, tempoRelativo } from "@/lib/metrics";
import { useNumerosResumo } from "@/lib/saude";
import { useAbaUrl } from "@/lib/navegacao";
import HorasEquipe from "./HorasEquipe";
import { Abas, CartaoSecao } from "./ui";

// Filtro de área — chip no topo, afeta as abas "Painel Geral" e "Produtividade IA".
// "tudo" = comportamento de sempre (soma/mostra tudo). "conteudo" = só o que já
// existe hoje (fila/radar/envios/dicas/reels/horas_conteudo). "servidora" = só
// horas_trabalho e o que existir de licitação/serviço — sem inventar número.
export type Area = "tudo" | "conteudo" | "servidora";

export function ChipsArea({ area, setArea }: { area: Area; setArea: (a: Area) => void }) {
  const opcoes: [Area, string][] = [
    ["tudo", "Tudo"],
    ["conteudo", "🎨 Conteúdo"],
    ["servidora", "🏛️ Servidora"],
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {opcoes.map(([id, rotulo]) => (
        <button
          key={id}
          onClick={() => setArea(id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            area === id
              ? "text-white border-transparent"
              : "text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
          style={area === id ? { background: "#2D6B6B" } : undefined}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}


function CartaoGrafico({ titulo, sub, children }: {
  titulo: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <CartaoSecao titulo={titulo}>
      {sub && <p className="text-[13px] text-[var(--text-secondary)] mb-3 -mt-1">{sub}</p>}
      {children}
    </CartaoSecao>
  );
}


type Aba = "geral" | "agente" | "diario";

export default function MetricasPage() {
  const { data, erro, hoje } = useMetricsHistory();
  const { dados: numeros, erro: erroNumeros } = useNumerosResumo();
  const [aba, mudar] = useAbaUrl<Aba>(["geral", "agente", "diario"], "geral");

  const taxaSemanal = data ? semanasOrdenadas(data.radar_semanas)
    .filter((s) => s.valor?.taxa !== null && s.valor?.taxa !== undefined)
    .map((s) => ({
      label: s.label,
      valor: Math.round((s.valor.taxa as number) * 100),
      detalhe: `${s.valor.aprovados} aprov. / ${s.valor.descartados} desc.`,
    })) : [];

  const palestra = (
    <a href="/metricas/palestra" target="_blank" rel="noreferrer"
      className="my-2 shrink-0 whitespace-nowrap rounded-full border border-[var(--border)] px-4 py-2 text-[13.5px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
      🎤 versão para palestra ↗
    </a>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Números" valor={aba} onMuda={(v) => mudar(v)} direita={palestra} opcoes={[
        { id: "geral", rotulo: "📊 Visão geral" },
        { id: "agente", rotulo: "🤖 Por agente" },
        { id: "diario", rotulo: "📖 Diário de bordo" },
      ]} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-6 w-full space-y-4">
          {erro ? (
            <p className="text-[var(--text-secondary)]">
              Não consegui carregar as métricas. A VPS publica o histórico toda noite — se acabou de configurar, aguarde a primeira rodada.
            </p>
          ) : !data || !hoje ? (
            <p className="text-[var(--text-secondary)] animate-pulse">Carregando métricas…</p>
          ) : (
            <>
              {aba === "geral" && <HorasEquipe hoje={hoje} tabela={data.tabela_horas} numeros={numeros} semDadoNumeros={erroNumeros} />}
              {aba === "agente" && <AbaAgente data={data} hoje={hoje} taxaSemanal={taxaSemanal} />}
              {aba === "diario" && <AbaDiario data={data} />}
              <p className="text-xs text-[var(--text-muted)] text-right">snapshot diário · atualizado {tempoRelativo(data.updated_at)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AbaAgente({ data, hoje, taxaSemanal }: {
  data: any; hoje: any; taxaSemanal: { label: string; valor: number; detalhe?: string }[];
}) {
  const { servidora } = usePainel();
  const dias: any[] = data?.days ?? [];

  const somaAgentes = (janela: any[]) => {
    const acc: Record<string, number> = {};
    for (const d of janela) {
      for (const [quem, qtd] of Object.entries((d.atividades_por_agente ?? {}) as Record<string, number>)) {
        if (servidora && ehColaboradorOculto(quem)) continue; // modo Servidora
        acc[quem] = (acc[quem] ?? 0) + qtd;
      }
    }
    return acc;
  };
  const hojePorAgente = Object.fromEntries(
    Object.entries((hoje?.atividades_por_agente ?? {}) as Record<string, number>)
      .filter(([quem]) => !(servidora && ehColaboradorOculto(quem))),
  ) as Record<string, number>;
  const mesPorAgente = somaAgentes(dias.slice(-30));
  const totalHoje = Object.values(hojePorAgente).reduce((a, b) => a + b, 0);
  const totalMes = Object.values(mesPorAgente).reduce((a, b) => a + b, 0);
  const emBarras = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([label, valor]) => ({ label, valor }));

  const r = hoje?.resumo_automacoes;
  const porCategoria = (() => {
    if (!r?.itens) return [];
    const m = new Map<string, number>();
    for (const i of r.itens) if (!(servidora && (ehPessoal(i.nome, i.categoria) || pareceComando(i.nome)))) m.set(i.categoria || "outros", (m.get(i.categoria || "outros") ?? 0) + 1);
    return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
  })();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <CartaoGrafico titulo="Atividades por agente: hoje" sub="quem trabalhou desde a meia-noite">
          {totalHoje ? <GraficoBarras pontos={emBarras(hojePorAgente)} />
            : <p className="text-sm text-[var(--text-muted)] py-6 text-center">nenhuma atividade registrada hoje ainda</p>}
        </CartaoGrafico>
        <CartaoGrafico titulo="Atividades por agente: últimos 30 dias"
          sub={`somando os ${Math.min(dias.length, 30)} dias que já temos guardados`}>
          {totalMes ? <GraficoBarras pontos={emBarras(mesPorAgente)} />
            : <p className="text-sm text-[var(--text-muted)] py-6 text-center">ainda sem histórico suficiente</p>}
        </CartaoGrafico>
      </div>

      {/* Os gráficos das abas antigas (Painel Geral e Produtividade IA) continuam aqui, recolhidos. */}
      <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 md:p-6">
        <summary className="cursor-pointer select-none text-[13px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          Outros gráficos: automações, conteúdo e aprendizado da IA
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <CartaoGrafico titulo="Automações por categoria" sub={`${r?.total ?? 0} no relógio da VPS`}>
              <GraficoPizza fatias={porCategoria} />
            </CartaoGrafico>
            <CartaoGrafico titulo="Quanto do que roda gasta IA" sub="todas foram construídas com IA, poucas precisam dela para rodar">
              <GraficoPizza fatias={r ? [
                { rotulo: "Roda sem IA", valor: r.sem_ia },
                { rotulo: "Consome IA", valor: r.com_ia },
              ] : []} />
            </CartaoGrafico>
            <CartaoGrafico titulo="A IA aprendendo o meu gosto 📈" sub="% do que a IA propõe que eu aprovo, semana a semana">
              <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
            </CartaoGrafico>
            <SecaoIAConstroi />
          </div>
          <AbaProducao data={data} hoje={hoje} taxaSemanal={taxaSemanal} area="tudo" />
        </div>
      </details>
    </div>
  );
}

function SecaoIAConstroi() {
  const [aberto, setAberto] = useState(false);
  const { hoje } = useMetricsHistory();
  const { servidora } = usePainel();
  const r0 = hoje?.resumo_automacoes;
  // Modo Servidora: automações pessoais saem da lista e da contagem
  const r = r0 && servidora
    ? (() => {
        const itens = r0.itens.filter((a) => !ehPessoal(a.nome, a.categoria) && !pareceComando(a.nome));
        const com_ia = itens.filter((a) => a.usa_ia).length;
        return { ...r0, itens, total: itens.length, com_ia, sem_ia: itens.length - com_ia };
      })()
    : r0;

  // 25/07/2026 (F2): esse número vinha de uma lista digitada à mão que tinha
  // parado em 17 enquanto o relógio da VPS já tinha 20 — e ele vai pro telão
  // no modo palco. Agora sai da contagem real, feita no snapshot da VPS.
  if (!r) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[#E5DED4] text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          A contagem das automações chega no próximo resumo da madrugada.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[#E5DED4]">
      <p className="text-base font-semibold text-[var(--text-primary)]">
        🧮 Das <span style={{ color: "#2D6B6B" }}>{r.total} automações</span> no ar,{" "}
        <span style={{ color: "#A0583C" }}>{r.sem_ia} rodam sem gastar 1 token de IA</span>
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">
        Todas foram <strong>construídas</strong> com IA — mas a maioria <strong>roda</strong> só com Python, de graça, pra sempre.
      </p>
      <button onClick={() => setAberto(!aberto)} className="text-xs underline decoration-dotted mt-2 text-[var(--text-secondary)] cursor-pointer">
        {aberto ? "esconder a lista" : "ver quem é quem"}
      </button>
      {aberto && (
        <div className="grid gap-1.5 mt-3 text-left max-h-[38vh] overflow-y-auto pr-1">
          {r.itens.map((a) => (
            <div key={a.nome} className="flex items-start gap-2 text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--bg-primary)" }}>
              <span>{a.usa_ia ? "🤖" : "🐍"}</span>
              <span className="text-[var(--text-primary)]">
                {a.nome}
                <span className="block text-xs text-[var(--text-secondary)]">
                  {a.usa_ia ? `usa IA: ${a.custo}` : `sem IA na execução (${a.custo})`}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AbaProducao({ data, hoje, taxaSemanal, area }: {
  data: any; hoje: any; taxaSemanal: { label: string; valor: number; detalhe?: string }[]; area: Area;
}) {
  // 25/07 (tarde) — reescrita com a regra dela: "pensar sempre em total que já
  // foi feito na vida e total dos últimos 30 e 7 dias, pra demonstrar tudo que
  // já foi feito e a evolução".
  //
  // Esta aba é sobre CONTEÚDO. O que é do ecossistema mudou pro Painel Geral, e
  // o que é do trabalho de servidora tem cards próprios no fim.
  const dias: any[] = data?.days ?? [];
  const mostraConteudo = area !== "servidora";

  const enviosSemana = semanasOrdenadas(data.envios_semanas).map((s) => ({
    label: s.label, valor: s.valor as number,
  }));

  // Diferença entre o começo e o fim da janela = o que aconteceu nela.
  const noPeriodo = (n: number, campo: (d: any) => number) => {
    const janela = dias.slice(-n);
    if (janela.length < 2) return null;
    return Math.max(0, campo(janela[janela.length - 1]) - campo(janela[0]));
  };
  const enviados = (d: any) => d?.enviados_total ?? 0;
  const enviados7 = noPeriodo(7, enviados);
  const enviados30 = noPeriodo(30, enviados);

  const cards: [string, string | number, string?][] = [
    ["📤 Posts no grupo — total", hoje.enviados_total ?? "—", "desde o começo"],
    ["📤 Nos últimos 30 dias", enviados30 ?? "—", enviados30 == null ? "precisa de mais histórico" : undefined],
    ["📤 Nos últimos 7 dias", hoje.fila?.enviados_7d ?? enviados7 ?? "—"],
    ["💡 Dicas no banco", hoje.dicas?.total ?? "—", `${hoje.dicas?.nunca_usadas ?? 0} nunca usadas`],
    ["💡 Vezes que uma dica foi ao grupo", hoje.dicas?.envios_total ?? "—", "a mesma dica pode voltar"],
    ["📰 Notícias e dicas curadas", hoje.fila?.cards_gerados_total ?? "—", "tudo que já passou pelo Radar"],
    ["📥 Esperando sua avaliação", hoje.fila?.pendentes ?? "—"],
    ["⏱️ Horas economizadas em conteúdo", `${Math.round(hoje.horas_conteudo ?? hoje.horas_economizadas ?? 0)}h`],
  ];

  const cardsServidora: [string, string | number, string?][] = [
    ["🤖 Squads executadas", hoje.jobs?.total ?? "—", `${hoje.jobs?.concluidos ?? 0} concluídas`],
    ["🤖 Squads nos últimos 30 dias", hoje.jobs?.ultimos_30d ?? "—"],
    ["⏱️ Horas no serviço público", hoje.horas_trabalho != null ? `${Math.round(hoje.horas_trabalho)}h` : "—",
      hoje.horas_trabalho == null ? "medição chega com o hub IGAM" : undefined],
  ];

  const Bloco = ({ titulo, itens }: { titulo: string; itens: [string, string | number, string?][] }) => (
    <section>
      <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: "#A0583C" }}>{titulo}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {itens.map(([rotulo, valor, sub]) => (
          <div key={rotulo} className="bg-[var(--bg-secondary)] rounded-xl border border-[#E5DED4] px-4 py-3.5">
            <div className="text-2xl font-bold leading-none" style={{ color: "#2D6B6B" }}>{valor}</div>
            <div className="mt-1.5 text-xs text-[var(--text-secondary)]">{rotulo}</div>
            {sub && <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      {mostraConteudo && <Bloco titulo="Conteúdo — o que já saiu" itens={cards} />}
      {area !== "conteudo" && <Bloco titulo="Trabalho de servidora" itens={cardsServidora} />}

      {mostraConteudo && (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <CartaoGrafico titulo="Posts enviados ao grupo, por semana"
            sub="cada barra é uma semana, do domingo ao sábado">
            <GraficoBarras pontos={enviosSemana} />
          </CartaoGrafico>
          <CartaoGrafico titulo="A IA aprendendo o meu gosto 📈"
            sub="% dos cards propostos que eu aprovo, por semana">
            <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
          </CartaoGrafico>
        </div>
      )}
    </div>
  );
}

function AbaDiario({ data }: { data: any }) {
  const dias = [...(data.days ?? [])].reverse(); // mais recente primeiro
  const cartaoCerebro = (
    <Link href="/cerebro" className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 no-underline text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
        <span className="text-2xl">🧠</span>
        <span className="text-[15px] font-semibold">Abrir o Cérebro: projetos, decisões e notas do Jarbas</span>
      </Link>
  );
  if (dias.length === 0) {
    return (
      <div className="space-y-4">
        {cartaoCerebro}
        <p className="text-sm text-[var(--text-secondary)]">O diário começa a se preencher com os snapshots diários.</p>
      </div>
    );
  }
  const fmtData = (iso: string) =>
    new Date(iso + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="space-y-4">
      {cartaoCerebro}
      <p className="text-sm text-[var(--text-secondary)]">
        A linha do tempo do que o ecossistema fez por você. Cresce um marco a cada dia — vira material de palestra e memória do que rodou enquanto você tocava a vida.
      </p>
      <div className="relative border-l-2 border-[#E5DED4] ml-3 space-y-5">
        {dias.map((d: any, i: number) => {
          const ant = dias[i + 1];
          const postsHoje = ant ? Math.max(0, (d.enviados_total ?? 0) - (ant.enviados_total ?? 0)) : d.fila?.enviados_7d;
          const cardsHoje = ant ? Math.max(0, (d.fila?.cards_gerados_total ?? 0) - (ant.fila?.cards_gerados_total ?? 0)) : null;
          const marcos: string[] = [];
          if (postsHoje) marcos.push(`📤 ${postsHoje} post${postsHoje > 1 ? "s" : ""} no grupo`);
          if (cardsHoje) marcos.push(`📡 ${cardsHoje} notícia/dica curada${cardsHoje > 1 ? "s" : ""}`);
          const ativ = Object.values(d.atividades_por_agente ?? {}).reduce((a: number, b: any) => a + b, 0);
          if (ativ) marcos.push(`⚡ ${ativ} ações de agentes`);
          if (d.saude?.problemas?.length) marcos.push(`⚠️ ${d.saude.problemas.length} alerta(s)`);
          if (d.horas_conteudo) marcos.push(`⏱️ ${d.horas_conteudo}h acumuladas`);
          return (
            <div key={d.date} className="ml-5 relative">
              <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full" style={{ background: i === 0 ? "#A0583C" : "#2D6B6B", border: "2px solid var(--bg-primary)" }} />
              <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{fmtData(d.date)}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {marcos.length ? marcos.map((m) => (
                  <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">{m}</span>
                )) : <span className="text-xs text-[var(--text-muted)]">dia tranquilo</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

