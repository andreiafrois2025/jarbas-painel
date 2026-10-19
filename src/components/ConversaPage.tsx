"use client";

import Link from "next/link";

// Tela Conversa (painel v2): saudação + o chat do Jarbas no centro; à direita
// (~360px) o dia dela: Hoje, Esperando você e Notícias.
//
// De onde vem cada bloco (nada é inventado):
//  - saudação / "N coisas esperam você": relógio de Brasília + total do bloco
//    "Esperando você" (tudo junto: squads, finanças e Radar);
//  - Hoje: /api/hoje (squad-api), campo `agenda` (e `agenda_semana` quando o dia
//    está livre) — o mesmo que o HojePanel já lia;
//  - Esperando você: /api/esperando (paradas de squad, finanças, dicas e notícias,
//    já ordenadas por prioridade; vem pelo contexto do painel);
//  - Notícias: UAU = card da caixa com [Prioridade]; radar = /api/hoje ›
//    `para_mim` (feed de notícias de IA), mais recentes primeiro.
// No modo Só Igam o pedido vai com ?modo=servidora e o servidor devolve a
// agenda do Igam e nenhuma notícia; os blocos mostram o estado vazio.

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatPage from "./ChatPage";
import Mascote from "./Mascote";
import { usePainel } from "@/lib/painel-context";
import { useHoje, type DadosHoje, type CardCaixa } from "@/lib/hoje";
import { tempoRelativo } from "@/lib/metrics";
import { type DadosEsperando, type ItemEsperando } from "@/lib/esperando";
import { COLUNAS_CAIXA, ehUau } from "./HojePanel";

const TZ = "America/Sao_Paulo";

function horaBrasilia(): number {
  return Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
}

