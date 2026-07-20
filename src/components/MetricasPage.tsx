"use client";

// Página de Métricas v5 (12/07/2026) — menu superior com 3 visões:
//   Painel Geral (default, resumo tipo palestra) · Produtividade IA · Saúde do sistema
// Fonte: metrics-history.json publicado toda noite pelo metrics-snapshot.py.

import { useState, useEffect } from "react";
import { GraficoLinha, GraficoBarras } from "./charts";
import {
  useMetricsHistory, semanasOrdenadas, tempoRelativo,
} from "@/lib/metrics";
import { AUTOMACOES, SEM_IA } from "@/lib/automacoes";
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

type Aba = "geral" | "producao" | "saude" | "diario";
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
        {botaoAba("saude", "❤️ Saúde do sistema")}
        {botaoAba("diario", "📖 Diário de bordo")}
      </div>

      {/* Filtro de área — só afeta Painel Geral e Produtividade IA */}
      {(aba === "geral" || aba === "producao") && (
        <div className="px-3 md:px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <ChipsArea area={area} setArea={setArea} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
          <p className="text-xs text-[var(--text-secondary)] text-right">
            snapshot diário · atualizado {tempoRelativo(data.updated_at)}
          </p>

          {aba === "geral" && <AbaGeral data={data} hoje={hoje} taxaSemanal={taxaSemanal} area={area} />}
          {aba === "producao" && <AbaProducao data={data} hoje={hoje} taxaSemanal={taxaSemanal} area={area} />}
          {aba === "saude" && <AbaSaude hoje={hoje} />}
          {aba === "diario" && <AbaDiario data={data} />}
        </div>
      </div>
    </div>
  );
}

