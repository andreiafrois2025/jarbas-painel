"use client";

// Áreas › Conteúdo: Esteira (padrão), Radar de notícias, Reels e Calendário.
// Esteira = SÓ LEITURA: lê o banco Conteúdos e o Radar do Notion pela squad-api.

import { useState } from "react";
import dynamic from "next/dynamic";
import Mascote from "../Mascote";
import NoticiasLista from "../NoticiasLista";
import { ehUau } from "../HojePanel";
import { nomeAgente } from "@/lib/licitacao";
import { usePainel } from "@/lib/painel-context";
import { useHoje, marcarLido, promoverProGrupo, promoverProConteudo } from "@/lib/hoje";
import { useRotaAreas, diaMes, diaSemanaNum, type CartaoEsteira, type ColunaEsteira, type Esteira } from "@/lib/areas";
import { tempoRelativo } from "@/lib/metrics";

const EstudioPage = dynamic(() => import("../EstudioPage"), {
  loading: () => <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">abrindo…</div>,
  ssr: false,
});

export type SubConteudo = "esteira" | "radar" | "reels" | "calendario";
export const SUBS_CONTEUDO: { id: SubConteudo; rotulo: string }[] = [
  { id: "esteira", rotulo: "📌 Esteira" },
  { id: "radar", rotulo: "📰 Radar de notícias" },
  { id: "reels", rotulo: "🎬 Reels" },
  { id: "calendario", rotulo: "📅 Calendário" },
];

const COLUNAS: { id: ColunaEsteira; rotulo: string; vazio: string }[] = [
  { id: "ideias", rotulo: "Ideias", vazio: "nenhuma ideia guardada" },
  { id: "produzindo", rotulo: "Produzindo", vazio: "nada sendo produzido agora" },
  { id: "aprovar", rotulo: "Para aprovar", vazio: "nada esperando você" },
  { id: "agendado", rotulo: "Agendado", vazio: "nada agendado" },
  { id: "publicado", rotulo: "Publicado", vazio: "nada publicado ainda" },
];

const semPrefixo = (t: string) => t.replace(/^\[Prioridade\]\s*/, "");

