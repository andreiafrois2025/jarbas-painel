"use client";

// Página de Métricas v5 (12/07/2026) — menu superior com 3 visões:
//   Painel Geral (default, resumo tipo palestra) · Produtividade IA · Saúde do sistema
// Fonte: metrics-history.json publicado toda noite pelo metrics-snapshot.py.

import { useState, useEffect } from "react";
import { GraficoLinha, GraficoBarras, GraficoPizza } from "./charts";
import { usePainel } from "@/lib/painel-context";
import {
  useMetricsHistory, semanasOrdenadas, tempoRelativo,
} from "@/lib/metrics";
import { fetchEquipePublica, fallbackPublico, type AgentePublico } from "@/lib/equipe";

// Grid da equipe clicável: abre a bio do agente num popover. A descrição vinha
// da página "modo palco"; como ela vai virar espelho do dash (pedido 19/07), a
// bio passou a viver aqui também. Fonte: equipe-publica.json (com fallback).
function EquipeGrid() {
  const [equipe, setEquipe] = useState<AgentePublico[]>(fallbackPublico());
  const [sel, setSel] = useState<AgentePublico | null>(null);

  useEffect(() => {
    fetchEquipePublica().then((e) => e && setEquipe(e));
  }, []);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  return (
    <section className="text-center">
      <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">A equipe</h3>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {equipe.map((a) => (
          <button
            key={a.nome}
            onClick={() => setSel(a)}
            className="rounded-xl py-2.5 px-1 bg-[var(--bg-secondary)] border border-[#E5DED4] hover:border-[var(--accent)] hover:shadow-sm transition-all cursor-pointer"
            title={`Ver ${a.nome}`}
          >
            <div className="text-xl">{a.icone}</div>
            <div className="text-[11px] mt-0.5 font-medium text-[var(--text-primary)]">{a.nome}</div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 text-left"
          style={{ background: "rgba(45,59,59,.45)" }} onClick={() => setSel(null)}>
          <div className="rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            style={{ background: "#F5F0EA", color: "#2D3B3B" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{sel.icone}</span>
              <div>
                <h3 className="text-2xl font-bold">{sel.nome}</h3>
                {sel.papel && <p className="text-sm uppercase tracking-widest" style={{ color: "#A0583C" }}>{sel.papel}</p>}
              </div>
            </div>
            {sel.bio && <p className="mt-4 text-sm md:text-base leading-relaxed whitespace-pre-line">{sel.bio}</p>}
            {sel.skills.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A7A" }}>Habilidades</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sel.skills.map((h) => (
                    <span key={h} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "#FFFFFF", color: "#2D6B6B", border: "1px solid #2D6B6B" }}>{h}</span>
                  ))}
                </div>
              </>
            )}
            {sel.funcoes.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A7A" }}>Funções que executa</p>
                <ul className="mt-2 space-y-1.5">
                  {sel.funcoes.map((f, i) => (
                    <li key={i} className="text-sm rounded-lg px-3 py-2" style={{ background: "#FFFFFF" }}>
                      <span className="font-medium">{f.descricao || f.nome}</span>
                      {f.descricao && f.nome && <span className="block text-xs" style={{ color: "#6B7A7A" }}>via {f.nome}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sel.personalidade && (
              <p className="mt-4 text-xs italic leading-relaxed" style={{ color: "#6B7A7A" }}>“{sel.personalidade}”</p>
            )}
            <button onClick={() => setSel(null)} className="mt-5 text-sm underline opacity-60 hover:opacity-100">fechar</button>
          </div>
        </div>
      )}
    </section>
  );
}

