"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { getFlowDocs } from "@/lib/storage";
import type { FlowDoc } from "@/lib/types";
import dynamic from "next/dynamic";
import { interpretaCron, formataProxima, type CronInfo } from "@/lib/cron";

// O desenho aparece só quando você abre o detalhe de um card — então o editor
// (~75 KB) não precisa vir junto com a lista (F7, 25/07/2026).
const FlowCanvas = dynamic(() => import("./flow/FlowCanvas"), {
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      desenhando…
    </div>
  ),
  ssr: false,
});

// =============================================================
// ⚡ Automações — a tela única do maquinário que roda sozinho.
//
// 24/07/2026: nasceu da junção de duas telas que mostravam metades da mesma
// coisa e não conversavam:
//   · Biblioteca › Automações — lia o crontab AO VIVO (sabia QUANDO roda,
//     mas não explicava nada)
//   · Produção › Fluxos/Automação — o desenho feito à mão (explicava COMO
//     funciona, mas não sabia se ainda estava no ar)
// O buraco entre as duas escondeu por 5 dias uma automação morta (a babá do
// SOUT-MIRA). Aqui as duas metades viram um card só.
//
// O eixo que organiza não é mais "cron x desenho", é O QUE DISPARA:
// no relógio / quando você pede / quando algo acontece.
// =============================================================

type Gatilho = "relogio" | "pedido" | "evento";

const GATILHOS: { key: Gatilho; icone: string; titulo: string; explica: string }[] = [
  { key: "relogio", icone: "⏰", titulo: "No relógio", explica: "dispara sozinho em horário fixo (crontab da VPS)" },
  { key: "pedido", icone: "👋", titulo: "Quando você pede", explica: "você aciona e ele roda — squads e rotinas manuais" },
  { key: "evento", icone: "🔔", titulo: "Quando algo acontece", explica: "reage a um gatilho (mensagem, falha, link novo)" },
];

// Saúde derivada do último sinal de vida vs. a frequência esperada.
// Regra: até 2,5 ciclos de atraso é normal (job demorado, relógio folgado).
type Saude = "ok" | "atrasada" | "muda" | "desconhecida";

function avaliaSaude(ultima: string | null | undefined, frequenciaMin: number): Saude {
  if (!ultima) return "desconhecida";
  const idadeMin = (Date.now() - new Date(ultima).getTime()) / 60000;
  if (idadeMin <= frequenciaMin * 2.5) return "ok";
  if (idadeMin <= frequenciaMin * 10) return "atrasada";
  return "muda";
}

const SELO: Record<Saude, { bolinha: string; texto: string; cor: string }> = {
  ok: { bolinha: "🟢", texto: "no ar", cor: "text-emerald-600 dark:text-emerald-400" },
  atrasada: { bolinha: "🟡", texto: "atrasada", cor: "text-amber-600 dark:text-amber-400" },
  muda: { bolinha: "🔴", texto: "sem sinal há muito tempo", cor: "text-red-600 dark:text-red-400" },
  desconhecida: { bolinha: "⚪", texto: "não dá pra saber", cor: "text-[var(--text-muted)]" },
};

