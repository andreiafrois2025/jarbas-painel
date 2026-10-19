"use client";

// Áreas › Casa: uma tela só, três cartões (Luiz · escola, Finanças, Rotina e lembretes).
// Some no modo Só Igam (a página que monta as abas já esconde a aba).

import Link from "next/link";
import Mascote from "../Mascote";
import { useHoje } from "@/lib/hoje";
import {
  useRotaAreas, brl, brlCent, diaSemanaNum, hojeBR, somaDiasISO, type Casa,
} from "@/lib/areas";

const Titulo = ({ icone, children, direita }: { icone: string; children: React.ReactNode; direita?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-2 mb-3">
    <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]"><span className="mr-1.5">{icone}</span>{children}</h2>
    {direita && <span className="text-[13px] font-bold text-[var(--ac)]">{direita}</span>}
  </div>
);

const Moldura = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 md:p-5 min-w-0" style={{ boxShadow: "0 1px 2px var(--sombra)" }}>{children}</section>
);

const COR_TIPO: Record<string, { cor: string; rotulo: string }> = {
  prova: { cor: "#B4532F", rotulo: "prova" },
  paracasa: { cor: "#2E9E6B", rotulo: "para casa" },
  avaliativa: { cor: "var(--ouro)", rotulo: "avaliativa" },
};

