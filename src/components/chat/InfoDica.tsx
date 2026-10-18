"use client";

// Ícone ⓘ discreto com balão: abre ao passar o mouse, ao focar pelo teclado e ao
// tocar (toque abre/fecha). Esc ou clique fora fecha. Balão em posição fixa para
// não ser cortado pela lista nem cobrir a caixa de digitação.

import { useEffect, useId, useRef, useState } from "react";

export default function InfoDica({ nome, linhas }: { nome: string; linhas: { titulo: string; texto: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 8 });
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  const abrir = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) {
      const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - 296));
      setPos(r.bottom > window.innerHeight * 0.6 ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
    }
    setAberto(true);
  };

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (!btn.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  return (
    <span className="inline-flex" onMouseEnter={abrir} onMouseLeave={() => setAberto(false)}>
      <button ref={btn} type="button" aria-label={`Sobre ${nome}`} aria-describedby={aberto ? id : undefined} aria-expanded={aberto}
        onFocus={abrir} onBlur={() => setAberto(false)} onClick={() => (aberto ? setAberto(false) : abrir())}
        className="w-5 h-5 inline-flex items-center justify-center rounded-full text-[13px] leading-none text-[var(--text-muted)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer">ⓘ</button>
      {aberto && (
        <span id={id} role="tooltip" style={{ position: "fixed", ...pos, width: 288 }}
          className="z-50 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-3 text-left text-xs text-[var(--text-secondary)] space-y-1.5 pointer-events-none">
          {linhas.map((l) => <span key={l.titulo} className="block"><span className="font-semibold text-[var(--text-primary)]">{l.titulo}: </span>{l.texto}</span>)}
        </span>
      )}
    </span>
  );
}