function saudacao(): string {
  const h = horaBrasilia();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function dataPorExtenso(): string {
  const t = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface ItemAgenda { quando: string; hora: string; titulo: string }

// A agenda chega como texto: "- 20/10/2026 14:00: título" (semana) ou só a hora
// (hoje). Quebra em itens; o que não tiver hora legível vira linha solta.
function lerAgenda(texto?: string, comDia = false): ItemAgenda[] {
  if (!texto) return [];
  const itens: ItemAgenda[] = [];
  for (const bruta of texto.split("\n")) {
    const l = bruta.replace(/^\s*[-•]\s*/, "").trim();
    if (!l || /^sem compromissos/i.test(l)) continue;
    const m = /^(?:(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+)?(\d{1,2}):(\d{2})\s*[:\-–]?\s*(.*)$/.exec(l);
    if (!m) { itens.push({ quando: "", hora: "", titulo: l }); continue; }
    const [, dd, mm, aa, hh, mi, resto] = m;
    let dia = "";
    if (comDia && dd && mm) {
      const d = new Date(Number(aa || new Date().getFullYear()), Number(mm) - 1, Number(dd), 12);
      dia = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") + " " + dd + "/" + mm;
    }
    itens.push({ quando: dia, hora: mi === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mi}`, titulo: resto || l });
  }
  return itens;
}

const semPrefixo = (t: string) => t.replace("[Prioridade] ", "");

function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <h3 className="m-0 mb-2.5 flex justify-between items-baseline text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
      <span>{children}</span>{extra}
    </h3>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[var(--text-secondary)] py-1">{children}</p>;
}

function BlocoHoje({ dados, erro }: { dados: DadosHoje | null; erro: boolean }) {
  const hoje = lerAgenda(dados?.agenda);
  const proximos = hoje.length === 0 ? lerAgenda(dados?.agenda_semana, true).slice(0, 2) : [];
  return (
    <section>
      <Titulo extra={<a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer" className="normal-case tracking-normal font-bold text-[var(--ac)] no-underline">agenda</a>}>Hoje</Titulo>
      {erro ? <Vazio>Não consegui ler a agenda agora.</Vazio>
        : !dados ? <Vazio>carregando…</Vazio>
        : <>
          {hoje.length === 0 && <Vazio>Sem compromissos hoje.</Vazio>}
          {proximos.length > 0 && <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1">Próximos dias</p>}
          {[...hoje, ...proximos].map((a, i) => (
            <div key={i} className="flex gap-2.5 items-baseline py-[7px] border-b border-dashed border-[var(--border)] last:border-0 text-[13.5px]">
              <span className="font-extrabold text-[var(--ac)] w-[52px] shrink-0 tabular-nums">
                {a.hora}
                {a.quando && <span className="block text-[10px] font-semibold text-[var(--text-secondary)] capitalize">{a.quando}</span>}
              </span>
              <span className="min-w-0 break-words line-clamp-2">{a.titulo}</span>
            </div>
          ))}
        </>}
    </section>
  );
}

// Esperando você (19/10/2026): uma lista só, já em ordem de prioridade pela squad-api
// (/api/esperando): 1 licitação/Igam · 2 outras paradas de squad · 3 finanças que
// vencem hoje/amanhã · 4 dicas e textos · 5 notícias. Prioridade alta = borda dourada.
const MOSTRAR_ESPERANDO = 4;

function ItemEsperandoLinha({ it, onIr }: { it: ItemEsperando; onIr: (it: ItemEsperando) => void }) {
  const alta = it.prioridade === "alta";
  const noticia = it.grupo === 5;
  const sub = [it.selo === "UAU" ? "UAU" : "", it.origem, it.detalhe].filter(Boolean).join(" · ");
  return (
    <div
      className={`rounded-[10px] px-2.5 mb-[7px] text-[13px] text-[var(--text-primary)] ${
        alta ? "py-2.5 border-2 border-[var(--af-gold)] bg-[var(--accent-soft)]"
          : noticia ? "py-[7px] bg-transparent border border-dashed border-[var(--border)] opacity-80"
          : "py-[9px] bg-[var(--bg-tertiary)]"}`}>
      <div className="flex gap-2.5 items-center">
        <Mascote nome={it.agente || "jarbas"} emoji="⚡" tamanho={noticia ? 24 : 30} />
        <span className="min-w-0 flex-1">
          {alta && it.selo && <span className="inline-block mb-0.5 rounded-full bg-[var(--af-gold)] text-[#2a1f05] text-[10.5px] font-extrabold px-2 py-px">{it.selo}</span>}
          <span className={`block break-words line-clamp-2 ${alta ? "font-bold" : ""} ${noticia ? "text-[12.5px]" : ""}`}>{it.titulo}</span>
          <small className="block text-[11.5px] text-[var(--text-secondary)]">{sub}</small>
        </span>
      </div>
      {(alta || it.acao.tipo !== "externo") ? (
        <button onClick={() => onIr(it)}
          className={`mt-2 w-full rounded-lg py-1.5 text-xs font-bold cursor-pointer ${alta ? "bg-[var(--af-gold)] text-[#2a1f05] hover:brightness-95" : "border border-[var(--border)] text-[var(--ac)] hover:bg-[var(--bg-secondary)]"}`}>
          {it.acao.rotulo} ›
        </button>
      ) : (
        <button onClick={() => onIr(it)} className="mt-1 text-[11.5px] font-bold text-[var(--ac)] cursor-pointer">{it.acao.rotulo} ↗</button>
      )}
    </div>
  );
}

function BlocoEsperando({ esperando, erro }: { esperando: DadosEsperando | null; erro: boolean }) {
  const router = useRouter();
  const [todos, setTodos] = useState(false);
  const itens = esperando?.itens || [];
  const mostrar = todos ? itens : itens.slice(0, MOSTRAR_ESPERANDO);

  const ir = (it: ItemEsperando) => {
    const a = it.acao;
    if (a.tipo === "licitacao") router.push(`/areas?aba=igam&processo=${encodeURIComponent(a.jobId || "")}`);
    else if (a.tipo === "aprovacao") window.dispatchEvent(new CustomEvent("abrir-aprovacoes", { detail: { jobId: a.jobId } }));
    else if (a.tipo === "financas") router.push("/areas?aba=casa&sub=financas");
    else if (a.url) window.open(a.url, "_blank", "noreferrer");
  };

  return (
    <section>
      <Titulo extra={esperando ? <span className="normal-case tracking-normal font-bold text-[var(--ac)]">{esperando.total}</span> : null}>Esperando você</Titulo>
      {!esperando ? <Vazio>{erro ? "Não consegui ler o que espera você agora." : "carregando…"}</Vazio>
        : itens.length === 0 ? <Vazio>Nada esperando você agora.</Vazio>
        : <>
          {mostrar.map((it) => <ItemEsperandoLinha key={it.id} it={it} onIr={ir} />)}
          {itens.length > MOSTRAR_ESPERANDO && (
            <button onClick={() => setTodos((v) => !v)} className="text-xs font-bold text-[var(--ac)] cursor-pointer">
              {todos ? "mostrar menos ▴" : `+ ${itens.length - MOSTRAR_ESPERANDO} ▾`}
            </button>
          )}
        </>}
    </section>
  );
}

function BlocoNoticias({ dados, caixa, erro }: { dados: DadosHoje | null; caixa: CardCaixa[]; erro: boolean }) {
  const router = useRouter();
  const uau = caixa.find(ehUau);
  const radar = [...(dados?.para_mim || [])]
    .filter((n) => !n.lido)
    .sort((a, b) => (b.quando || "").localeCompare(a.quando || ""))
    .slice(0, uau ? 2 : 3);
  return (
    <section>
      <Titulo extra={<button onClick={() => router.push("/areas?aba=conteudo&sub=noticias")} className="normal-case tracking-normal font-bold text-[var(--ac)] cursor-pointer">ver todas ›</button>}>Notícias</Titulo>
      {erro ? <Vazio>Não consegui ler as notícias agora.</Vazio>
        : !dados ? <Vazio>carregando…</Vazio>
        : !uau && radar.length === 0 ? <Vazio>Sem notícias novas.</Vazio>
        : <>
          {uau && (
            <a href={uau.url} target="_blank" rel="noreferrer"
              className="block rounded-xl px-3 py-[11px] mb-2 text-[13px] no-underline text-[var(--text-primary)] bg-[var(--uau-soft)]">
              <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[var(--uau)]">⚡ UAU</span>
              <span className="block mt-[3px] leading-snug break-words">{semPrefixo(uau.titulo)}</span>
              <small className="text-[var(--text-secondary)] text-[11.5px]">Radar · ler no Notion ↗</small>
            </a>
          )}
          {radar.map((n) => (
            <a key={n.url} href={n.url} target="_blank" rel="noreferrer"
              className="block text-[13px] py-1.5 border-b border-dashed border-[var(--border)] last:border-0 no-underline text-[var(--text-primary)] hover:text-[var(--ac)]">
              <span className="break-words">{n.titulo}</span>
              <small className="block text-[11.5px] text-[var(--text-secondary)]">{n.fonte}{n.quando ? ` · ${tempoRelativo(n.quando)}` : ""}</small>
            </a>
          ))}
        </>}
    </section>
  );
}

export default function ConversaPage() {
  const { servidora, esperando, erroEsperando } = usePainel();
  const { dados, erro } = useHoje(true, servidora ? "servidora" : undefined);
  const caixa = (dados?.caixa || [])
    .filter((c) => COLUNAS_CAIXA.has(c.coluna))
    .sort((a, b) => Number(ehUau(b)) - Number(ehUau(a)));
  const n = esperando?.total ?? 0;
  const espera = !esperando ? "" : n === 0 ? " · nada esperando você" : n === 1 ? " · 1 coisa espera você" : ` · ${n} coisas esperam você`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
      {/* ===== CENTRO: saudação + chat ===== */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0 h-full min-h-[420px] lg:h-auto shrink-0 lg:shrink">
        <ChatPage compacto servidora={servidora} cabecalho={(
          <div className="flex items-center gap-3.5 px-4 md:px-6 2xl:px-10 pt-4 md:pt-[22px] pb-1 shrink-0">
          <Mascote nome="jarbas" emoji="⚡" tamanho={64} className="max-md:!w-10 max-md:!h-10" />
          <div className="min-w-0">
            <h1 className="fonte-maquina m-0 text-[22px] md:text-[28px] leading-tight text-[var(--text-primary)]">{saudacao()}, Andréia</h1>
            <p className="m-0 mt-0.5 text-sm text-[var(--text-secondary)]">{dataPorExtenso()}{espera}</p>
          </div>
          {/* 19/10/2026: atalho para o Escritório (ver a equipe trabalhando; bom para aula) */}
          <Link href="/equipe?aba=escritorio" title="Abrir o escritório: ver a equipe trabalhando"
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-bold text-[var(--text-primary)] no-underline hover:bg-[var(--bg-tertiary)]">
            🏢<span className="max-md:hidden">Escritório</span>
          </Link>
        </div>
        )} />
      </div>

      {/* ===== COLUNA DIREITA: o dia dela ===== */}
      <aside aria-label="O dia" className="lg:w-[300px] 2xl:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--bg-secondary)] px-[18px] py-5 flex flex-col gap-5 lg:overflow-y-auto">
        <BlocoHoje dados={dados} erro={erro} />
        <BlocoEsperando esperando={esperando} erro={erroEsperando} />
        <BlocoNoticias dados={dados} caixa={caixa} erro={erro} />
      </aside>
    </div>
  );
}
