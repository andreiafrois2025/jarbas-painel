"use client";

// Números › Visão geral (19/10/2026, mock aprovado "numeros-novo").
// Horas economizadas pela equipe inteira. De onde vem cada coisa:
//  - cartões, gráfico semanal, "quem mais" e "o que mais economizou":
//    /api/numeros/resumo (squad-api lê o livro-caixa /root/horas/entregas.jsonl,
//    o mesmo que alimenta o snapshot noturno);
//  - se a squad-api não responder, os cartões caem para o snapshot noturno
//    (metrics-history.json) e o que não tem fonte aparece como "sem dado";
//  - "como calculamos": tabela_horas do snapshot (/root/horas/tabela.json).

import { useState } from "react";
import Mascote from "./Mascote";
import { CartaoSecao } from "./ui";
import { usePainel } from "@/lib/painel-context";
import { ehColaboradorOculto, ehPessoal } from "@/lib/modo";
import type { MetricsHistory, SnapshotDia } from "@/lib/metrics";
import type { NumerosResumo } from "@/lib/saude";

const EMOJI: Record<string, string> = {
  Jarbas: "🤖", Louis: "💰", Mike: "🔍", Izzy: "✍️", Felipe: "🎨", Katrina: "📑",
  Donna: "🗂️", Junior: "💻", Harvey: "⚖️", Theo: "🎬", Eric: "🗺️",
};

const fmtH = (v: number) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")}h`;
const fmtHCurto = (v: number) => (v >= 100 ? `${Math.round(v)}h` : fmtH(v));
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const brData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Barra({ pct, cor = "var(--accent)" }: { pct: number; cor?: string }) {
  return (
    <div className="h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: cor }} />
    </div>
  );
}

function Cartao({ valor, rotulo, sub }: { valor: string; rotulo: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-5 min-w-0">
      <div className="fonte-maquina text-[40px] leading-none text-[var(--accent)]">{valor}</div>
      <div className="mt-2 text-[15px] text-[var(--text-primary)]">{rotulo}</div>
      <div className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{sub}</div>
    </div>
  );
}

