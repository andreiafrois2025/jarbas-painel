"use client";

import { useEffect, useRef, useState } from "react";

// Puxar para atualizar no celular: o iPhone não faz isso sozinho com o painel instalado como app.
// Só começa quando o dedo desce com a área tocada já no topo (sem rolagem para cima).
const LIMITE = 80;

function rolavelAcima(el: Element | null): boolean {
  while (el && el !== document.body) {
    const st = getComputedStyle(el);
    if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return window.scrollY > 0;
}

export default function PuxarAtualizar() {
  const [puxado, setPuxado] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicio = useRef<number | null>(null);
  const valor = useRef(0);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const toque = (e: TouchEvent) => {
      const alvo = e.target as Element;
      if (e.touches.length !== 1 || alvo.closest("textarea, input, [contenteditable], [data-sem-puxar]") || rolavelAcima(alvo)) { inicio.current = null; return; }
      inicio.current = e.touches[0].clientY;
    };
    const mover = (e: TouchEvent) => {
      if (inicio.current === null) return;
      const d = e.touches[0].clientY - inicio.current;
      valor.current = d > 0 ? Math.min(d * 0.5, LIMITE * 1.4) : 0;
      setPuxado(valor.current);
    };
    const soltar = () => {
      if (inicio.current !== null && valor.current >= LIMITE) {
        setAtualizando(true);
        window.location.reload();
      } else setPuxado(0);
      inicio.current = null; valor.current = 0;
    };
    document.addEventListener("touchstart", toque, { passive: true });
    document.addEventListener("touchmove", mover, { passive: true });
    document.addEventListener("touchend", soltar);
    document.addEventListener("touchcancel", soltar);
    return () => {
      document.removeEventListener("touchstart", toque);
      document.removeEventListener("touchmove", mover);
      document.removeEventListener("touchend", soltar);
      document.removeEventListener("touchcancel", soltar);
    };
  }, []);

  if (!puxado && !atualizando) return null;
  const pronto = atualizando || puxado >= LIMITE;
  return (
    <div aria-live="polite" className="md:hidden fixed left-1/2 z-[60] -translate-x-1/2 pointer-events-none"
      style={{ top: `calc(env(safe-area-inset-top, 0px) + ${atualizando ? 56 : Math.max(puxado - 20, 0)}px)`, opacity: atualizando ? 1 : Math.min(puxado / LIMITE, 1) }}>
      <div className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold shadow-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
        <span className={atualizando ? "animate-spin inline-block" : "inline-block transition-transform"} style={atualizando ? undefined : { transform: `rotate(${puxado * 3}deg)` }}>↻</span>
        {atualizando ? "Atualizando…" : pronto ? "Solte para atualizar" : "Puxe para atualizar"}
      </div>
    </div>
  );
}