export const NOME_AUTOMACAO: Record<string, string> = {
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

export function Tile({ titulo, valor, sub, icone }: {
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

type Aba = "geral" | "producao" | "diario";
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

export default function MetricasPage() {
  const { data, erro, hoje } = useMetricsHistory();
  const [aba, setAba] = useState<Aba>("geral");
  const [area, setArea] = useState<Area>("tudo");

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
        {botaoAba("diario", "📖 Diário de bordo")}
      </div>

      {/* Filtro de área — só afeta Painel Geral e Produtividade IA */}
      {(aba === "geral" || aba === "producao") && (
        <div className="px-3 md:px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <ChipsArea area={area} setArea={setArea} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 w-full space-y-6">
          <p className="text-xs text-[var(--text-secondary)] text-right">
            snapshot diário · atualizado {tempoRelativo(data.updated_at)}
          </p>

          {aba === "geral" && <AbaGeral data={data} hoje={hoje} taxaSemanal={taxaSemanal} area={area} />}
          {aba === "producao" && <AbaProducao data={data} hoje={hoje} taxaSemanal={taxaSemanal} area={area} />}
          {aba === "diario" && <AbaDiario data={data} />}
        </div>
      </div>
    </div>
  );
}

function SecaoIAConstroi() {
  const [aberto, setAberto] = useState(false);
  const { hoje } = useMetricsHistory();
  const r = hoje?.resumo_automacoes;

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
function AbaGeral({ data, hoje, taxaSemanal }: {
  data: any; hoje: any; taxaSemanal: { label: string; valor: number }[]; area: Area;
}) {
  const { collaborators, assignments } = usePainel();

  // 25/07 (tarde) — o Painel Geral passou a ser sobre o ECOSSISTEMA, não sobre
  // conteúdo. Pedido dela: "coisas gerais assim, do ecossistema".
  // Regra que ela deu e vale pra tudo aqui: sempre TOTAL DA VIDA + ÚLTIMOS 30
  // DIAS, pra mostrar o que já foi feito e a evolução.
  const dias: any[] = data?.days ?? [];
  const ultimos = (n: number) => dias.slice(-n);

  const somaAgentes = (janela: any[]) => {
    const acc: Record<string, number> = {};
    for (const d of janela) {
      for (const [quem, qtd] of Object.entries((d.atividades_por_agente ?? {}) as Record<string, number>)) {
        acc[quem] = (acc[quem] ?? 0) + qtd;
      }
    }
    return acc;
  };

  const hojePorAgente = (hoje?.atividades_por_agente ?? {}) as Record<string, number>;
  const mesPorAgente = somaAgentes(ultimos(30));
  const totalHoje = Object.values(hojePorAgente).reduce((a, b) => a + b, 0);
  const totalMes = Object.values(mesPorAgente).reduce((a, b) => a + b, 0);

  // Horas: o snapshot guarda o acumulado do dia, então o total é o último valor
  // e a evolução é a diferença pro começo da janela.
  const horasHoje = hoje?.horas_economizadas ?? 0;
  const horas30 = (() => {
    const janela = ultimos(30);
    if (janela.length < 2) return null;
    return Math.max(0, (janela[janela.length - 1]?.horas_economizadas ?? 0) - (janela[0]?.horas_economizadas ?? 0));
  })();

  const r = hoje?.resumo_automacoes;
  const porCategoria = (() => {
    if (!r?.itens) return [];
    const m = new Map<string, number>();
    for (const i of r.itens) m.set(i.categoria || "outros", (m.get(i.categoria || "outros") ?? 0) + 1);
    return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
  })();

  const emBarras = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([label, valor]) => ({ label, valor }));

  const cards: [string | number, string, string?][] = [
    [`${Math.round(horasHoje)}h`, "horas economizadas no total", "desde que começamos a medir"],
    [horas30 == null ? "—" : `${Math.round(horas30)}h`, "nos últimos 30 dias", horas30 == null ? "precisa de mais dias de histórico" : undefined],
    [collaborators.length, "agentes na equipe"],
    [assignments.length, "assistentes em uso"],
    [totalMes || "—", "atividades nos últimos 30 dias", "feitas pelos agentes, sozinhos"],
    [totalHoje || "—", "atividades hoje"],
  ];

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: "#A0583C" }}>
          Meu ecossistema
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {cards.map(([v, r1, sub]) => (
            <div key={String(r1)} className="bg-[var(--bg-secondary)] rounded-xl border border-[#E5DED4] px-4 py-4">
              <div className="text-3xl font-bold leading-none" style={{ color: "#2D6B6B" }}>{v}</div>
              <div className="mt-1.5 text-xs text-[var(--text-secondary)]">{r1}</div>
              {sub && <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{sub}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <CartaoGrafico titulo="Atividades por agente — hoje" sub="quem trabalhou desde a meia-noite">
          {totalHoje ? <GraficoBarras pontos={emBarras(hojePorAgente)} />
            : <p className="text-sm text-[var(--text-muted)] py-6 text-center">nenhuma atividade registrada hoje ainda</p>}
        </CartaoGrafico>

        <CartaoGrafico titulo="Atividades por agente — últimos 30 dias"
          sub={`somando os ${Math.min(dias.length, 30)} dias que já temos guardados`}>
          {totalMes ? <GraficoBarras pontos={emBarras(mesPorAgente)} />
            : <p className="text-sm text-[var(--text-muted)] py-6 text-center">ainda sem histórico suficiente</p>}
        </CartaoGrafico>

        <CartaoGrafico titulo="Automações por categoria" sub={`${r?.total ?? 0} no relógio da VPS`}>
          <GraficoPizza fatias={porCategoria} />
        </CartaoGrafico>

        <CartaoGrafico titulo="Quanto do que roda gasta IA"
          sub="todas foram construídas com IA — poucas precisam dela pra rodar">
          <GraficoPizza fatias={r ? [
            { rotulo: "Roda sem IA", valor: r.sem_ia },
            { rotulo: "Consome IA", valor: r.com_ia },
          ] : []} />
        </CartaoGrafico>

        <CartaoGrafico titulo="A IA aprendendo o meu gosto 📈"
          sub="% do que a IA propõe que eu aprovo, semana a semana"
          >
          <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
        </CartaoGrafico>

        <div className="space-y-4">
          <SecaoIAConstroi />
          <EquipeGrid />
        </div>
      </div>
    </div>
  );

}

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
  if (dias.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">O diário começa a se preencher com os snapshots diários.</p>;
  }
  const fmtData = (iso: string) =>
    new Date(iso + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="space-y-4">
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

// 25/07/2026: a aba "Saúde do sistema" saiu daqui e virou a seção 🩺 Saúde.
// Métricas voltou a ser só métrica.
