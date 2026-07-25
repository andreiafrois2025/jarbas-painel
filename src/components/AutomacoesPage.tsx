"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCatalogo, type AutomacaoApiItem } from "@/lib/biblioteca";
import { getFlowDocs, addFlowDoc } from "@/lib/storage";
import type { FlowDoc, FlowCategory } from "@/lib/types";
import { interpretaCron, formataProxima, type CronInfo } from "@/lib/cron";
import { PERCURSOS, ROTULO_TIPO, type Percurso, type PassoPercurso } from "@/lib/percursos";


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

// 25/07 (fim do dia): PERCURSO é a primeira visão e a que abre por padrão, a
// pedido dela — é a que responde "como funciona isso do começo ao fim", que é
// a pergunta que ela mais precisa responder pros outros. As outras quatro
// agrupam a mesma lista; percurso é a única que ENCADEIA.
type Visao = "percurso" | "categoria" | "tipo" | "custo" | "gatilho";

// 25/07/2026 — TRÊS EIXOS, não um só. Antes eu tinha misturado tudo em
// "categoria": "🤖 Squads" e "🔔 Reage a evento" apareciam ali como se fossem
// assunto, mas Squad é QUEM EXECUTA e Reage a evento é QUANDO DISPARA. A
// Andréia pegou: "existe o squad de criar carrossel que é criação de conteúdo".
//
//   CATEGORIA  = sobre o que é           (Conteúdo, Vídeo, Escola, Trabalho…)
//   TIPO       = quem faz o trabalho     (squad, você, o sistema)
//   GATILHO    = o que dispara           (relógio, você pede, um evento)
//
// A squad do carrossel agora é: categoria Conteúdo · tipo Squad · gatilho Você pede.
type Tipo = "squad" | "manual" | "automatico";

const TIPOS: Record<Tipo, { icone: string; rotulo: string; explica: string }> = {
  squad: { icone: "🤖", rotulo: "Squad", explica: "um time de agentes trabalhando em etapas" },
  manual: { icone: "✋", rotulo: "Você faz", explica: "rotina sua, desenhada pra não se perder" },
  automatico: { icone: "⚙️", rotulo: "O sistema faz", explica: "roda sozinho, sem ninguém tocar" },
};

// Categoria dos fluxos que não têm horário no relógio (os que têm vêm com a
// categoria pronta da squad-api). Casado pelo título, sem acento e sem caixa.
// 25/07 (tarde): "⚖️ Licitação" virou "🏛️ Trabalho técnico". Licitação era um
// fluxo só e não ia crescer; o guarda-chuva certo é o ofício técnico dela como
// servidora — licitação, geoprocessamento, gestão da informação. Fora de
// propósito: "IGAM" não serve como nome, porque coisa do Igam também aparece em
// Agenda & Rotina; e gestão de pessoas, quando vier, merece categoria própria.
const CATEGORIA_POR_FLUXO: Record<string, string> = {
  "briefing matinal telegram (donna)": "🗓️ Agenda & Rotina",
  "briefing matinal whatsapp (donna)": "🗓️ Agenda & Rotina",
  "alerta de compromisso proximo (donna)": "🗓️ Agenda & Rotina",
  "resumo diario de pendentes ia (12h utc)": "🗓️ Agenda & Rotina",
  "noticias uau (fluxo prioritario)": "📰 Conteúdo & Notícias",
  "donna captura ideias de conteudo (whatsapp)": "📰 Conteúdo & Notícias",
  "donna guarda filme, livro e compra": "🗓️ Agenda & Rotina",
  "minha semana de conteudo (rotina)": "📰 Conteúdo & Notícias",
  "squad: instagram carrossel": "📰 Conteúdo & Notícias",
  "reels-studio: edicao automatica (\"meu capcut\")": "🎬 Vídeo & Reels",
  "financas whatsapp → louis → notion": "💰 Finanças",
  "squad: licitacao igam": "🏛️ Trabalho técnico",
  "squad: criar agente": "🧰 Agentes & Ferramentas",
};
const CATEGORIA_PADRAO = "🩺 Sistema & Saúde";

