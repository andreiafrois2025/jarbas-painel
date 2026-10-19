"use client";

import type { ReactNode } from "react";

// Peças pequenas de Ajustes: interruptor e seletor de opções.

export function Interruptor({ ligado, onChange, rotulo, desabilitado }: {
  ligado: boolean; onChange: (v: boolean) => void; rotulo: string; desabilitado?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo} disabled={desabilitado}
      onClick={() => onChange(!ligado)}
      className="relative w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      style={{ background: ligado ? "var(--accent)" : "var(--border-light)" }}>
      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: ligado ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

export function Opcoes<T extends string>({ valor, onChange, opcoes, rotulo }: {
  valor: T; onChange: (v: T) => void; opcoes: { id: T; rotulo: string }[]; rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-full p-1 gap-0.5 bg-[var(--bg-tertiary)]">
      {opcoes.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} onClick={() => onChange(o.id)}
          className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-bold cursor-pointer transition-colors ${
            valor === o.id ? "bg-[var(--ac)] text-[var(--on-ac)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function BotaoPilula({ children, onClick, perigo, desabilitado, title }: {
  children: ReactNode; onClick?: () => void; perigo?: boolean; desabilitado?: boolean; title?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={desabilitado} title={title}
      className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-1.5 text-[13.5px] font-extrabold cursor-pointer hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      style={{ color: perigo ? "var(--danger)" : "var(--text-primary)" }}>
      {children}
    </button>
  );
}

/** Texto informativo em formato de pílula neutra (só leitura). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-[13.5px] font-bold text-[var(--text-primary)] whitespace-nowrap">
      {children}
    </span>
  );
}
