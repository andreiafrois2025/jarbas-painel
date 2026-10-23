"use client";

// Equipe › Agentes: uma ficha por agente. Dados vivos:
//  - trabalhando/livre: GET /api/escritorio (mesma fonte do Escritório);
//  - horas economizadas e entregas: livro-caixa /root/horas/entregas.jsonl,
//    publicado no metrics-history.json (horas_por_agente, entregas_por_agente).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Mascote from "./Mascote";
import type { Collaborator } from "@/lib/types";
import { mascoteId } from "@/lib/mascotes";
import { SALAS, AGENTES, buscaEscritorio, type AgenteVivo, type SalaId } from "@/lib/escritorio";
import { useMetricsHistory } from "@/lib/metrics";
import { CHAME_PARA, SALA_ROTULO, SALA_EMOJI, salaDe, cargoDe } from "@/lib/equipeFicha";

interface Props {
  colaboradores: Collaborator[];
  servidora: boolean;
  desligados: number;
  mostrarDesligados: boolean;
  onMostrarDesligados: (v: boolean) => void;
  onEditar: (c: Collaborator) => void;
  onExcluir: (c: Collaborator) => void;
  onVerFicha: (c: Collaborator) => void;
}

const primeiraFrase = (t?: string) => {
  const s = (t || "").replace(/\s+/g, " ").trim();
  const i = s.search(/[.;](\s|$)/);
  const f = i > 0 ? s.slice(0, i) : s;
  return f.length > 90 ? f.slice(0, 89).trimEnd() + "…" : f;
};

const fmtH = (v: number) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")}h`;

// Ordem das salas e dos agentes, como no mock: Comando primeiro, Jarbas à frente.
const ORDEM_SALAS: SalaId[] = ["comando", "estudio", "docs", "secretaria", "hall", "lab"];
const SALAS_ORDENADAS = ORDEM_SALAS.map((id) => SALAS.find((s) => s.id === id)!);
const posicao = (nome: string) => {
  const id = mascoteId(nome);
  const a = AGENTES.find((x) => x.id === id);
  return a ? ORDEM_SALAS.indexOf(a.sala) * 100 + (a.id === "jarbas" ? 0 : AGENTES.indexOf(a)) : 9999;
};