function tempoDesde(iso: string | null | undefined): string {
  if (!iso) return "não sei dizer";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

// Item unificado: o que roda (cron) + como funciona (fluxo). Um dos dois pode
// faltar — e é justamente isso que a tela precisa deixar visível.
interface ItemUnificado {
  chave: string;
  nome: string;
  descricao: string;
  gatilho: Gatilho;
  categoria: string;
  cron: AutomacaoApiItem | null;
  cronInfo: CronInfo | null;
  fluxo: FlowDoc | null;
  saude: Saude;
}

function normaliza(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function AutomacoesPage() {
  const router = useRouter();
  const [crons, setCrons] = useState<AutomacaoApiItem[]>([]);
  const [fluxos, setFluxos] = useState<FlowDoc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<ItemUnificado | null>(null);
  const [busca, setBusca] = useState("");
  const [legenda, setLegenda] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([fetchCatalogo(), getFlowDocs().catch(() => [] as FlowDoc[])]).then(
      ([cat, fs]) => {
        if (!vivo) return;
        setCrons(cat?.automacoes || []);
        setFluxos(fs);
        setCarregando(false);
      },
    );
    return () => { vivo = false; };
  }, []);

  const itens = useMemo<ItemUnificado[]>(() => {
    const usados = new Set<string>();
    const lista: ItemUnificado[] = [];

    // 1) Tudo que o crontab diz que roda — a verdade da máquina vem primeiro.
    for (const c of crons) {
      const info = interpretaCron(c.agenda);
      const fluxo = c.flow
        ? fluxos.find((f) => normaliza(f.title) === normaliza(c.flow!)) || null
        : null;
      if (fluxo) usados.add(fluxo.id);
      lista.push({
        chave: `cron:${c.nome}:${c.agenda}`,
        nome: c.nome,
        descricao: c.descricao || "",
        gatilho: "relogio",
        categoria: c.categoria || "🩺 Sistema & Saúde",
        cron: c,
        cronInfo: info,
        fluxo,
        saude: avaliaSaude(c.ultima_execucao, info.frequenciaMin),
      });
    }

    // 2) Desenhos que sobraram: existem, mas ninguém agenda. São as que você
    // aciona (squads) ou que reagem a um evento.
    for (const f of fluxos) {
      if (usados.has(f.id)) continue;
      const gatilho: Gatilho = f.category === "squad" || f.category === "manual" ? "pedido" : "evento";
      lista.push({
        chave: `flow:${f.id}`,
        nome: f.title,
        descricao: f.description || "",
        gatilho,
        categoria: f.category === "squad" ? "🤖 Squads" : "🔔 Reage a evento",
        cron: null,
        cronInfo: null,
        fluxo: f,
        saude: "desconhecida",
      });
    }
    return lista;
  }, [crons, fluxos]);

  const filtrados = useMemo(() => {
    const q = normaliza(busca);
    if (!q) return itens;
    return itens.filter((i) =>
      normaliza(`${i.nome} ${i.descricao} ${i.categoria} ${i.cron?.comando || ""}`).includes(q),
    );
  }, [itens, busca]);

  const problemas = itens.filter((i) => i.saude === "atrasada" || i.saude === "muda").length;
  const semDesenho = itens.filter((i) => !i.fluxo).length;

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* clipboard bloqueado */ }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Cabeçalho: o resumo honesto do maquinário */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              ⚡ Automações
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Tudo que a fábrica faz — o que roda sozinho, o que você aciona e o que reage a um evento.
            </p>
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar automação…"
            className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] w-full sm:w-64"
          />
        </div>

        {!carregando && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
              {itens.length} automações
            </span>
            <span className={`px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] ${problemas ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-secondary)]"}`}>
              {problemas ? `${problemas} pedindo atenção` : "nenhuma atrasada"}
            </span>
            {semDesenho > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                {semDesenho} sem desenho
              </span>
            )}
            <button
              onClick={() => setLegenda(!legenda)}
              className="px-3 py-1.5 rounded-full underline decoration-dotted text-[var(--text-secondary)] cursor-pointer"
            >
              como ler esta tela
            </button>
          </div>
        )}

        {legenda && (
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] text-sm space-y-2">
            <p className="text-[var(--text-primary)]">
              Cada card responde quatro perguntas: <strong>o que faz</strong>,{" "}
              <strong>quando dispara</strong>, <strong>se está viva</strong> e{" "}
              <strong>como funciona por dentro</strong> (o desenho).
            </p>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1">
              <li>🟢 <strong>no ar</strong> — rodou dentro do prazo esperado</li>
              <li>🟡 <strong>atrasada</strong> — devia ter rodado e não rodou</li>
              <li>🔴 <strong>sem sinal</strong> — parada há muito tempo, vale investigar</li>
              <li>⚪ <strong>não dá pra saber</strong> — essa automação não deixa log; prefiro dizer isso a inventar</li>
            </ul>
            <p className="text-xs text-[var(--text-muted)]">
              O sinal de vida vem da data do arquivo de log. Quando dois agendamentos
              escrevem no mesmo log, o card avisa que o sinal é indireto. Horários sempre
              em Brasília (o crontab da VPS roda em UTC).
            </p>
          </div>
        )}

        {carregando ? (
          <p className="text-sm text-[var(--text-muted)]">carregando…</p>
        ) : (
          GATILHOS.map((g) => {
            const doGrupo = filtrados.filter((i) => i.gatilho === g.key);
            if (!doGrupo.length) return null;
            // No relógio: da que roda mais vezes pra mais rara.
            doGrupo.sort((a, b) =>
              (a.cronInfo?.frequenciaMin ?? Number.MAX_SAFE_INTEGER) -
              (b.cronInfo?.frequenciaMin ?? Number.MAX_SAFE_INTEGER),
            );
            return (
              <section key={g.key}>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
                  {g.icone} {g.titulo}{" "}
                  <span className="text-[var(--text-muted)] font-normal">({doGrupo.length})</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mb-2">{g.explica}</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {doGrupo.map((i) => (
                    <button
                      key={i.chave}
                      onClick={() => setAberto(i)}
                      className="text-left bg-[var(--bg-secondary)] rounded-xl px-4 py-3 border border-[var(--border)] hover:border-[var(--accent,#2D6B6B)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-sm text-[var(--text-primary)]">{i.nome}</p>
                        <span className={`shrink-0 text-[11px] whitespace-nowrap ${SELO[i.saude].cor}`}>
                          {SELO[i.saude].bolinha} {SELO[i.saude].texto}
                        </span>
                      </div>
                      {i.descricao && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{i.descricao}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[var(--text-muted)]">
                        {i.cronInfo ? (
                          <>
                            <span>⏰ {i.cronInfo.descricao}</span>
                            <span>▸ última: {tempoDesde(i.cron?.ultima_execucao)}</span>
                          </>
                        ) : (
                          <span>{i.gatilho === "pedido" ? "👋 sob demanda" : "🔔 por evento"}</span>
                        )}
                        <span className={i.fluxo ? "text-[var(--accent,#2D6B6B)]" : "text-[var(--text-muted)]"}>
                          {i.fluxo ? "🗺️ tem desenho" : "sem desenho"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {!carregando && filtrados.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Nada encontrado pra “{busca}”.</p>
        )}
      </div>

      {aberto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setAberto(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] max-w-4xl w-full max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-primary)] z-10">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">{aberto.nome}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {aberto.categoria} · <span className={SELO[aberto.saude].cor}>
                    {SELO[aberto.saude].bolinha} {SELO[aberto.saude].texto}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setAberto(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none shrink-0 cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {aberto.descricao && (
                <p className="text-sm text-[var(--text-primary)]">{aberto.descricao}</p>
              )}

              {aberto.cronInfo && aberto.cron && (
                <>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Quando roda</p>
                      <p className="text-sm text-[var(--text-primary)]">{aberto.cronInfo.descricao}</p>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        {aberto.cron.agenda} (UTC)
                      </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Próxima</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {formataProxima(aberto.cronInfo.proxima)}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Última execução</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {tempoDesde(aberto.cron.ultima_execucao)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {!aberto.cron.log
                          ? "essa automação não deixa log"
                          : aberto.cron.log_compartilhado
                            ? "sinal indireto (log compartilhado)"
                            : aberto.cron.log}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                        Comando {aberto.cron.script && <span className="normal-case">· {aberto.cron.script}</span>}
                      </p>
                      <button
                        onClick={() => copiar(aberto.cron!.comando)}
                        className="text-xs px-3 py-1 rounded-full font-medium text-white hover:opacity-90 cursor-pointer"
                        style={{ background: "var(--accent, #2D6B6B)" }}
                      >
                        {copiado ? "copiado!" : "📋 Copiar"}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                      {aberto.cron.comando}
                    </pre>
                  </div>
                </>
              )}

              {/* O desenho aparece aqui mesmo — é o "ver por dentro" do card */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Como funciona por dentro
                </p>
                {aberto.fluxo ? (
                  <>
                    <div className="h-[380px] rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)]">
                      <FlowCanvas flow={aberto.fluxo} />
                    </div>
                    <button
                      onClick={() => router.push(`/producao/fluxos?fluxo=${aberto.fluxo!.id}`)}
                      className="mt-2 text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      ✏️ Abrir no editor de fluxos
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                    Essa automação ainda não tem desenho. Peça pro Claude criar — ou desenhe
                    você mesma em Produção › Fluxos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
