"use client";

// Desenha os 5 tipos de visual do chat a partir de objetos JÁ VALIDADOS
// (ver validarVisual em src/lib/chat.ts). Só texto puro, sem HTML nem script.

import { useState } from "react";
import type { Visual } from "@/lib/chat";

const caixa = "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 my-2";

export default function Visuais({ v, onEscolha, desativado }: { v: Visual; onEscolha: (mensagem: string) => void; desativado: boolean }) {
  if (v.tipo === "cartoes") {
    return (
      <div className="my-2">
        {v.titulo && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">{v.titulo}</p>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {v.itens.map((c, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
              {c.rotulo && <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] mb-1">{c.rotulo}</span>}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{c.titulo}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{c.texto}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (v.tipo === "comparacao") {
    return (
      <div className="my-2">
        {v.titulo && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">{v.titulo}</p>}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}>
          {v.colunas.map((c, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
              <p className="px-3 py-1.5 text-sm font-semibold bg-[var(--accent-soft)] text-[var(--accent-hover)]">{c.titulo}</p>
              <ul className="p-3 space-y-1.5 text-sm text-[var(--text-primary)]">
                {c.itens.map((t, j) => <li key={j} className="flex gap-2"><span className="text-[var(--accent)]">•</span><span>{t}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (v.tipo === "linha_tempo") {
    return (
      <div className={caixa}>
        {v.titulo && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">{v.titulo}</p>}
        <ol className="relative border-l-2 border-[var(--border-light)] ml-1.5 space-y-3">
          {v.itens.map((it, i) => (
            <li key={i} className="pl-4 relative">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-secondary)]" />
              <p className="text-xs font-semibold text-[var(--af-terracotta)]">{it.quando}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{it.titulo}</p>
              {it.texto && <p className="text-sm text-[var(--text-secondary)]">{it.texto}</p>}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (v.tipo === "checklist") return <Checklist v={v} />;
  if (v.tipo === "agenda") {
    return (
      <div className={caixa}>
        {v.titulo && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">📅 {v.titulo}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {v.dias.map((d, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
              <p className="px-3 py-1.5 text-sm font-semibold capitalize bg-[var(--accent-soft)] text-[var(--accent-hover)]">{d.dia}</p>
              {d.itens.length === 0
                ? <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Nada marcado</p>
                : <ul className="p-3 space-y-2">
                    {d.itens.map((it, j) => (
                      <li key={j} className="flex gap-2 text-sm">
                        <span className="shrink-0 font-semibold text-[var(--af-terracotta)] tabular-nums">{it.hora}</span>
                        <span className="text-[var(--text-primary)]">{it.titulo}</span>
                      </li>
                    ))}
                  </ul>}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">Só consulta. Para marcar ou mudar compromisso, peça à Donna no WhatsApp.</p>
      </div>
    );
  }
  return (
    <div className="my-2">
      {v.pergunta && <p className="text-sm font-medium mb-1.5">{v.pergunta}</p>}
      <div className="flex flex-wrap gap-2">
        {v.opcoes.map((o, i) => (
          <button key={i} disabled={desativado} onClick={() => onEscolha(o.mensagem)}
            className="px-3 py-1.5 rounded-full text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

// Marcar/desmarcar é só local (ajuda a ela acompanhar); não envia nada ao servidor.
function Checklist({ v }: { v: Extract<Visual, { tipo: "checklist" }> }) {
  const [feitos, setFeitos] = useState<boolean[]>(v.itens.map((i) => i.feito));
  return (
    <div className={caixa}>
      {v.titulo && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">{v.titulo}</p>}
      <ul className="space-y-1">
        {v.itens.map((it, i) => (
          <li key={i}>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={feitos[i]} onChange={() => setFeitos((f) => f.map((x, j) => (j === i ? !x : x)))} />
              <span className={feitos[i] ? "line-through text-[var(--text-muted)]" : ""}>{it.texto}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
