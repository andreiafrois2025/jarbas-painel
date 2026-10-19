"use client";

// Modo obra (O1) no chat do Jarbas: botão para ligar com o código do Telegram, selo com o tempo que resta,
// e o cartão de arquivo que a tarefa gerou. Quem decide o que pode ou não é o servidor (guarda.py), não esta tela.

import { useEffect, useRef, useState } from "react";
import { obraApi, type ArquivoObra, type EstadoObra } from "@/lib/chat";

export function tempoRestante(iso: string | null, agora: number): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - agora;
  if (ms <= 0) return "0min";
  const min = Math.ceil(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min}min`;
}

export function tamanhoLegivel(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1).replace(".", ",")} MB`;
}

/** Selo "obra ligada" (com desligar) ou botão "Modo obra" (abre o campo do código). */
export function ControleObra({ estado, agora, ocupado, aoMudar }: {
  estado: EstadoObra | null; agora: number; ocupado: boolean; aoMudar: (e: EstadoObra) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [desligando, setDesligando] = useState(false);
  if (!estado || !estado.permitido) return null;
  if (estado.ligado) {
    const pertoDoFim = estado.tarefas_hoje >= 25;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${pertoDoFim ? "border-[var(--warning)] bg-[var(--warning)]/15" : "border-[var(--ac)]/50 bg-[var(--accent-soft)]"} text-[var(--text-primary)]`}
        role="status" title="O modo obra deixa o Jarbas rodar habilidades e gerar arquivos. Desliga sozinho quando o tempo acaba.">
        <span aria-hidden>🔨</span>
        <span>obra ligada · {tempoRestante(estado.expira_em, agora)} · {estado.tarefas_hoje}/{estado.limite} hoje</span>
        <button type="button" disabled={ocupado || desligando}
          onClick={async () => { setDesligando(true); try { aoMudar(await obraApi.desligar()); } catch { /* o selo continua; tente de novo */ } setDesligando(false); }}
          className="ml-0.5 rounded-full px-2 py-0.5 text-[11px] border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 cursor-pointer"
          aria-label="Desligar o modo obra">{desligando ? "…" : "desligar"}</button>
      </span>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
        title="Libera as mãos do Jarbas por 2 horas, com um código que chega no seu Telegram">
        <span aria-hidden>🔨</span> Modo obra
      </button>
      {aberto && <JanelaCodigo aoFechar={() => setAberto(false)} aoLigar={(e) => { aoMudar(e); setAberto(false); }} />}
    </>
  );
}

function JanelaCodigo({ aoFechar, aoLigar }: { aoFechar: () => void; aoLigar: (e: EstadoObra) => void }) {
  const [fase, setFase] = useState<"pedindo" | "digitar">("pedindo");
  const [digitos, setDigitos] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const iniciou = useRef(false);

  const pedir = async () => {
    setErro(""); setFase("pedindo");
    try { await obraApi.pedirCodigo(); setFase("digitar"); setEspera(30); setDigitos(""); requestAnimationFrame(() => campo.current?.focus()); }
    catch (e) { setErro((e as Error).message); setFase("digitar"); }
  };
  useEffect(() => { if (!iniciou.current) { iniciou.current = true; void pedir(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (espera <= 0) return; const t = setTimeout(() => setEspera((x) => x - 1), 1000); return () => clearTimeout(t); }, [espera]);
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [aoFechar]);

  const confirmar = async () => {
    if (digitos.length !== 6 || enviando) return;
    setEnviando(true); setErro("");
    try { aoLigar(await obraApi.ativar(digitos)); }
    catch (e) { setErro((e as Error).message); setDigitos(""); requestAnimationFrame(() => campo.current?.focus()); }
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-obra" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-[0_18px_48px_var(--sombra)]">
        <h2 id="titulo-obra" className="m-0 text-lg font-bold text-[var(--text-primary)]">🔨 Ligar o modo obra</h2>
        <p className="mt-2 mb-4 text-sm text-[var(--text-secondary)] leading-snug">
          {fase === "pedindo" ? "Mandando o código para o seu Telegram…" : <>Mandei um código no seu Telegram. Digite os 6 números abaixo. Ele vale 5 minutos e o modo obra fica ligado por 2 horas.</>}
        </p>
        <input ref={campo} value={digitos} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} disabled={fase === "pedindo" || enviando}
          onChange={(e) => setDigitos(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") void confirmar(); }}
          aria-label="Código de 6 números" placeholder="000000"
          className="w-full text-center tracking-[0.45em] text-3xl font-bold rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] py-3 focus:outline-none focus:border-[var(--ac)] disabled:opacity-50" />
        {erro && <p role="alert" className="mt-3 mb-0 text-sm text-[var(--danger)]">{erro}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
          <button type="button" onClick={pedir} disabled={fase === "pedindo" || espera > 0 || enviando}
            className="text-sm underline underline-offset-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:no-underline cursor-pointer">
            {espera > 0 ? `reenviar em ${espera}s` : "reenviar o código"}
          </button>
          <span className="flex gap-2">
            <button type="button" onClick={aoFechar} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer">Cancelar</button>
            <button type="button" onClick={confirmar} disabled={digitos.length !== 6 || enviando}
              className="rounded-lg bg-[var(--ac)] text-[var(--on-ac)] px-4 py-2 text-sm font-bold disabled:opacity-50 cursor-pointer">{enviando ? "Conferindo…" : "Ligar"}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Cartão de arquivo gerado na obra: nome, tamanho e botão baixar; imagem aparece em miniatura. */
export function CartaoArquivoObra({ f }: { f: ArquivoObra }) {
  const [verUrl, setVerUrl] = useState("");
  const [baixarUrl, setBaixarUrl] = useState("");
  useEffect(() => {
    let vivo = true;
    if (f.tipo === "imagem") obraApi.urlArquivo(f.url).then((u) => vivo && setVerUrl(u)).catch(() => {});
    obraApi.urlArquivo(f.url, true).then((u) => vivo && setBaixarUrl(u)).catch(() => {});
    return () => { vivo = false; };
  }, [f.url, f.tipo]);
  const icone = f.tipo === "imagem" ? "🖼️" : f.tipo === "pdf" ? "📕" : /\.(zip|rar|7z)$/i.test(f.nome) ? "🗜️" : /\.(docx?|odt)$/i.test(f.nome) ? "📄" : /\.(xlsx?|csv)$/i.test(f.nome) ? "📊" : /\.html?$/i.test(f.nome) ? "🌐" : "📎";
  return (
    <div className="mt-2 flex items-stretch gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 max-w-full">
      {f.tipo === "imagem" && verUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <a href={verUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={verUrl} alt={f.nome} className="h-20 w-28 object-cover rounded-lg border border-[var(--border)] bg-white" /></a>
        : <span aria-hidden className="shrink-0 h-14 w-14 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-2xl">{icone}</span>}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="m-0 text-sm font-bold text-[var(--text-primary)] break-all leading-tight">{f.nome}</p>
        <p className="m-0 text-xs text-[var(--text-secondary)] mt-0.5">{tamanhoLegivel(f.tamanho)}</p>
      </div>
      {baixarUrl && <a href={baixarUrl} download={f.nome} className="self-center shrink-0 rounded-lg bg-[var(--ac)] text-[var(--on-ac)] px-3 py-2 text-sm font-bold no-underline hover:brightness-95">Baixar</a>}
    </div>
  );
}