// Custo de execução dos fluxos que não têm horário no relógio (os que têm vêm
// com o custo pronto da squad-api). A tese dela: "uso IA pra CONSTRUIR
// automações que depois rodam SEM IA" — então o que importa aqui é se a
// automação gasta token TODA VEZ QUE RODA, não se foi feita com IA.
const CUSTO_POR_FLUXO: Record<string, { usaIA: boolean; custo: string }> = {
  "briefing matinal telegram (donna)": { usaIA: false, custo: "zero — template fixo com agenda e tarefas" },
  "briefing matinal whatsapp (donna)": { usaIA: false, custo: "zero — template fixo" },
  "alerta de compromisso proximo (donna)": { usaIA: false, custo: "zero — lê o calendário" },
  "resumo diario de pendentes ia (12h utc)": { usaIA: false, custo: "zero — conta cards" },
  "noticias uau (fluxo prioritario)": { usaIA: true, custo: "escrita via Claude (assinatura)" },
  "donna captura ideias de conteudo (whatsapp)": { usaIA: true, custo: "Gemini, centavos por captura" },
  "donna guarda filme, livro e compra": { usaIA: true, custo: "Gemini pra ler o print; o resto é Python" },
  "minha semana de conteudo (rotina)": { usaIA: false, custo: "zero — é a sua rotina, não um programa" },
  "squad: instagram carrossel": { usaIA: true, custo: "assinatura Claude, sob demanda" },
  "squad: licitacao igam": { usaIA: true, custo: "assinatura Claude, sob demanda" },
  "squad: criar agente": { usaIA: true, custo: "assinatura Claude, sob demanda" },
  "reels-studio: edicao automatica (\"meu capcut\")": { usaIA: false, custo: "zero — ffmpeg + Whisper na própria VPS" },
  "financas whatsapp → louis → notion": { usaIA: true, custo: "Gemini por registro" },
};

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
  tipo: Tipo;
  usaIA: boolean;
  custo: string;
  cron: AutomacaoApiItem | null;
  cronInfo: CronInfo | null;
  fluxo: FlowDoc | null;
  saude: Saude;
  /** O relógio mudou depois da última vez que o desenho foi mexido. Não prova
   *  que o desenho está errado — só que pode ter ficado pra trás. */
  desenhoAtrasado: boolean;
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
  // 25/07/2026 (F3.1): duas formas de olhar a mesma lista. Por CATEGORIA é o
  // padrão porque é como a Andréia procura ("como tá o fluxo de reels?"); por
  // GATILHO serve pra saber o que está no ar. A escolha fica na URL, então
  // sobrevive ao F5 e pode ser guardada nos favoritos.
  const [visao, setVisao] = useState<Visao>("percurso");
  const [relogioMudouEm, setRelogioMudouEm] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([fetchCatalogo(), getFlowDocs().catch(() => [] as FlowDoc[])]).then(
      ([cat, fs]) => {
        if (!vivo) return;
        setCrons(cat?.automacoes || []);
        setRelogioMudouEm(cat?.crontab_modificado_em ?? null);
        setFluxos(fs);
        setCarregando(false);
      },
    );
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("visao");
    if (["percurso","gatilho","categoria","tipo","custo"].includes(v || "")) setVisao(v as Visao);
  }, []);

  // 25/07/2026 — o "Voltar" do navegador precisa fechar a janela do card.
  //
  // Ela relatou: clicou no foguete, clicou num card, "abriu o fluxo", apertou
  // Voltar e caiu no painel de Saúde. O navegador estava certo: abrir o card é
  // uma janela por cima da MESMA página, não uma navegação — então Voltar saía
  // de Automações e ia pra tela anterior, que por acaso era a Saúde.
  //
  // Mas abrir o fluxo PARECE navegação, e no celular o Voltar é o gesto natural
  // de fechar. Então a janela passa a marcar presença no histórico: abrir
  // empilha uma entrada, Voltar desfaz essa entrada e fecha a janela. Só depois
  // disso o Voltar sai da página, como antes.
  const marcouHistorico = useRef(false);

  // 25/07 (tarde): clicar num card agora NAVEGA pra página do fluxo, que passou
  // a mostrar tudo que a janelinha mostrava — e em tela cheia, com o desenho já
  // editável. Ela pediu isso depois de gravar a tela no celular pra conseguir
  // ler a janela que passava rápido demais.
  //
  // A janela só sobrevive como plano B: pras poucas automações que ainda não
  // têm fluxo desenhado, e que portanto não têm página pra onde ir.
  const abrirCard = (i: ItemUnificado) => {
    if (i.fluxo) {
      router.push(`/producao/fluxos?fluxo=${i.fluxo.id}`);
      return;
    }
    setAberto(i);
    window.history.pushState({ janelaJarbas: true }, "");
    marcouHistorico.current = true;
  };

  const fecharCard = () => {
    setAberto(null);
    setCriando(false);
    if (marcouHistorico.current) {
      marcouHistorico.current = false;
      window.history.back(); // devolve a entrada que a janela tinha empilhado
    }
  };

  useEffect(() => {
    const aoVoltar = () => {
      // Voltou com a janela aberta: fecha a janela e fica na página.
      marcouHistorico.current = false;
      setAberto(null);
      setCriando(false);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [router]);

  // Um passo de percurso aponta pro nome da automação ou pro título do fluxo.
  // Aqui isso vira navegação de verdade — ou aviso, se a peça não existir mais.
  const abrirPorNome = (passo: PassoPercurso) => {
    if (passo.fluxo) {
      const f = fluxos.find((x) => normaliza(x.title) === normaliza(passo.fluxo!));
      if (f) { router.push(`/producao/fluxos?fluxo=${f.id}`); return; }
    }
    if (passo.automacao) {
      const alvo = itens.find((i) => normaliza(i.nome) === normaliza(passo.automacao!));
      if (alvo?.fluxo) { router.push(`/producao/fluxos?fluxo=${alvo.fluxo.id}`); return; }
      if (alvo) { setAberto(alvo); return; }
    }
  };

  const trocaVisao = (v: Visao) => {
    setVisao(v);
    const params = new URLSearchParams(window.location.search);
    params.set("visao", v);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  };

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
        tipo: "automatico",
        usaIA: !!c.usa_ia,
        custo: c.custo_execucao || (c.usa_ia ? "consome IA" : "zero"),
        categoria: c.categoria || CATEGORIA_PADRAO,
        cron: c,
        cronInfo: info,
        fluxo,
        saude: avaliaSaude(c.ultima_execucao, info.frequenciaMin),
        desenhoAtrasado: !!(fluxo && relogioMudouEm && fluxo.updated_at &&
          new Date(relogioMudouEm) > new Date(fluxo.updated_at)),
      });
    }

    // 2) Desenhos que sobraram: existem, mas ninguém agenda. São as que você
    // aciona (squads) ou que reagem a um evento.
    for (const f of fluxos) {
      if (usados.has(f.id)) continue;
      const gatilho: Gatilho = f.category === "squad" || f.category === "manual" ? "pedido" : "evento";
      const tipo: Tipo = f.category === "squad" ? "squad" : f.category === "manual" ? "manual" : "automatico";
      // Fluxo criado por ela guarda a categoria como "[📰 Conteúdo] descrição".
      const marcada = (f.description || "").match(/^\[([^\]]+)\]\s*/);
      lista.push({
        chave: `flow:${f.id}`,
        nome: f.title,
        descricao: (f.description || "").replace(/^\[[^\]]+\]\s*/, ""),
        gatilho,
        tipo,
        usaIA: CUSTO_POR_FLUXO[normaliza(f.title)]?.usaIA ?? false,
        custo: CUSTO_POR_FLUXO[normaliza(f.title)]?.custo ?? "não sei dizer",
        categoria: marcada?.[1] || CATEGORIA_POR_FLUXO[normaliza(f.title)] || CATEGORIA_PADRAO,
        cron: null,
        cronInfo: null,
        fluxo: f,
        saude: "desconhecida",
        desenhoAtrasado: false,
      });
    }
    return lista;
  }, [crons, fluxos, relogioMudouEm]);

  const filtrados = useMemo(() => {
    const q = normaliza(busca);
    if (!q) return itens;
    return itens.filter((i) =>
      normaliza(`${i.nome} ${i.descricao} ${i.categoria} ${i.cron?.comando || ""}`).includes(q),
    );
  }, [itens, busca]);

  const problemas = itens.filter((i) => i.saude === "atrasada" || i.saude === "muda").length;
  const semDesenho = itens.filter((i) => !i.fluxo).length;

  // Agrupamento que serve às duas visões. Por categoria: os mesmos rótulos que
  // a squad-api já usa (Conteúdo & Notícias, Vídeo & Reels, Sistema & Saúde…).
  // Por gatilho: o que dispara cada uma.
  const grupos = useMemo(() => {
    if (visao === "gatilho") {
      return GATILHOS.map((g) => ({
        chave: g.key,
        titulo: `${g.icone} ${g.titulo}`,
        explica: g.explica,
        itens: filtrados
          .filter((i) => i.gatilho === g.key)
          .sort((a, b) =>
            (a.cronInfo?.frequenciaMin ?? Number.MAX_SAFE_INTEGER) -
            (b.cronInfo?.frequenciaMin ?? Number.MAX_SAFE_INTEGER)),
      })).filter((g) => g.itens.length);
    }
    if (visao === "custo") {
      const grupos = [
        { chave: "sem", titulo: "🐍 Roda sem gastar IA", explica: "custo zero por execução — foi construída com IA, mas roda com Python", filtro: (i: ItemUnificado) => !i.usaIA },
        { chave: "com", titulo: "🤖 Consome IA quando roda", explica: "gasta token ou crédito a cada execução", filtro: (i: ItemUnificado) => i.usaIA },
      ];
      return grupos.map((g) => ({
        chave: g.chave, titulo: g.titulo, explica: g.explica,
        itens: filtrados.filter(g.filtro).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      })).filter((g) => g.itens.length);
    }
    if (visao === "tipo") {
      return (Object.keys(TIPOS) as Tipo[]).map((t) => ({
        chave: t,
        titulo: `${TIPOS[t].icone} ${TIPOS[t].rotulo}`,
        explica: TIPOS[t].explica,
        itens: filtrados.filter((i) => i.tipo === t)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      })).filter((g) => g.itens.length);
    }
    const m = new Map<string, ItemUnificado[]>();
    for (const i of filtrados) m.set(i.categoria, [...(m.get(i.categoria) || []), i]);
    return [...m.keys()].sort().map((cat) => ({
      chave: cat,
      titulo: cat,
      explica: "",
      itens: m.get(cat)!.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }));
  }, [filtrados, visao]);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* clipboard bloqueado */ }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-5">
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
              {([["percurso", "percursos"], ["categoria", "por categoria"], ["tipo", "por tipo"], ["custo", "por custo"], ["gatilho", "por gatilho"]] as const).map(([v, r]) => (
                <button
                  key={v}
                  onClick={() => trocaVisao(v)}
                  className={`px-3 py-2 font-medium cursor-pointer transition-colors ${
                    visao === v
                      ? "text-white"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  style={visao === v ? { background: "var(--accent, #2D6B6B)" } : undefined}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="buscar automação…"
              className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] w-full sm:w-56"
            />
            <button
              onClick={() => {
                setCriando(true);
                window.history.pushState({ janelaJarbas: true }, "");
                marcouHistorico.current = true;
              }}
              className="text-sm px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 cursor-pointer whitespace-nowrap"
              style={{ background: "var(--accent, #2D6B6B)" }}
            >
              ＋ Novo fluxo
            </button>
          </div>
        </div>

        {!carregando && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
              {itens.filter((i) => i.gatilho === "relogio").length} no relógio ·{" "}
              {itens.filter((i) => i.gatilho === "pedido").length} sob demanda ·{" "}
              {itens.filter((i) => i.gatilho === "evento").length} por evento
            </span>
            <span className={`px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] ${problemas ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-secondary)]"}`}>
              {problemas ? `${problemas} pedindo atenção` : "nenhuma atrasada"}
            </span>
            {semDesenho > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                {semDesenho} sem fluxo
              </span>
            )}
            {itens.some((i) => i.desenhoAtrasado) && (
              <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-amber-600 dark:text-amber-400">
                {itens.filter((i) => i.desenhoAtrasado).length} com fluxo possivelmente atrasado
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
              🐍 {itens.filter((i) => !i.usaIA).length} rodam sem gastar IA
            </span>
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
        ) : visao === "percurso" ? (
          <div className="grid gap-4 2xl:grid-cols-2">
            {PERCURSOS.map((p) => (
              <CartaoPercurso key={p.id} percurso={p} itens={itens} onIr={abrirPorNome} />
            ))}
          </div>
        ) : (
          grupos.map(({ chave, titulo, explica, itens: doGrupo }) => (
            <section key={chave}>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
                {titulo}{" "}
                <span className="text-[var(--text-muted)] font-normal">({doGrupo.length})</span>
              </h2>
              {explica && <p className="text-xs text-[var(--text-muted)] mb-2">{explica}</p>}
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
                {doGrupo.map((i) => (
                  <Card key={i.chave} item={i} onAbrir={() => abrirCard(i)} />
                ))}
              </div>
            </section>
          ))
        )}

        {!carregando && filtrados.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Nada encontrado pra “{busca}”.</p>
        )}
      </div>

      {criando && (
        <NovoFluxo
          categorias={[...new Set([...itens.map((i) => i.categoria), CATEGORIA_PADRAO])].sort()}
          onFechar={fecharCard}
          onCriado={(id) => {
            setCriando(false);
            router.push(`/producao/fluxos?fluxo=${id}`);
          }}
        />
      )}

      {aberto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={fecharCard}
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
                onClick={fecharCard}
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
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Custo por execução</p>
                      <p className="text-sm text-[var(--text-primary)]">{aberto.usaIA ? "🤖 usa IA" : "🐍 sem IA"}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{aberto.custo}</p>
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

              {/* Esta janela só abre pra automação SEM fluxo — quem tem fluxo
                  vai direto pra página dele, que mostra tudo isto em tela cheia. */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Como funciona por dentro
                </p>
                <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                  Essa automação ainda não tem fluxo desenhado, então não há o que mostrar aqui.
                  Peça pro Claude desenhar — ou desenhe você mesma pelo botão ＋ Novo fluxo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Card de uma automação. Mesmo card nas duas visões — o que muda é só como a
// lista está agrupada acima dele.
function Card({ item: i, onAbrir }: { item: ItemUnificado; onAbrir: () => void }) {
  return (
    <button
      onClick={onAbrir}
      className="text-left bg-[var(--bg-secondary)] rounded-xl px-4 py-3 border border-[var(--border)] hover:border-[var(--accent,#2D6B6B)] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-sm text-[var(--text-primary)]">{i.nome}</p>
        <span className={`shrink-0 text-[11px] whitespace-nowrap ${SELO[i.saude].cor}`}>
          {SELO[i.saude].bolinha} {SELO[i.saude].texto}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]"
          title={TIPOS[i.tipo].explica}
        >
          {TIPOS[i.tipo].icone} {TIPOS[i.tipo].rotulo}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            i.usaIA
              ? "border-[var(--terra,#A0583C)] text-[#A0583C] dark:text-amber-400"
              : "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
          }`}
          title={i.custo}
        >
          {i.usaIA ? "🤖 usa IA" : "🐍 sem IA"}
        </span>
      </div>
      {i.descricao && <p className="text-xs text-[var(--text-secondary)] mt-1">{i.descricao}</p>}
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
          {i.fluxo ? "🗺️ tem fluxo" : "sem fluxo"}
        </span>
        {i.desenhoAtrasado && (
          <span
            className="text-amber-600 dark:text-amber-400"
            title="O relógio da VPS mudou depois da última vez que este desenho foi mexido"
          >
            ⚠ fluxo pode estar atrasado
          </span>
        )}
      </div>
    </button>
  );
}

// ＋ Novo fluxo — o lugar onde ela cria um fluxo manual. Antes isso só existia
// dentro do kanban, aposentado em 25/07/2026 por ser a tela que ela abria e
// nunca usava. Criar aqui é mais direto: nasce e já abre pra desenhar.
function NovoFluxo({ categorias, onFechar, onCriado }: {
  categorias: string[];
  onFechar: () => void;
  onCriado: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<FlowCategory>("manual");
  // 25/07: faltava escolher a CATEGORIA — o formulário só perguntava o tipo, e
  // ela ficou sem saber onde o fluxo ia parar na lista.
  const [categoria, setCategoria] = useState<string>(categorias[0] || CATEGORIA_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const OPCOES_TIPO: { valor: FlowCategory; rotulo: string; explica: string }[] = [
    { valor: "manual", rotulo: "✋ Você faz", explica: "rotina sua, desenhada pra não se perder" },
    { valor: "automation", rotulo: "⚙️ O sistema faz", explica: "roda sozinho, sem ninguém tocar" },
    { valor: "squad", rotulo: "🤖 Squad", explica: "um time de agentes trabalhando em etapas" },
  ];

  async function salvar() {
    if (!titulo.trim()) { setErro("Dá um nome pro fluxo."); return; }
    setSalvando(true); setErro(null);
    try {
      const f = await addFlowDoc({
        title: titulo.trim(),
        category: tipo,
        // A categoria fica gravada no começo da descrição, que é onde a lista
        // consegue lê-la sem precisar de coluna nova no banco.
        description: `[${categoria}] ${descricao.trim()}`.trim(),
        nodes: [{ id: "1", type: "start", position: { x: 100, y: 100 }, data: { label: "Início", icon: "▶️" } }],
        edges: [],
      });
      onCriado(f.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui criar o fluxo.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onFechar}>
      <div
        className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)]">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Novo fluxo</p>
            <p className="text-xs text-[var(--text-muted)]">Ele nasce vazio e abre pra você desenhar.</p>
          </div>
          <button
            onClick={onFechar}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Nome</span>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") salvar(); }}
              placeholder="ex.: Minha rotina de gravação"
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--text-secondary)]">O que é (opcional)</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="uma linha explicando"
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Categoria</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Quem faz</span>
            <div className="grid gap-1.5 mt-1">
              {OPCOES_TIPO.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setTipo(t.valor)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    tipo === t.valor
                      ? "border-[var(--accent,#2D6B6B)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <span className="font-medium text-[var(--text-primary)]">{t.rotulo}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">{t.explica}</span>
                </button>
              ))}
            </div>
          </div>
          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={salvar}
              disabled={salvando}
              className="text-sm px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: "var(--accent, #2D6B6B)" }}
            >
              {salvando ? "criando…" : "Criar e desenhar"}
            </button>
            <button
              onClick={onFechar}
              className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Um percurso desenhado como texto encadeado — foi a forma que ela pediu:
// "talvez nem precisaria ser desenho, poderia ser escrito passo a passo e em
// cada nó direciona para aquela automação ou desenho do fluxo".
function CartaoPercurso({ percurso, itens, onIr }: {
  percurso: Percurso;
  itens: ItemUnificado[];
  onIr: (p: PassoPercurso) => void;
}) {
  const [regraAberta, setRegraAberta] = useState<number | null>(null);
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Dado ao vivo do passo: horário e sinal de vida vêm da automação real.
  const dadoVivo = (passo: PassoPercurso) => {
    if (!passo.automacao) return null;
    return itens.find((i) => norm(i.nome) === norm(passo.automacao!)) || null;
  };

  const clicavel = (passo: PassoPercurso) => !!(passo.fluxo || passo.automacao);

  return (
    <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {percurso.icone} {percurso.titulo}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] italic mt-0.5">“{percurso.pergunta}”</p>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">{percurso.resumo}</p>
      </header>

      <ol className="relative">
        {percurso.passos.map((passo, i) => {
          const vivo = dadoVivo(passo);
          const meta = ROTULO_TIPO[passo.tipo];
          const ultimo = i === percurso.passos.length - 1;
          return (
            <li key={i} className="relative pl-8 pb-3">
              {/* a linha que liga um passo ao seguinte */}
              {!ultimo && (
                <span className="absolute left-[11px] top-6 bottom-0 w-px bg-[var(--border)]" aria-hidden />
              )}
              <span
                className="absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "var(--bg-primary)", border: `1.5px solid ${meta.cor}`, color: meta.cor }}
              >
                {i + 1}
              </span>

              <div
                className={clicavel(passo) ? "cursor-pointer group" : ""}
                onClick={() => clicavel(passo) && onIr(passo)}
                role={clicavel(passo) ? "button" : undefined}
                tabIndex={clicavel(passo) ? 0 : undefined}
                onKeyDown={(e) => { if (clicavel(passo) && (e.key === "Enter" || e.key === " ")) onIr(passo); }}
              >
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:underline decoration-dotted">
                  {passo.icone} {passo.titulo}
                  {clicavel(passo) && <span className="text-[var(--text-muted)] font-normal"> ↗</span>}
                </p>
                {passo.detalhe && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{passo.detalhe}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px]">
                  <span style={{ color: meta.cor }} className="font-semibold uppercase tracking-wider">
                    {meta.rotulo}
                  </span>
                  {passo.onde && <span className="text-[var(--text-muted)]">{passo.onde}</span>}
                  {vivo?.cronInfo && (
                    <span className="text-[var(--text-muted)]">⏰ {vivo.cronInfo.descricao}</span>
                  )}
                  {vivo && (
                    <span className={SELO[vivo.saude].cor}>
                      {SELO[vivo.saude].bolinha} {SELO[vivo.saude].texto}
                    </span>
                  )}
                  {vivo && (
                    <span className={vivo.usaIA ? "text-[#A0583C] dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
                      {vivo.usaIA ? "🤖 usa IA" : "🐍 sem IA"}
                    </span>
                  )}
                  {/* O passo aponta pra uma automação que não existe mais */}
                  {passo.automacao && !vivo && (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⚠ não achei essa automação no relógio
                    </span>
                  )}
                </div>
              </div>

              {passo.regras && (
                <div className="mt-1.5">
                  <button
                    onClick={() => setRegraAberta(regraAberta === i ? null : i)}
                    className="text-[11px] underline decoration-dotted text-[var(--text-secondary)] cursor-pointer"
                  >
                    {regraAberta === i ? "esconder" : `ver ${passo.regras.length} regras`}
                  </button>
                  {regraAberta === i && (
                    <ol className="mt-1.5 space-y-1 border-l-2 border-[var(--border)] pl-3">
                      {passo.regras.map((r, j) => (
                        <li key={j} className="text-xs text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{j + 1}º</span> {r}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