function CartaoLuiz() {
  const { dados, erro } = useHoje();
  const hoje = hojeBR();
  const fim = somaDiasISO(hoje, 14);
  const itens = (dados?.escola || []).filter((e) => e.data >= hoje && e.data <= fim).sort((a, b) => a.data.localeCompare(b.data));
  return (
    <Moldura>
      <Titulo icone="🎒" direita="próximos 14 dias">Luiz · escola</Titulo>
      {erro ? <p className="text-sm text-[var(--text-secondary)]">Não consegui ler a agenda escolar agora.</p>
        : !dados ? <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando…</p>
        : itens.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nada da escola nos próximos 14 dias.</p>
        : (
          <ul>
            {itens.map((e, i) => {
              const t = COR_TIPO[e.tipo];
              return (
                <li key={i} className="grid grid-cols-[3.6rem_1fr] gap-x-2 py-2 border-b border-dashed border-[var(--border)] last:border-0">
                  <span className="text-sm font-bold text-[var(--ac)]">{diaSemanaNum(e.data)}</span>
                  <span className="text-[15px] min-w-0">
                    <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: t?.cor || "transparent" }} />
                    {!t && <span aria-hidden>📌 </span>}
                    <b className={e.tipo === "prova" ? "" : "font-semibold"}>{e.tipo === "prova" ? "Prova de " : e.tipo === "paracasa" ? "Para casa de " : e.tipo === "avaliativa" ? "Avaliativa de " : ""}{e.disciplina || e.nome}</b>
                    {e.disciplina && e.nome ? ` · ${e.nome}` : ""}
                    {e.pontos ? <span className="text-[var(--text-secondary)]"> ({e.pontos})</span> : null}
                    <span className="block text-xs text-[var(--text-secondary)]">{t?.rotulo || "aviso da escola"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      <p className="mt-3 flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
        <Mascote nome="donna" emoji="🗓️" tamanho={26} />
        <span>Mande foto do caderno ou áudio no chat: a Donna põe aqui e na agenda.</span>
      </p>
    </Moldura>
  );
}

const nomeMes = (mes: string) => new Date(mes + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long" });

function CartaoFinancas({ dados, erro, carregando }: { dados: Casa | null; erro: boolean; carregando: boolean }) {
  const f = dados?.financas;
  const max = Math.max(1, ...(f?.categorias || []).map((c) => c.valor));
  const n = f?.vencem_semana.length || 0;
  return (
    <Moldura>
      <Titulo icone="💰" direita={f ? nomeMes(f.mes) : undefined}>Finanças</Titulo>
      {carregando ? <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando…</p>
        : erro || !f ? <p className="text-sm text-[var(--text-secondary)]">Não consegui ler as finanças agora{dados?.erro_financas ? ` (${dados.erro_financas})` : ""}. A tela completa continua disponível abaixo.</p>
        : (
          <>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-1 mb-3">
              <div>
                <p className="text-3xl font-extrabold leading-none text-[var(--ac)]">{brl(f.gasto_mes)}</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">gasto no mês até hoje</p>
              </div>
              <div>
                <p className="text-xl font-extrabold leading-none" style={{ color: "var(--uau)" }}>{n} {n === 1 ? "conta" : "contas"}</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">{n === 1 ? "vence" : "vencem"} nesta semana</p>
              </div>
            </div>
            {f.categorias.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {f.categorias.map((c) => (
                  <li key={c.nome} className="grid grid-cols-[minmax(5rem,7.5rem)_1fr_auto] items-center gap-2 text-[13px]">
                    <span className="truncate" title={c.nome}>{c.nome}</span>
                    <span className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(3, (c.valor / max) * 100)}%`, background: "var(--af-teal)" }} /></span>
                    <span className="text-[var(--text-secondary)] tabular-nums">{brl(c.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
            {n > 0 && (
              <ul className="border-t border-dashed border-[var(--border)]">
                {f.vencem_semana.map((c) => (
                  <li key={c.nome + c.data} className="grid grid-cols-[3.6rem_1fr_auto] gap-x-2 items-baseline py-1.5 text-sm border-b border-dashed border-[var(--border)] last:border-0">
                    <b style={{ color: "var(--uau)" }}>{c.data === hojeBR() ? "hoje" : diaSemanaNum(c.data)}</b>
                    <span className="truncate">{c.nome}</span>
                    <span className="text-[var(--text-secondary)] tabular-nums">{c.valor != null ? brlCent(c.valor) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Gasto sem transferências entre contas nem pagamento de fatura. Vencimentos são das contas fixas cadastradas; o Notion não guarda com confiança quais já foram pagas, por isso não há “marcar pago” aqui.
            </p>
          </>
        )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Mascote nome="louis" emoji="💸" tamanho={26} /> Os gastos entram do banco uma vez por dia.</p>
        <Link href="/areas?aba=casa&sub=financas" className="text-[13px] font-bold text-[var(--ac)]">abrir finanças completo ›</Link>
      </div>
    </Moldura>
  );
}

interface ItemRotina { quando: string; ordem: string; texto: string; fonte: "lembrete" | "agenda"; sub?: string }

/** "- 20/10/2026 14:00: título" -> item da agenda. */
function lerAgenda(texto?: string): ItemRotina[] {
  if (!texto) return [];
  const itens: ItemRotina[] = [];
  const ano = new Date().getFullYear();
  for (const bruta of texto.split("\n")) {
    const l = bruta.replace(/^\s*[-•]\s*/, "").trim();
    const m = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(\d{1,2}):(\d{2})\s*[:\-–]?\s*(.*)$/.exec(l);
    if (!m) continue;
    const iso = `${m[3] || ano}-${m[2]}-${m[1]}`;
    itens.push({ ordem: `${iso} ${m[4].padStart(2, "0")}:${m[5]}`, quando: iso, texto: m[6] || l, fonte: "agenda", sub: `${Number(m[4])}h${m[5] === "00" ? "" : m[5]}` });
  }
  return itens;
}

function rotuloDia(iso: string) {
  const h = hojeBR();
  if (iso === h) return "hoje";
  if (iso === somaDiasISO(h, 1)) return "amanhã";
  return diaSemanaNum(iso);
}

function CartaoRotina({ dados, carregando }: { dados: Casa | null; carregando: boolean }) {
  const { dados: hoje } = useHoje();
  const ate = somaDiasISO(hojeBR(), 7);
  const itens: ItemRotina[] = [];
  for (const l of dados?.lembretes || []) {
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(l.quando));
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(l.quando)).replace(":", "h").replace(/h00$/, "h");
    itens.push({ ordem: `${iso} ${hora}`, quando: iso, texto: l.texto, fonte: "lembrete", sub: `lembrete às ${hora}${l.repetir ? ` · repete (${l.repetir})` : ""}` });
  }
  itens.push(...lerAgenda(hoje?.agenda).map((i) => ({ ...i, quando: hojeBR(), ordem: hojeBR() + " " + i.ordem.slice(11) })));
  itens.push(...lerAgenda(hoje?.agenda_semana));
  const lista = itens.filter((i) => i.quando <= ate).sort((a, b) => a.ordem.localeCompare(b.ordem)).slice(0, 8);
  return (
    <Moldura>
      <Titulo icone="🗓️">Rotina e lembretes</Titulo>
      {carregando && !hoje ? <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando…</p>
        : lista.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhum lembrete nem compromisso nos próximos 7 dias.</p>
        : (
          <ul>
            {lista.map((i, k) => (
              <li key={k} className="grid grid-cols-[3.6rem_1fr] gap-x-2 py-2 border-b border-dashed border-[var(--border)] last:border-0">
                <span className="text-sm font-bold text-[var(--ac)]">{rotuloDia(i.quando)}</span>
                <span className="text-[15px] min-w-0">{i.texto}<span className="block text-xs text-[var(--text-secondary)]">{i.fonte === "agenda" ? `agenda${i.sub ? ` · ${i.sub}` : ""}` : i.sub}</span></span>
              </li>
            ))}
          </ul>
        )}
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        Vem dos lembretes do Jarbas e da sua agenda. As rotinas da Lara (cardápio) e do Louis (revisão de gastos) ainda não têm uma fonte para aparecer aqui. Some no modo Só Igam.
      </p>
    </Moldura>
  );
}

export default function CasaAba() {
  const { dados, erro, carregando } = useRotaAreas<Casa>("/api/areas/casa");
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 md:p-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
        <CartaoLuiz />
        <CartaoFinancas dados={dados} erro={erro} carregando={carregando} />
        <CartaoRotina dados={dados} carregando={carregando} />
      </div>
    </div>
  );
}