function SecaoIAConstroi() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[#E5DED4] text-center">
      <p className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">
        🧮 Das <span style={{ color: "#2D6B6B" }}>{AUTOMACOES.length} automações</span> no ar,{" "}
        <span style={{ color: "#A0583C" }}>{SEM_IA} rodam sem gastar 1 token de IA</span>
      </p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">
        Todas foram <strong>construídas</strong> com IA — mas a maioria <strong>roda</strong> só com Python, de graça, pra sempre.
      </p>
      <button onClick={() => setAberto(!aberto)} className="text-xs underline decoration-dotted mt-2 text-[var(--text-secondary)]">
        {aberto ? "esconder a lista" : "ver quem é quem"}
      </button>
      {aberto && (
        <div className="grid md:grid-cols-2 gap-1.5 mt-3 text-left">
          {AUTOMACOES.map((a) => (
            <div key={a.nome} className="flex items-start gap-2 text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--bg-primary)" }}>
              <span>{a.icone}</span>
              <span className="text-[var(--text-primary)]">
                {a.nome}
                <span className="block text-xs text-[var(--text-secondary)]">
                  {a.usaIA ? `🤖 usa IA: ${a.custo}` : `🐍 sem IA na execução (${a.custo})`}
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
function AbaGeral({ data, hoje, taxaSemanal, area }: {
  data: any; hoje: any; taxaSemanal: { label: string; valor: number }[]; area: Area;
}) {
  const mostraConteudo = area !== "servidora";

  // Tiles honestos: só mostra número onde a métrica existe pra área escolhida.
  const tiles: [string | number, string][] = [[EQUIPE.length, "agentes na equipe"]];
  if (mostraConteudo) {
    tiles.push([hoje.fila?.cards_gerados_total ?? "—", "notícias e dicas curadas"]);
    tiles.push([hoje.enviados_total ?? "—", "posts publicados"]);
  }
  if (area === "conteudo") {
    tiles.push([`${Math.round(hoje.horas_conteudo ?? hoje.horas_economizadas ?? 0)}h`, "economizadas em conteúdo"]);
  } else if (area === "servidora") {
    tiles.push(hoje.horas_trabalho != null
      ? [`${Math.round(hoje.horas_trabalho)}h`, "economizadas no serviço público"]
      : ["—", "economizadas no serviço público (medição chega com o hub IGAM)"]);
  } else {
    tiles.push([`${Math.round(hoje.horas_conteudo ?? hoje.horas_economizadas ?? 0)}h`, "economizadas em conteúdo"]);
    tiles.push(hoje.horas_trabalho != null
      ? [`${Math.round(hoje.horas_trabalho)}h`, "economizadas no serviço público"]
      : ["—", "economizadas no serviço público (medição chega com o hub IGAM)"]);
  }

  return (
    <div className="space-y-6">
      <section className="text-center py-4">
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "#A0583C" }}>Minha fábrica com IA</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-6">
          {tiles.map(([v, r]) => (
            <div key={String(r)}>
              <div className="text-4xl md:text-5xl font-bold" style={{ color: "#2D6B6B" }}>{v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">{r}</div>
            </div>
          ))}
        </div>
      </section>

      {/* A tese dela: IA constrói, Python roda (12/07) — vale pras duas áreas */}
      <SecaoIAConstroi />

      {mostraConteudo ? (
        <CartaoGrafico titulo="A IA aprendendo o meu gosto 📈"
          sub="% das pautas propostas pela IA que eu aprovo, semana a semana">
          <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
        </CartaoGrafico>
      ) : (
        <CartaoGrafico titulo="Aprovação de pautas 📈"
          sub="medição chega com o hub IGAM">
          <p className="text-sm text-[var(--text-secondary)] py-6 text-center">—</p>
        </CartaoGrafico>
      )}

      <EquipeGrid />

      <div className="flex justify-center text-sm">
        <a href="/metricas/palestra" target="_blank"
          className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: "#2D6B6B" }}>
          🎤 Modo palco (tela cheia)
        </a>
      </div>
    </div>
  );
}

function AbaProducao({ data, hoje, taxaSemanal, area }: {
  data: any; hoje: any; taxaSemanal: { label: string; valor: number; detalhe?: string }[]; area: Area;
}) {
  const mostraConteudo = area !== "servidora";
  const enviosSemana = semanasOrdenadas(data.envios_semanas).map((s) => ({
    label: s.label, valor: s.valor as number,
  }));
  const porAgente = Object.entries((hoje.atividades_por_agente ?? {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1]);
  const icones: Record<string, string> = Object.fromEntries(EQUIPE.map(([i, n]) => [n, i]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {mostraConteudo ? (
          <Tile icone="📤" titulo="Posts no grupo IA" valor={hoje.enviados_total ?? "—"}
            sub={`${hoje.fila?.enviados_7d ?? 0} nos últimos 7 dias`} />
        ) : (
          <Tile icone="📤" titulo="Posts no grupo IA" valor="—" sub="métrica de conteúdo" />
        )}
        {area === "servidora" ? (
          <Tile icone="⏱️" titulo="Horas economizadas (serviço público)"
            valor={hoje.horas_trabalho != null ? `${hoje.horas_trabalho}h` : "—"}
            sub="medição chega com o hub IGAM" />
        ) : (
          <Tile icone="⏱️" titulo="Horas economizadas (conteúdo)" valor={`${hoje.horas_conteudo ?? hoje.horas_economizadas ?? 0}h`}
            sub={area === "tudo" && hoje.horas_trabalho != null
              ? `+ ${hoje.horas_trabalho}h no serviço público`
              : area === "tudo" ? "serviço público: medição chega com o hub IGAM" : undefined} />
        )}
        {mostraConteudo ? (
          <Tile icone="💡" titulo="Dicas do banco" valor={`${hoje.dicas?.usadas ?? 0}/${hoje.dicas?.total ?? 0}`}
            sub="já usadas em posts" />
        ) : (
          <Tile icone="💡" titulo="Dicas do banco" valor="—" sub="métrica de conteúdo" />
        )}
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

      {mostraConteudo ? (
        <div className="grid lg:grid-cols-2 gap-3">
          <CartaoGrafico titulo="Aprendizado geral 📈"
            sub="Taxa de aprovação dos cards do Radar por semana de criação">
            <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} />
          </CartaoGrafico>
          <CartaoGrafico titulo="Posts enviados ao grupo por semana"
            sub="Curadoria aprovada por você que chegou na comunidade">
            <GraficoBarras pontos={enviosSemana} />
          </CartaoGrafico>
        </div>
      ) : (
        <CartaoGrafico titulo="Gráficos de conteúdo" sub="medição chega com o hub IGAM">
          <p className="text-sm text-[var(--text-secondary)] py-6 text-center">—</p>
        </CartaoGrafico>
      )}

      {/* Evolução individual por agente (pedido dela 12/07) — só faz sentido em conteúdo */}
      {mostraConteudo && (
        <div className="grid lg:grid-cols-3 gap-3">
          {([
            ["mike", "🔍 Mike — notícias", "aprovação das notícias propostas"],
            ["izzy", "✍️ Izzy — dicas", "aprovação das dicas propostas"],
            ["reels", "🎬 Reels — pautas", "aprovação das pautas de reel"],
          ] as const).map(([chave, titulo, sub]) => {
            const serie = semanasOrdenadas<{ aprovados: number; descartados: number; taxa: number | null }>(
              data.radar_semanas_por_agente?.[chave])
              .filter((s) => s.valor?.taxa !== null && s.valor?.taxa !== undefined)
              .map((s) => ({
                label: s.label,
                valor: Math.round((s.valor.taxa as number) * 100),
                detalhe: `${s.valor.aprovados} aprov. / ${s.valor.descartados} desc.`,
              }));
            return (
              <CartaoGrafico key={chave} titulo={titulo} sub={sub}>
                <GraficoLinha pontos={serie} unidade="%" maxY={100} altura={170} />
              </CartaoGrafico>
            );
          })}
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

// Mesma fonte AO VIVO do semáforo da barra do topo (18/07: a aba mostrava o
// snapshot noturno e dizia "verde" enquanto o semáforo estava vermelho)
const STATUS_VIVO_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/status.json";

function AbaSaude({ hoje }: { hoje: any }) {
  const [vivo, setVivo] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${STATUS_VIVO_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok && alive) setVivo(await r.json());
      } catch { /* mantém o snapshot */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const nivel = vivo?.nivel ?? hoje.saude?.nivel;
  const problemas: string[] = vivo?.problemas ?? hoje.saude?.problemas ?? [];
  const nivelUi = { verde: "🟢 Tudo funcionando", amarelo: "🟡 Atenção", vermelho: "🔴 Algo caiu" }[
    nivel as "verde" | "amarelo" | "vermelho"
  ] ?? `⚪ ${nivel ?? "?"}`;
  const sinais = Object.entries(
    (vivo?.sinais_vitais ?? hoje.saude?.sinais ?? {}) as Record<string, boolean>);

  // Fila e automações: preferir o status ao vivo (5 em 5 min) e cair pro
  // snapshot noturno só se o fetch do vivo falhar
  const fila = vivo?.fila_kanban ?? hoje.fila;
  const automacoes = vivo?.automacoes ?? hoje.automacoes;
  const filaAoVivo = !!vivo?.fila_kanban;
  const automacoesAoVivo = !!vivo?.automacoes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile titulo="Estado geral" valor={nivelUi}
          sub={problemas.length ? problemas.join(" · ") : "nenhum problema aberto"} />
        <Tile icone="⏰" titulo="Rotinas automáticas" valor={`${hoje.saude?.crons_ok ?? "?"}/${hoje.saude?.crons_total ?? "?"}`}
          sub="rodando no horário" />
        <Tile icone="💾" titulo="Disco da VPS" valor={`${vivo?.disco_pct ?? hoje.saude?.disco_pct ?? "?"}%`} sub="usado" />
        <Tile icone="📬" titulo="Fila do grupo IA"
          valor={fila?.pausado ? "⏸ pausada" : `${fila?.aprovados ?? 0} na fila`}
          sub={`${fila?.pendentes ?? 0} aguardando sua avaliação${filaAoVivo ? " · ao vivo (5 em 5 min)" : ""}`} />
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
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">
            Última execução das automações
            {automacoesAoVivo && (
              <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">ao vivo (5 em 5 min)</span>
            )}
          </h3>
          <ul className="space-y-1 text-sm text-[var(--text-primary)]">
            {Object.entries((automacoes ?? {}) as Record<string, string | null>).map(([k, iso]) => (
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