function Cartao({ c, coluna }: { c: CartaoEsteira; coluna: ColunaEsteira }) {
  const quem = nomeAgente(c.agente) || c.agente;
  const detalhe = [
    coluna === "agendado" && c.data ? `${diaSemanaNum(c.data)}/${c.data.slice(5, 7)}` : coluna === "publicado" && c.data ? diaMes(c.data) : "",
    c.etapa || "",
    c.info || "",
  ].filter(Boolean).join(" · ");
  return (
    <a
      href={c.url} target="_blank" rel="noreferrer"
      title="Abrir no Notion"
      className={`block rounded-xl bg-[var(--bg-secondary)] p-2.5 hover:border-[var(--ac)] transition-colors ${c.espera ? "border-2 border-[var(--ouro)]" : "border border-[var(--border)]"}`}
      style={{ boxShadow: "0 1px 2px var(--sombra)" }}
    >
      <p className="text-[13.5px] leading-snug text-[var(--text-primary)] line-clamp-3">{semPrefixo(c.titulo)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
        <span title={`Cuida: ${quem}`}><Mascote nome={c.agente} emoji="🤖" tamanho={24} /></span>
        {c.espera && <span className="text-[11px] font-semibold" style={{ color: "var(--uau)" }}>🙋 esperando você</span>}
        {detalhe && <span className="text-[11px] text-[var(--text-secondary)]">{detalhe}</span>}
      </div>
    </a>
  );
}

function EsteiraColunas({ esteira, erro, carregando }: { esteira: Esteira | null; erro: boolean; carregando: boolean }) {
  if (carregando) return <p className="px-3 md:px-5 py-4 text-sm text-[var(--text-secondary)] animate-pulse">montando a esteira…</p>;
  if (erro || !esteira) {
    return <p className="mx-3 md:mx-5 my-4 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[var(--text-secondary)]">Não consegui ler a esteira agora, então não sei dizer o que está em cada etapa. (Ela vem do Notion pela squad-api.)</p>;
  }
  return (
    <div className="shrink-0 flex gap-3 overflow-x-auto px-3 md:px-5 pb-2 snap-x" role="list" aria-label="Esteira de conteúdo">
      {COLUNAS.map((col) => {
        const d = esteira.colunas[col.id];
        return (
          <section key={col.id} role="listitem" className="snap-start shrink-0 w-[16.5rem] md:w-auto md:flex-1 md:min-w-[12.5rem] rounded-2xl bg-[var(--bg-tertiary)] p-2.5">
            <h3 className="flex justify-between items-baseline px-1 pb-2 text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
              <span>{col.rotulo}</span><span>{d.total}</span>
            </h3>
            <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-0.5">
              {d.itens.length === 0
                ? <p className="px-1 py-2 text-[13px] text-[var(--text-muted)]">{col.vazio}</p>
                : d.itens.map((c) => <Cartao key={c.id} c={c} coluna={col.id} />)}
              {d.total > d.itens.length && (
                <p className="px-1 text-[11px] text-[var(--text-muted)]">mostrando {d.itens.length} de {d.total}, os mais recentes</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// Bloco de baixo da Esteira: radar curto, UAU em destaque.
function RadarCurto({ aoVerTodas }: { aoVerTodas: () => void }) {
  const { servidora } = usePainel();
  const { dados } = useHoje(!servidora);
  const [promovidos, setPromovidos] = useState<Set<string>>(new Set());
  const [lidos, setLidos] = useState<Set<string>>(new Set());
  if (servidora) return null;

  const uau = (dados?.caixa || []).filter(ehUau);
  const feed = (dados?.para_mim || []).filter((n) => !n.lido && !lidos.has(n.url) && !promovidos.has(n.url)).slice(0, 4);
  const totalNoticias = (dados?.caixa || []).filter((c) => c.coluna.includes("Notícia") || c.coluna.includes("Prioridade")).length + (dados?.para_mim || []).filter((n) => !n.lido).length;

  const btn = "text-[12px] font-semibold px-3 py-1 rounded-full border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--ac)] hover:text-[var(--ac)] cursor-pointer whitespace-nowrap";
  return (
    <section className="shrink-0 mx-3 md:mx-5 mt-4 mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">Radar · pra você ficar por dentro</h2>
        <button onClick={aoVerTodas} className="text-[13px] font-bold text-[var(--ac)] cursor-pointer">ver todas{totalNoticias ? ` (${totalNoticias})` : ""} ›</button>
      </div>
      {!dados ? <p className="text-sm text-[var(--text-muted)]">carregando…</p>
        : uau.length === 0 && feed.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Sem notícias novas no radar.</p>
        : (
          <ul>
            {uau.map((c) => (
              <li key={c.id} className="py-2 border-b border-dashed border-[var(--border)] last:border-0">
                <a href={c.url} target="_blank" rel="noreferrer" className="text-[15px] hover:underline">
                  <b style={{ color: "var(--uau)" }}>⚡ UAU</b> · {semPrefixo(c.titulo)}
                </a>
                <span className="block text-xs text-[var(--text-secondary)]">{c.origem || "Radar"} · abra no Notion para ler e decidir ↗</span>
              </li>
            ))}
            {feed.map((n) => (
              <li key={n.url} className="py-2 border-b border-dashed border-[var(--border)] last:border-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex-1 min-w-[14rem]">
                  <a href={n.url} target="_blank" rel="noreferrer" onClick={() => { marcarLido(n.url, true); setLidos((s) => new Set(s).add(n.url)); }} className="text-[15px] hover:underline">{n.titulo}</a>
                  <span className="block text-xs text-[var(--text-secondary)]">{n.fonte}{n.quando ? ` · ${tempoRelativo(n.quando)}` : ""}</span>
                </div>
                <div className="flex gap-1.5">
                  <button className={btn} onClick={async () => { setPromovidos((s) => new Set(s).add(n.url)); await promoverProGrupo(n.url); }}>→ grupo</button>
                  <button className={btn} onClick={async () => { setPromovidos((s) => new Set(s).add(n.url)); await promoverProConteudo(n.url); }}>→ vira conteúdo</button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

function Calendario({ esteira, erro, carregando }: { esteira: Esteira | null; erro: boolean; carregando: boolean }) {
  if (carregando) return <p className="p-5 text-sm text-[var(--text-secondary)] animate-pulse">carregando…</p>;
  if (erro || !esteira) return <p className="p-5 text-sm text-[var(--text-secondary)]">Não consegui ler o que está agendado agora.</p>;
  const itens = esteira.colunas.agendado.itens;
  const porDia = new Map<string, CartaoEsteira[]>();
  for (const c of itens) {
    const k = c.data || "";
    porDia.set(k, [...(porDia.get(k) || []), c]);
  }
  const dias = [...porDia.keys()].sort((a, b) => (a || "9").localeCompare(b || "9"));
  return (
    <div className="px-3 md:px-5 pb-6 max-w-3xl">
      {dias.length === 0
        ? <p className="text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[var(--text-secondary)]">Nada agendado agora.</p>
        : dias.map((d) => (
          <section key={d || "sem"} className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)] mb-1.5">{d ? `${diaSemanaNum(d)}/${d.slice(5, 7)}` : "Sem data marcada"}</h3>
            <div className="space-y-2">{porDia.get(d)!.map((c) => <Cartao key={c.id} c={c} coluna="agendado" />)}</div>
          </section>
        ))}
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Mostra só o que já tem data no Radar (“Publicar em”) e nos Conteúdos. Um calendário editorial completo, com o que ainda vai ser planejado, fica para depois: hoje não há uma fonte única para ele.
      </p>
    </div>
  );
}

export default function ConteudoAba({ sub, onSub }: { sub: SubConteudo; onSub: (s: SubConteudo) => void }) {
  const { dados, erro, carregando } = useRotaAreas<Esteira>("/api/areas/esteira", sub === "esteira" || sub === "calendario");
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 flex flex-wrap gap-2 px-3 md:px-5 py-2.5">
        {SUBS_CONTEUDO.map((s) => (
          <button key={s.id} onClick={() => onSub(s.id)} aria-pressed={sub === s.id}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors border ${
              sub === s.id ? "bg-[var(--ac)] border-[var(--ac)] text-[var(--on-ac)]" : "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}>{s.rotulo}</button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {sub === "esteira" && (<><EsteiraColunas esteira={dados} erro={erro} carregando={carregando} /><RadarCurto aoVerTodas={() => onSub("radar")} /></>)}
        {sub === "radar" && <NoticiasLista />}
        {sub === "reels" && <EstudioPage />}
        {sub === "calendario" && <Calendario esteira={dados} erro={erro} carregando={carregando} />}
      </div>
    </div>
  );
}
