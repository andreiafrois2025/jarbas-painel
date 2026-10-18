"use client";

import { useEffect, useRef, useState } from "react";
import { NIVEIS, type Nivel } from "@/lib/radiografia";

// Peças compartilhadas pela página do fluxo e pela página do grupo (mesma estrutura nas duas).

/** Largura e altura atuais de uma caixa (0 até a primeira medida). */
export function useMedida<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [m, setM] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setM((a) => (a.w === el.clientWidth && a.h === el.clientHeight ? a : { w: el.clientWidth, h: el.clientHeight }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, m] as const;
}

const COR_NIVEL: Record<Nivel, string> = { 1: "#3E9B63", 2: "#D4A017", 3: "#C4493F" };
const BOLA_NIVEL: Record<Nivel, string> = { 1: "🟢", 2: "🟡", 3: "🔴" };
const NOME_NIVEL: Record<Nivel, string> = { 1: "Leigo", 2: "Intermediário", 3: "Código" };

/** Os 3 botões grandes. As cores verde/amarelo/vermelho aparecem só na bolinha e na borda suave. */
export function BotoesNivel({ nivel, onMuda }: { nivel: Nivel; onMuda: (n: Nivel) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="tablist" aria-label="Nível de leitura">
      {NIVEIS.map((n) => {
        const ativo = nivel === n.n;
        const cor = COR_NIVEL[n.n];
        return (
          <button
            key={n.n}
            role="tab"
            aria-selected={ativo}
            onClick={() => onMuda(n.n)}
            title={`${n.dica} (tecla ${n.n})`}
            className="rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 text-left cursor-pointer transition-colors min-w-0"
            style={{
              border: `${ativo ? 2 : 1}px solid ${ativo ? cor : "var(--border)"}`,
              background: ativo ? `color-mix(in srgb, ${cor} 11%, var(--bg-secondary))` : "var(--bg-secondary)",
            }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cor }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[11px] text-[var(--text-muted)] leading-none">Nível {n.n}</span>
                <span className={`block text-[12px] sm:text-[15px] leading-tight mt-0.5 ${ativo ? "font-semibold" : "font-medium"} text-[var(--text-primary)]`}>{NOME_NIVEL[n.n]}</span>
              </span>
            </span>
            <span className="hidden lg:block text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">{n.dica}</span>
          </button>
        );
      })}
    </div>
  );
}
export { BOLA_NIVEL };

/** corta o texto em N linhas (o texto inteiro fica no tooltip) */
const CLAMP = (n: number): React.CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });

export interface Bolinha {
  id: string;
  titulo: string;
  frase?: string;
  /** linha em fonte de código (nível 3) */
  codigo?: string;
}

/** "▶ Começa em: …" */
export function FaixaComeca({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg px-3 py-2 text-sm flex gap-2 items-start" style={{ background: "var(--accent-soft, rgba(45,107,107,0.10))" }}>
      <span className="shrink-0" style={{ color: "var(--accent, #2D6B6B)" }}>▶</span>
      <p className="min-w-0" title={texto} style={CLAMP(2)}><strong className="font-semibold">Começa em:</strong> <span className="text-[var(--text-secondary)]">{texto}</span></p>
    </div>
  );
}

/** "🧭 O processo do início ao fim": recolhível, aberto por padrão. */
export function BlocoProcesso({ comeca, termina, bolinhas, selecionada, onEscolher, titulo = "O processo do início ao fim", rotuloComeca = "Começa:", rotuloTermina = "Termina:" }: {
  comeca: string;
  termina: string;
  bolinhas: Bolinha[];
  selecionada?: string | null;
  onEscolher: (id: string) => void;
  titulo?: string;
  rotuloComeca?: string;
  rotuloTermina?: string;
}) {
  const [aberto, setAberto] = useState(true);
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left cursor-pointer"
      >
        <span className="text-sm font-semibold flex-1">🧭 {titulo}</span>
        <span className="text-xs text-[var(--text-muted)]">{aberto ? "recolher ▴" : "mostrar ▾"}</span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, #3E9B63 12%, var(--bg-secondary))", border: "1px solid color-mix(in srgb, #3E9B63 35%, transparent)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2F7A4C" }}>{rotuloComeca}</p>
              <p className="mt-0.5" title={comeca} style={CLAMP(3)}>{comeca}</p>
            </div>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, #C4493F 10%, var(--bg-secondary))", border: "1px solid color-mix(in srgb, #C4493F 32%, transparent)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A83A31" }}>{rotuloTermina}</p>
              <p className="mt-0.5" title={termina} style={CLAMP(3)}>{termina}</p>
            </div>
          </div>
          <ol className="grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {bolinhas.map((b, i) => {
              const sel = selecionada === b.id;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => onEscolher(b.id)}
                    className="w-full text-left flex gap-2.5 items-start rounded-lg px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                    style={sel ? { background: "var(--accent-soft, rgba(45,107,107,0.12))", outline: "1.5px solid var(--accent, #2D6B6B)" } : undefined}
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center text-white mt-0.5" style={{ background: "var(--accent, #2D6B6B)" }}>{i + 1}</span>
                    <span className="min-w-0 text-sm leading-snug" style={CLAMP(3)} title={`${b.titulo}${b.frase ? " — " + b.frase : ""}`}>
                      <strong className="font-semibold">{b.titulo}</strong>
                      {b.frase && <span className="text-[var(--text-secondary)]"> — {b.frase}</span>}
                      {b.codigo && <span className="block font-mono text-[11px] text-[var(--text-muted)] break-all mt-0.5">{b.codigo}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
