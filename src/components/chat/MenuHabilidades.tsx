"use client";

// Menu flutuante "/" do chat: lista de habilidades (acima da caixa) e a etiqueta (chip) escolhida.

import { useEffect, useRef } from "react";
import type { HabChat } from "@/lib/habilidadesChat";

const SELO_OBRA = "🔒 modo obra (em breve)";

export function MenuHabilidades({ itens, ativo, consulta, carregando, aoEscolher, aoPassar, idLista }: {
  itens: HabChat[]; ativo: number; consulta: string; carregando: boolean;
  aoEscolher: (h: HabChat) => void; aoPassar: (i: number) => void; idLista: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>(`[data-i="${ativo}"]`)?.scrollIntoView({ block: "nearest" }); }, [ativo, itens]);
  return (
    <div className="absolute left-0 right-0 bottom-full mb-2 z-30 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_10px_32px_var(--sombra)] overflow-hidden">
      <p className="px-4 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
        Habilidades{consulta ? ` com “${consulta}”` : ""} <span className="font-normal normal-case tracking-normal text-[var(--text-muted)]">· ↑ ↓ escolhem, Enter confirma, Esc fecha</span>
      </p>
      {itens.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[var(--text-secondary)]">{carregando ? "Carregando habilidades…" : "Nenhuma habilidade encontrada."}</p>
      ) : (
        <ul ref={ref} id={idLista} role="listbox" aria-label="Habilidades" className="m-0 p-1.5 list-none max-h-[min(46vh,21rem)] overflow-y-auto overscroll-contain">
          {itens.map((h, i) => (
            <li key={h.id} id={`${idLista}-${i}`} data-i={i} role="option" aria-selected={i === ativo}
              onMouseDown={(e) => e.preventDefault()} onClick={() => aoEscolher(h)} onMouseMove={() => { if (i !== ativo) aoPassar(i); }}
              className={`flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer ${i === ativo ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)]"}`}>
              <span aria-hidden className="text-xl leading-6 shrink-0 w-7 text-center">{h.icone}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{h.rotulo}</span>
                  {h.obra && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] whitespace-nowrap">{SELO_OBRA}</span>}
                </span>
                {h.descricao && <span className="block text-[12.5px] leading-snug text-[var(--text-secondary)] mt-0.5 line-clamp-2">{h.descricao}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChipHabilidade({ h, aoRemover }: { h: HabChat; aoRemover: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full shrink-0 rounded-full bg-[var(--accent-soft)] border border-[var(--ac)]/40 pl-2.5 pr-1.5 py-1 text-[13px] font-bold text-[var(--text-primary)]" title={h.descricao}>
      <span aria-hidden>{h.icone}</span>
      <span className="truncate">{h.rotulo.toLowerCase()}</span>
      <button type="button" onClick={aoRemover} aria-label={`Remover a habilidade ${h.rotulo}`}
        className="h-5 w-5 inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--danger)] cursor-pointer">×</button>
    </span>
  );
}
