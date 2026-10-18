"use client";

// Tela Conversa (painel v2): saudação + o chat do Jarbas no centro; à direita
// (~360px) o dia dela: Hoje, Esperando você e Notícias.
//
// De onde vem cada bloco (nada é inventado):
//  - saudação / "N coisas esperam você": relógio de Brasília + nº de cards da
//    caixa de aprovação (mesmo dado do bloco "Esperando você");
//  - Hoje: /api/hoje (squad-api), campo `agenda` (e `agenda_semana` quando o dia
//    está livre) — o mesmo que o HojePanel já lia;
//  - Esperando você: /api/hoje › `caixa` (cards do Radar em "Pra avaliar");
//  - Notícias: UAU = card da caixa com [Prioridade]; radar = /api/hoje ›
//    `para_mim` (feed de notícias de IA), mais recentes primeiro.
// No modo Só Igam o pedido vai com ?modo=servidora e o servidor devolve a
// agenda do Igam e nenhuma notícia; os blocos mostram o estado vazio.

import { useRouter } from "next/navigation";
import ChatPage from "./ChatPage";
import Mascote from "./Mascote";
import { usePainel } from "@/lib/painel-context";
import { useHoje, type DadosHoje, type CardCaixa } from "@/lib/hoje";
import { tempoRelativo } from "@/lib/metrics";
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

function BlocoEsperando({ caixa, carregado }: { caixa: CardCaixa[]; carregado: boolean }) {
  const router = useRouter();
  const mostrar = caixa.slice(0, 3);
  return (
    <section>
      <Titulo extra={carregado ? <span className="normal-case tracking-normal font-bold text-[var(--ac)]">{caixa.length}</span> : null}>Esperando você</Titulo>
      {!carregado ? <Vazio>carregando…</Vazio>
        : caixa.length === 0 ? <Vazio>Nada esperando você agora.</Vazio>
        : <>
          {mostrar.map((c) => (
            <a key={c.id} href={c.url} target="_blank" rel="noreferrer"
              className="flex gap-2.5 items-center rounded-[10px] px-2.5 py-[9px] mb-[7px] text-[13px] no-underline text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:brightness-95 transition">
              {/* Quem pediu: a caixa vem do Radar, que é a curadoria do Mike */}
              <Mascote nome="mike" emoji="🔍" tamanho={30} />
              <span className="min-w-0">
                <span className="block break-words line-clamp-2">{semPrefixo(c.titulo)}</span>
                <small className="block text-[11.5px] text-[var(--text-secondary)]">{ehUau(c) ? "UAU · " : ""}Radar · ler e decidir no Notion</small>
              </span>
            </a>
          ))}
          {caixa.length > mostrar.length && (
            <button onClick={() => router.push("/areas?aba=conteudo&sub=noticias")} className="text-xs font-bold text-[var(--ac)] cursor-pointer">+ {caixa.length - mostrar.length} na lista completa ›</button>
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
  const { servidora } = usePainel();
  const { dados, erro } = useHoje(true, servidora ? "servidora" : undefined);
  const caixa = (dados?.caixa || [])
    .filter((c) => COLUNAS_CAIXA.has(c.coluna))
    .sort((a, b) => Number(ehUau(b)) - Number(ehUau(a)));
  const n = caixa.length;
  const espera = !dados ? "" : n === 0 ? " · nada esperando você" : n === 1 ? " · 1 coisa espera você" : ` · ${n} coisas esperam você`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
      {/* ===== CENTRO: saudação + chat ===== */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0 h-[calc(100dvh-10rem)] min-h-[460px] lg:h-auto shrink-0 lg:shrink">
        <ChatPage compacto servidora={servidora} cabecalho={(
          <div className="flex items-center gap-3.5 px-4 md:px-6 2xl:px-10 pt-4 md:pt-[22px] pb-1 shrink-0">
          <Mascote nome="jarbas" emoji="⚡" tamanho={64} className="max-md:!w-10 max-md:!h-10" />
          <div className="min-w-0">
            <h1 className="fonte-maquina m-0 text-[22px] md:text-[28px] leading-tight text-[var(--text-primary)]">{saudacao()}, Andréia</h1>
            <p className="m-0 mt-0.5 text-sm text-[var(--text-secondary)]">{dataPorExtenso()}{espera}</p>
          </div>
        </div>
        )} />
      </div>

      {/* ===== COLUNA DIREITA: o dia dela ===== */}
      <aside aria-label="O dia" className="lg:w-[300px] 2xl:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--bg-secondary)] px-[18px] py-5 flex flex-col gap-5 lg:overflow-y-auto">
        <BlocoHoje dados={dados} erro={erro} />
        <BlocoEsperando caixa={caixa} carregado={!!dados} />
        <BlocoNoticias dados={dados} caixa={caixa} erro={erro} />
      </aside>
    </div>
  );
}