export default function FichasEquipe({ colaboradores, servidora, desligados, mostrarDesligados, onMostrarDesligados, onEditar, onExcluir, onVerFicha }: Props) {
  const router = useRouter();
  const [sala, setSala] = useState<SalaId | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [vivos, setVivos] = useState<Record<string, AgenteVivo>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const { hoje } = useMetricsHistory();

  const vivoRef = useRef(false);
  useEffect(() => {
    vivoRef.current = true;
    const carrega = () => buscaEscritorio(servidora)
      .then((d) => vivoRef.current && setVivos(Object.fromEntries(d.agentes.map((a) => [a.id, a]))))
      .catch(() => { /* sem dado vivo: as fichas mostram "livre" sem o selo de trabalho */ });
    carrega();
    const id = setInterval(carrega, 30000);
    return () => { vivoRef.current = false; clearInterval(id); };
  }, [servidora]);

  // horas e entregas por primeiro nome minúsculo ("Dr. Harvey" -> harvey)
  const horas = useMemo(() => Object.fromEntries(Object.entries(hoje?.horas_por_agente ?? {}).map(([k, v]) => [k.toLowerCase(), v])), [hoje]);
  const entregas = useMemo(() => Object.fromEntries(Object.entries(hoje?.entregas_por_agente ?? {}).map(([k, v]) => [k.toLowerCase(), v])), [hoje]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...colaboradores].sort((a, b) => posicao(a.name) - posicao(b.name)).filter((c) => {
      if (sala !== "todas" && salaDe(c.name) !== sala) return false;
      if (!q) return true;
      const id = mascoteId(c.name) || "";
      return [c.name, c.specialization, c.bio, CHAME_PARA[id], cargoDe(c.name)].some((t) => t?.toLowerCase().includes(q));
    });
  }, [colaboradores, sala, busca]);

  const contaSala = (s: SalaId) => colaboradores.filter((c) => salaDe(c.name) === s).length;
  const chip = (ativo: boolean) =>
    `shrink-0 text-[13px] font-bold rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${
      ativo ? "bg-[var(--ac)] text-[var(--on-ac)] border-[var(--ac)]"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)]"}`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 space-y-4" onClick={() => menu && setMenu(null)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          <button onClick={() => setSala("todas")} aria-pressed={sala === "todas"} className={chip(sala === "todas")}>Todos ({colaboradores.length})</button>
          {SALAS_ORDENADAS.map((s) => contaSala(s.id) > 0 && (
            <button key={s.id} onClick={() => setSala(s.id)} aria-pressed={sala === s.id} className={chip(sala === s.id)}>{s.rotulo}</button>
          ))}
        </div>
        <label className="relative w-full sm:w-64 shrink-0">
          <span className="sr-only">Buscar agente</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" aria-hidden>🔎</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar agente…" className="input-modern !pl-9 !py-2 text-sm w-full" />
        </label>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--text-secondary)]">
          <p className="text-4xl mb-2 opacity-40">🤖</p>
          {busca ? "Nenhum agente encontrado." : "Nenhum agente nesta sala."}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch">
          {lista.map((c) => {
            const id = mascoteId(c.name);
            const sl = salaDe(c.name);
            const vivo = id ? vivos[id] : undefined;
            const trab = vivo?.estado === "trabalhando";
            const chame = (id && CHAME_PARA[id]) || primeiraFrase(c.specialization || c.bio);
            const h = id ? horas[id] : undefined;
            const e = id ? entregas[id] : undefined;
            const desligado = c.status === "dismissed";
            return (
              // 23/10 (pedido dela): cartão na horizontal, mascote à esquerda e tudo ao lado, para caber
              // mais agentes por tela e o "Chame para" aparecer inteiro
              <article key={c.id} className={`relative rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 flex gap-3 items-start min-w-0 ${desligado ? "opacity-60" : ""}`}>
                <button onClick={(ev) => { ev.stopPropagation(); setMenu(menu === c.id ? null : c.id); }} aria-label={`Mais opções de ${c.name}`}
                  className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] cursor-pointer">⋯</button>
                {menu === c.id && (
                  <div className="absolute right-3 top-9 z-20 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg py-1 min-w-[170px] text-left" onClick={(ev) => ev.stopPropagation()}>
                    <button onClick={() => { setMenu(null); onVerFicha(c); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] cursor-pointer">📋 Ver ficha completa</button>
                    <button onClick={() => { setMenu(null); onEditar(c); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] cursor-pointer">✏️ Editar</button>
                    <button onClick={() => { setMenu(null); onExcluir(c); }} className="w-full text-left px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-tertiary)] cursor-pointer">🗑️ Excluir</button>
                  </div>
                )}
                <div className="shrink-0 flex flex-col items-center gap-1.5 w-[84px]">
                  <Mascote nome={c.name} emoji={c.icon} tamanho={76} grande />
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${trab ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}
                    title={trab ? vivo?.tarefa : undefined}>
                    {desligado ? "desligado" : trab ? <><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />trabalhando</> : "livre"}
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-1.5 pr-5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight m-0">{c.name}</h2>
                    <span className="text-[12.5px] text-[var(--text-secondary)]">{cargoDe(c.name, c.specialization?.split("/")[0]?.trim())}</span>
                    {sl && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-px text-[10.5px] font-bold text-[var(--accent)]">{SALA_EMOJI[sl]} {SALA_ROTULO[sl]}</span>}
                  </div>
                  {chame && (
                    <p className="m-0 text-[12.5px] leading-snug text-[var(--text-secondary)]">
                      <span aria-hidden>💡 </span><b className="text-[var(--text-primary)] font-semibold">Chame para:</b> {chame}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-auto">
                    {h !== undefined && <span className="text-[12px] text-[var(--text-secondary)]"><b className="text-[var(--text-primary)] tabular-nums">{fmtH(h)}</b> economizadas</span>}
                    {e !== undefined && <span className="text-[12px] text-[var(--text-secondary)]"><b className="text-[var(--text-primary)] tabular-nums">{e}</b> entregas</span>}
                    {id && !desligado && (
                      <button onClick={() => router.push(`/conversa?agente=${id}`)}
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold cursor-pointer bg-[var(--ac)] text-[var(--on-ac)] hover:opacity-90">
                        💬 Conversar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {desligados > 0 && (
        <button onClick={() => onMostrarDesligados(!mostrarDesligados)} className="text-xs text-[var(--text-muted)] underline cursor-pointer">
          {mostrarDesligados ? "Esconder" : "Mostrar"} desligados ({desligados})
        </button>
      )}
    </div>
  );
}
