"use client";

import { useEffect, useRef, useState } from "react";
import { NIVEIS, avaliaSaude, tempoDesde, type Nivel, type Saude } from "@/lib/radiografia";
import { interpretaCron } from "@/lib/cron";
import type { AutomacaoApiItem } from "@/lib/biblioteca";
import { fonteCarregou } from "@/lib/flow/medida";

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

/**
 * As peças do diagrama têm o tamanho do texto. Quando a fonte do desenho (Kalam) termina de carregar,
 * as medidas antigas (feitas com a fonte reserva) deixam de valer: este número sobe e quem usa remede.
 */
export function useFontes() {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let vivo = true;
    const familia = getComputedStyle(document.body).getPropertyValue("--font-kalam").trim();
    const avisa = () => { if (vivo) setV(fonteCarregou()); };
    if (familia) document.fonts.load(`600 13px ${familia}`).then(avisa).catch(() => {});
    document.fonts.ready.then(avisa).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return v;
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
            title={`tecla ${n.n}`}
            className="rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 text-left cursor-pointer transition-colors min-w-0"
            style={{
              border: `${ativo ? 2 : 1}px solid ${ativo ? cor : "var(--border)"}`,
              background: ativo ? `color-mix(in srgb, ${cor} 11%, var(--bg-secondary))` : "var(--bg-secondary)",
            }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cor }} aria-hidden />
              <span className={`min-w-0 text-[12px] sm:text-[15px] leading-tight ${ativo ? "font-semibold" : "font-medium"} text-[var(--text-primary)]`}>
                <span className="text-[var(--text-muted)] font-normal">Nível {n.n} · </span>{NOME_NIVEL[n.n]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
export { BOLA_NIVEL };


export interface Bolinha {
  id: string;
  titulo: string;
  /** (v3.3) a lista mostra só o título; a descrição abre na caixinha lateral */
  frase?: string;
  codigo?: string;
  /** (v3.4) sem número: o grupo não é uma sequência, é um conjunto de rotinas */
  semNumero?: boolean;
  /** (v3.5) situação da rotina: bolinha + frase do tooltip (null = sem relógio, roda quando chamado) */
  situacao?: { saude: Saude | null; frase: string };
}

export const COR_SAUDE: Record<Saude, string> = {
  ok: "var(--success)",
  atrasada: "var(--warning)",
  muda: "var(--danger)",
  desconhecida: "var(--text-muted)",
};

/** Saúde de um fluxo a partir da automação do relógio (null = sem relógio). */
export function saudeDaAutomacao(a: AutomacaoApiItem | null): Saude | null {
  const cron = a ? interpretaCron(a.agenda) : null;
  return a && cron ? avaliaSaude(a.ultima_execucao, cron.frequenciaMin) : null;
}

/** Frase da bolinha: "Rodou há 2h, tudo certo." */
export function fraseSaude(a: AutomacaoApiItem | null): string {
  const s = saudeDaAutomacao(a);
  if (!s || !a) return "Sem relógio: este fluxo roda só quando alguém (ou um evento) o chama.";
  if (s === "desconhecida") return "Tem horário marcado, mas não dá para saber quando rodou pela última vez.";
  const quando = tempoDesde(a.ultima_execucao);
  const marcado = interpretaCron(a.agenda)?.descricao;
  const horario = marcado ? ` (horário marcado: ${marcado})` : "";
  if (s === "ok") return `Rodou ${quando}, tudo certo.`;
  if (s === "atrasada") return `Rodou ${quando}: está atrasado${horario}.`;
  return `Parou: o último sinal de vida foi ${quando}${horario}.`;
}

export function BolinhaSituacao({ saude, frase }: { saude: Saude | null; frase: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0 align-middle" title={frase} aria-label={frase} style={saude ? { background: COR_SAUDE[saude] } : { border: "1.5px solid var(--text-muted)" }} />;
}

/** Legenda discreta, numa linha só */
export function LegendaSituacao() {
  const b = (k: Saude) => <span className="inline-block w-2 h-2 rounded-full align-baseline" style={{ background: COR_SAUDE[k] }} />;
  return (
    <p className="text-[11px] text-[var(--text-muted)] flex flex-wrap gap-x-2 gap-y-0.5 items-center" aria-label="Legenda das bolinhas">
      <span>{b("ok")} no ar</span>·<span>{b("atrasada")} atrasado</span>·<span>{b("muda")} parou</span>·
      <span><span className="inline-block w-2 h-2 rounded-full align-baseline" style={{ border: "1.5px solid var(--text-muted)" }} /> roda quando chamado</span>
    </p>
  );
}

/** "🧭 O processo do início ao fim": recolhível, aberto por padrão. */
export function BlocoProcesso({ comeca, termina, bolinhas, selecionada, onEscolher, titulo = "O processo do início ao fim", rotuloComeca = "Começa:", rotuloTermina = "Termina:" }: {
  /** sem `comeca`/`termina` (página do grupo) só a lista numerada aparece */
  comeca?: string;
  termina?: string;
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
          {comeca !== undefined && termina !== undefined && <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, #3E9B63 12%, var(--bg-secondary))", border: "1px solid color-mix(in srgb, #3E9B63 35%, transparent)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2F7A4C" }}>{rotuloComeca}</p>
              <p className="mt-0.5">{comeca}</p>
            </div>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, #C4493F 10%, var(--bg-secondary))", border: "1px solid color-mix(in srgb, #C4493F 32%, transparent)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A83A31" }}>{rotuloTermina}</p>
              <p className="mt-0.5">{termina}</p>
            </div>
          </div>}
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
                    <span className="shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center text-white mt-0.5" style={{ background: "var(--accent, #2D6B6B)" }}>{b.semNumero ? "•" : i + 1}</span>
                    <span className="min-w-0 text-sm leading-snug">
                      {(() => {
                        const i = b.titulo.lastIndexOf(" ");
                        return (
                          <strong className="font-semibold">
                            {i > 0 ? b.titulo.slice(0, i + 1) : ""}
                            <span className="whitespace-nowrap">{i > 0 ? b.titulo.slice(i + 1) : b.titulo}{b.situacao && <span className="ml-2"><BolinhaSituacao saude={b.situacao.saude} frase={b.situacao.frase} /></span>}</span>
                          </strong>
                        );
                      })()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {bolinhas.some((b) => b.situacao) && <LegendaSituacao />}
        </div>
      )}
    </section>
  );
}