export default function HorasEquipe({ hoje, tabela, numeros, semDadoNumeros }: {
  hoje: SnapshotDia; tabela: MetricsHistory["tabela_horas"];
  numeros: NumerosResumo | null; semDadoNumeros: boolean;
}) {
  const { servidora } = usePainel();
  const [tabelaAberta, setTabelaAberta] = useState(false);

  // ── cartões: livro-caixa ao vivo; senão, snapshot noturno ──
  const horas = numeros?.horas ?? {
    semana: hoje.horas_semana ?? null, mes: hoje.horas_mes ?? null, total: hoje.horas_economizadas ?? null,
  };
  const entregas = numeros?.entregas ?? (hoje.entregas_por_agente ? Object.values(hoje.entregas_por_agente).reduce((a, b) => a + b, 0) : null);
  const dias = horas.total != null ? Math.round(horas.total / 8) : null;
  const mesRef = numeros?.mes_inicio ?? hoje.date.slice(0, 8) + "01";
  const mesNum = Number(mesRef.slice(5, 7)) - 1;

  // ── quem mais devolveu tempo ──
  const agentes = Object.entries(numeros?.por_agente_mes ?? hoje.horas_por_agente ?? {})
    .filter(([n]) => !(servidora && ehColaboradorOculto(n)))
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const periodoAgentes = numeros ? "este mês" : "no total";
  const maxA = agentes[0]?.[1] || 1;

  // ── o que mais economizou ──
  const rotulo = (t: string) => tabela?.tipos?.[t]?.rotulo ?? t;
  const rotuloCurto = (t: string) => rotulo(t).replace(/\s*\(.*\)\s*$/, ""); // "Post enviado ao grupo (notícia ou dica)" vira "Post enviado ao grupo"
  const tipos = Object.entries(numeros?.por_tipo_total ?? hoje.horas_por_tipo ?? {})
    .filter(([t]) => !(servidora && ehPessoal(rotulo(t))))
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxT = tipos[0]?.[1] || 1;

  // ── gráfico semanal ──
  const semanas = numeros?.semanas ?? [];
  const maxS = Math.max(1, ...semanas.map((s) => s.horas));

  // ── "como calculamos": exemplos tirados da própria tabela ──
  const t = tabela?.tipos;
  const min = (k: string) => t?.[k]?.minutos;
  const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
  const exemplos = [
    ["post do grupo", "post_grupo"], ["reel editado", "reel_editado"],
    ["peça de licitação", "peca_licitacao"], ["e-mail triado", "email_triado"],
  ].filter(([, k]) => min(k) != null).map(([nome, k]) => `${nome} ${dur(min(k)!)}`);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao valor={horas.semana != null ? fmtHCurto(horas.semana) : "sem dado"} rotulo="economizadas nesta semana" sub="tudo que a equipe entregou desde segunda" />
        <Cartao valor={horas.mes != null ? fmtHCurto(horas.mes) : "sem dado"} rotulo="neste mês" sub={`desde 1º de ${MESES[mesNum] ?? "este mês"}`} />
        <Cartao valor={horas.total != null ? fmtHCurto(horas.total) : "sem dado"} rotulo="no total"
          sub={`${numeros?.desde ? `desde ${brData(numeros.desde)}` : "desde o início"}${dias != null ? ` · ≈ ${dias} dias de trabalho` : ""}`} />
        <Cartao valor={entregas != null ? String(entregas) : "sem dado"} rotulo="entregas" sub="legendas, reels, peças, e-mails…" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <CartaoSecao titulo="Horas economizadas por semana" direita={<span className="text-[13px] font-extrabold text-[var(--ac)]">últimas 12</span>}>
          {semanas.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              {semDadoNumeros ? "sem dado: não consegui ler o livro-caixa da VPS agora." : "lendo o livro-caixa…"}
            </p>
          ) : (
            <>
              <div role="img" aria-label={`Horas economizadas por semana nas últimas ${semanas.length} semanas. Semana atual: ${fmtH(semanas[semanas.length - 1].horas)}.`}
                className="flex items-end gap-1.5 sm:gap-2 h-44 pt-6">
                {semanas.map((s, i) => {
                  const atual = i === semanas.length - 1;
                  const fim = new Date(new Date(s.inicio + "T12:00:00Z").getTime() + 6 * 86400e3).toISOString().slice(0, 10);
                  return (
                    <div key={s.inicio} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center relative"
                      title={`${brData(s.inicio)} a ${brData(fim)}: ${fmtH(s.horas)} · ${s.entregas} entregas`}>
                      {atual && <span className="text-[12px] font-extrabold mb-1 text-[var(--text-primary)]">{fmtHCurto(s.horas)}</span>}
                      <div className="w-full rounded-t-md"
                        style={{ height: `${Math.max(3, (s.horas / maxS) * (atual ? 88 : 100))}%`, background: atual ? "var(--ouro)" : "var(--accent)", opacity: atual ? 1 : 0.8 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 sm:gap-2 mt-2 text-[12.5px] text-[var(--text-secondary)]" aria-hidden>
                {semanas.map((s, i) => {
                  const mes = Number(s.inicio.slice(5, 7)) - 1;
                  const novoMes = i === 0 || Number(semanas[i - 1].inicio.slice(5, 7)) - 1 !== mes;
                  return <div key={s.inicio} className="flex-1 min-w-0 relative h-4"><span className="absolute left-0 whitespace-nowrap">{novoMes ? MES_CURTO[mes] : ""}</span></div>;
                })}
              </div>
              <table className="sr-only">
                <caption>Horas economizadas por semana</caption>
                <tbody>{semanas.map((s) => <tr key={s.inicio}><td>{brData(s.inicio)}</td><td>{fmtH(s.horas)}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </CartaoSecao>

        <CartaoSecao titulo="Quem mais te devolveu tempo" direita={<span className="text-[13px] font-extrabold text-[var(--ac)]">{periodoAgentes}</span>}>
          {agentes.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">sem dado: ainda não há entregas registradas neste período.</p>
          ) : (
            <ul className="space-y-3.5 pt-1">
              {agentes.map(([nome, h]) => (
                <li key={nome} className="flex items-center gap-3">
                  <Mascote nome={nome} emoji={EMOJI[nome] ?? "✨"} tamanho={32} />
                  <span className="w-20 shrink-0 text-[15px] truncate">{nome}</span>
                  <div className="flex-1 min-w-0"><Barra pct={(h / maxA) * 100} /></div>
                  <span className="w-14 text-right text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">{fmtH(h)}</span>
                </li>
              ))}
            </ul>
          )}
        </CartaoSecao>

        <CartaoSecao titulo="O que mais economizou">
          {tipos.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">sem dado</p>
          ) : (
            <ul className="space-y-3 pt-1">
              {tipos.map(([k, h]) => (
                <li key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_3.2rem] sm:grid-cols-[minmax(0,13rem)_1fr_3.5rem] items-center gap-3">
                  <span className="text-[14.5px] truncate" title={rotulo(k)}>{rotuloCurto(k)}</span>
                  <Barra pct={(h / maxT) * 100} />
                  <span className="text-right text-[14px] font-semibold tabular-nums">{fmtHCurto(h)}</span>
                </li>
              ))}
            </ul>
          )}
        </CartaoSecao>

        <CartaoSecao titulo="Como calculamos">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Cada entrega vale o tempo que você levaria fazendo à mão, contado por baixo
            {exemplos.length > 0 && <>: {exemplos.join(", ")}</>}. Rotinas técnicas não contam.
          </p>
          <button onClick={() => setTabelaAberta(!tabelaAberta)} aria-expanded={tabelaAberta}
            className="mt-4 rounded-full border border-[var(--border)] px-4 py-2 text-[13.5px] font-extrabold text-[var(--ac)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
            {tabelaAberta ? "esconder a tabela" : "ver a tabela completa ›"}
          </button>
          {tabelaAberta && (
            tabela?.tipos ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <th className="py-1.5 pr-3 font-medium">Entrega</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Minutos</th>
                      <th className="py-1.5 font-medium">Por quê</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tabela.tipos).map(([k, v]) => (
                      <tr key={k} className="border-b border-[var(--border)]/50 align-top">
                        <td className="py-1.5 pr-3">{v.rotulo}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">{v.minutos}</td>
                        <td className="py-1.5 text-[var(--text-secondary)]">{v.porque}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!!tabela.fora_da_conta?.length && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1">O que NÃO entra na conta</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-[var(--text-secondary)]">
                      {tabela.fora_da_conta.map((f) => (
                        <li key={f.fonte}><span className="text-[var(--text-primary)]">{f.fonte}</span>: {f.porque}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                  As estimativas são conservadoras. Para ajustar, peça ao Jarbas: tudo é recalculado, inclusive o passado.
                </p>
              </div>
            ) : <p className="mt-3 text-sm text-[var(--text-secondary)]">sem dado: a tabela de minutos ainda não chegou no resumo da noite.</p>
          )}
        </CartaoSecao>
      </div>
    </div>
  );
}
