"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// =============================================================
// Peças compartilhadas do painel (F4, 25/07/2026).
//
// Antes cada tela reimplementava as mesmas coisas: 5 barras de abas, 19
// janelinhas e 27 cards, todos copiados. Consequência prática: melhorar uma
// janelinha exigia melhorar 19, e alguma sempre ficava pra trás — foi assim que
// só 3 das 19 fechavam no Esc.
//
// A partir daqui, cada peça existe UMA vez.
// =============================================================

// ── Abas ────────────────────────────────────────────────────────────────
export function Abas<T extends string>({ titulo, valor, onMuda, opcoes, direita }: {
  titulo?: string;
  valor: T;
  onMuda: (v: T) => void;
  opcoes: { id: T; rotulo: string }[];
  direita?: ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
      {titulo && <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3 whitespace-nowrap">{titulo}</h1>}
      {opcoes.map((o) => (
        <button
          key={o.id}
          onClick={() => onMuda(o.id)}
          aria-current={valor === o.id ? "page" : undefined}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            valor === o.id
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
      {direita && <><div className="flex-1" />{direita}</>}
    </div>
  );
}

// ── Janelinha (modal) ───────────────────────────────────────────────────
// Uma só, com o que as 19 anteriores não tinham: fecha no Esc, prende o teclado
// dentro dela, e trava a rolagem do fundo.
export function Janela({ titulo, subtitulo, onFechar, largura = "media", children, rodape }: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  onFechar: () => void;
  largura?: "estreita" | "media" | "larga";
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onFechar(); return; }
      if (e.key !== "Tab" || !caixa.current) return;
      // Prende o Tab dentro da janela: sem isso ele continua andando pelo que
      // está atrás, o que embaralha quem navega por teclado.
      const focaveis = caixa.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focaveis.length) return;
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", aoTeclar);
    caixa.current?.querySelector<HTMLElement>("button, input, a[href]")?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [onFechar]);

  const larguras = { estreita: "max-w-md", media: "max-w-2xl", larga: "max-w-4xl" };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onFechar}
      role="presentation"
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        className={`bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] w-full ${larguras[largura]} max-h-[88vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">{titulo}</p>
            {subtitulo && <p className="text-xs text-[var(--text-muted)]">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar (Esc)"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
        {rodape && <div className="p-4 border-t border-[var(--border)] shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}

// ── Botões ──────────────────────────────────────────────────────────────
export function Botao({ children, onClick, tipo = "principal", disabled, className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "principal" | "secundario" | "perigo";
  disabled?: boolean;
  className?: string;
}) {
  const estilos = {
    principal: "text-white hover:opacity-90",
    secundario: "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
    perigo: "text-white hover:opacity-90",
  };
  const fundo = tipo === "principal" ? "var(--accent, #2D6B6B)" : tipo === "perigo" ? "#A83A2B" : undefined;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-sm px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50 ${estilos[tipo]} ${className}`}
      style={fundo ? { background: fundo } : undefined}
    >
      {children}
    </button>
  );
}

// ── Confirmação e desfazer ──────────────────────────────────────────────
// Substitui as 24 caixas cinzas do navegador. Duas diferenças que importam:
// diz o NOME do que vai ser apagado, e o que for destrutivo ganha 5 segundos
// de arrependimento em vez de sumir na hora.
interface PedidoConfirmacao {
  titulo: string;
  descricao?: string;
  acao?: string;
  destrutivo?: boolean;
  resolver: (ok: boolean) => void;
}

interface Aviso {
  id: number;
  texto: string;
  desfazer?: () => void;
}

const Ctx = createContext<{
  confirmar: (p: Omit<PedidoConfirmacao, "resolver">) => Promise<boolean>;
  avisar: (texto: string) => void;
  comDesfazer: (texto: string, acao: () => void | Promise<void>) => void;
} | null>(null);

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI precisa estar dentro de <ProvedorUI>");
  return c;
}

export function ProvedorUI({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const seq = useRef(0);

  const confirmar = useCallback((p: Omit<PedidoConfirmacao, "resolver">) =>
    new Promise<boolean>((resolver) => setPedido({ ...p, resolver })), []);

  const avisar = useCallback((texto: string) => {
    const id = ++seq.current;
    setAvisos((a) => [...a, { id, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4000);
  }, []);

  /** Executa a ação só depois de 5s, dando janela real de arrependimento. */
  const comDesfazer = useCallback((texto: string, acao: () => void | Promise<void>) => {
    const id = ++seq.current;
    let cancelado = false;
    const t = setTimeout(() => {
      setAvisos((a) => a.filter((x) => x.id !== id));
      if (!cancelado) Promise.resolve(acao()).catch((e) => console.error("ação adiada falhou:", e));
    }, 5000);
    setAvisos((a) => [...a, {
      id, texto,
      desfazer: () => { cancelado = true; clearTimeout(t); setAvisos((b) => b.filter((x) => x.id !== id)); },
    }]);
  }, []);

  const responder = (ok: boolean) => { pedido?.resolver(ok); setPedido(null); };

  return (
    <Ctx.Provider value={{ confirmar, avisar, comDesfazer }}>
      {children}

      {pedido && (
        <Janela
          titulo={pedido.titulo}
          onFechar={() => responder(false)}
          largura="estreita"
          rodape={
            <div className="flex gap-2 justify-end">
              <Botao tipo="secundario" onClick={() => responder(false)}>Cancelar</Botao>
              <Botao tipo={pedido.destrutivo ? "perigo" : "principal"} onClick={() => responder(true)}>
                {pedido.acao || "Confirmar"}
              </Botao>
            </div>
          }
        >
          <p className="text-sm text-[var(--text-secondary)]">
            {pedido.descricao || "Essa ação não pode ser desfeita."}
          </p>
        </Janela>
      )}

      {avisos.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center">
          {avisos.map((a) => (
            <div
              key={a.id}
              role="status"
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-3 text-sm"
            >
              <span className="text-[var(--text-primary)]">{a.texto}</span>
              {a.desfazer && (
                <button
                  onClick={a.desfazer}
                  className="font-semibold underline cursor-pointer whitespace-nowrap"
                  style={{ color: "var(--accent, #2D6B6B)" }}
                >
                  Desfazer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}

// ── Estados de tela ─────────────────────────────────────────────────────
export function Vazio({ icone = "🗒️", titulo, descricao, acao }: {
  icone?: string; titulo: string; descricao?: string; acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="text-3xl">{icone}</span>
      <p className="font-semibold text-[var(--text-primary)]">{titulo}</p>
      {descricao && <p className="text-sm text-[var(--text-secondary)] max-w-md">{descricao}</p>}
      {acao}
    </div>
  );
}

/** Barra cinza que ocupa o lugar do conteúdo enquanto ele não chega. */
export function Barra({ w = "100%", h = 14, className = "" }: { w?: string; h?: number; className?: string }) {
  return (
    <span
      className={`block rounded animate-pulse ${className}`}
      style={{ width: w, height: h, background: "var(--bg-tertiary, #EDE8E1)" }}
    />
  );
}

export function Cartao({ children, className = "", onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}) {
  const base = "bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-4";
  if (!onClick) return <div className={`${base} ${className}`}>{children}</div>;
  return (
    <button onClick={onClick} className={`${base} text-left w-full hover:border-[var(--accent,#2D6B6B)] transition-colors cursor-pointer ${className}`}>
      {children}
    </button>
  );
}
