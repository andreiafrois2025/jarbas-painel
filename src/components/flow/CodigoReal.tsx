"use client";

import { useState } from "react";
import { copy } from "./FlowExport";

// =============================================
// O trecho de código de verdade (nível 3 do Mapa, v3.2): arquivo:linhas, o código com números de linha
// e realce de sintaxe simples (sem biblioteca), e a explicação técnica do que acontece ali.
// O trecho vem de data.codigo (gravado pelo curador: lido LITERALMENTE do arquivo, segredos em <REDIGIDO>).
// =============================================

type Tok = { t: "c" | "s" | "k" | "n" | "f" | "r" | "y" | "x"; v: string };

const PALAVRAS: Record<string, string> = {
  python: "def class import from return if elif else for while try except finally with as in not and or is None True False lambda raise pass continue break yield global async await del assert",
  bash: "if then fi else elif for do done while case esac function in echo exit return export local set unset source cd read shift",
  javascript: "const let var function return if else for while await async new try catch finally throw class import from export default switch case break continue typeof of in null true false undefined",
  typescript: "const let var function return if else for while await async new try catch finally throw class import from export default switch case break continue typeof of in null true false undefined interface type",
};

const COR: Record<Tok["t"], string> = {
  c: "#7B8A84",   // comentário
  s: "#2D6B6B",   // texto entre aspas
  k: "#A0583C",   // palavra-chave
  n: "#8A6D1F",   // número
  f: "#5B4A9E",   // função chamada
  r: "#C4493F",   // segredo ocultado
  y: "#2D6B6B",   // chave de yaml
  x: "inherit",
};

/** Quebra UMA linha em pedaços coloridos (simples de propósito: comentário, texto, número, palavra-chave, função). */
export function realcaLinha(linha: string, lang: string): Tok[] {
  const out: Tok[] = [];
  const comentario = lang === "javascript" || lang === "typescript" ? "//" : "#";
  const kw = new Set((PALAVRAS[lang] || "").split(" "));
  let resto = linha;
  if (lang === "yaml") {
    const m = linha.match(/^(\s*-?\s*)([\w.\-]+)(:)(.*)$/);
    if (m && !m[2].startsWith("#")) {
      out.push({ t: "x", v: m[1] }, { t: "y", v: m[2] + m[3] });
      resto = m[4];
    }
  }
  const re = /(<REDIGIDO>)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_][\w]*)(\s*\()?|(\d+(?:\.\d+)?)|(#.*|\/\/.*)|(\s+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(resto))) {
    if (m[1]) out.push({ t: "r", v: m[1] });
    else if (m[2]) out.push({ t: "s", v: m[2] });
    else if (m[3]) {
      const palavra = m[3];
      if (kw.has(palavra)) out.push({ t: "k", v: palavra }, ...(m[4] ? [{ t: "x" as const, v: m[4] }] : []));
      else if (m[4]) out.push({ t: "f", v: palavra }, { t: "x", v: m[4] });
      else out.push({ t: "x", v: palavra });
    } else if (m[5]) out.push({ t: "n", v: m[5] });
    else if (m[6]) {
      // "#..." é comentário em python/bash/yaml; "//..." em javascript. No resto (ex.: divisão "//" em python) é só texto.
      out.push({ t: m[6].startsWith(comentario) ? "c" : "x", v: m[6] });
    } else out.push({ t: "x", v: m[7] });
  }
  return out;
}

export function primeiraLinhaDe(linhas?: string): number {
  const n = parseInt((linhas || "1").split("-")[0], 10);
  return Number.isFinite(n) ? n : 1;
}

export function nomeCurto(arquivo?: string): string {
  return (arquivo || "").split("/").pop() || "";
}

export default function CodigoReal({ codigo, avisar }: {
  codigo: { arquivo?: string; linhas?: string; linguagem?: string; trecho: string; explicacao_tecnica?: string };
  avisar?: (m: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const lang = codigo.linguagem || "text";
  const inicio = primeiraLinhaDe(codigo.linhas);
  const linhas = codigo.trecho.split("\n");
  const ref = `${codigo.arquivo || ""}${codigo.linhas ? `:${codigo.linhas}` : ""}`;
  return (
    <div>
      <button
        onClick={async () => { await copy(ref); setCopiado(true); avisar?.("Arquivo e linhas copiados."); setTimeout(() => setCopiado(false), 1500); }}
        title="Copiar arquivo:linhas"
        className="w-full text-left font-mono text-[11px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-t px-2 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer break-all"
      >
        📄 {nomeCurto(codigo.arquivo)}<span className="text-[var(--text-muted)]">:{codigo.linhas}</span>
        <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{codigo.arquivo} · {copiado ? "copiado ✓" : "copiar"}</span>
      </button>
      <pre
        className="font-mono text-[11px] leading-[1.45] text-[var(--text-primary)] rounded-b border border-t-0 border-[var(--border)] overflow-auto max-h-80 py-1.5"
        style={{ background: "#FBF8F3", tabSize: 4 }}
        aria-label={`Trecho de código de ${ref}`}
      >
        <code>
          {linhas.map((l, i) => (
            <span key={i} className="flex">
              <span className="select-none shrink-0 w-9 pr-2 text-right text-[var(--text-muted)] opacity-70">{inicio + i}</span>
              <span className="whitespace-pre pr-3">
                {realcaLinha(l, lang).map((t, k) => (t.t === "x" ? t.v : <span key={k} style={{ color: COR[t.t], fontStyle: t.t === "c" ? "italic" : undefined, fontWeight: t.t === "k" || t.t === "r" ? 600 : undefined }}>{t.v}</span>))}
                {l === "" && " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
      {codigo.explicacao_tecnica && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">O que acontece aqui (técnico)</p>
          <p className="text-xs leading-relaxed text-[var(--text-primary)]">{codigo.explicacao_tecnica}</p>
        </div>
      )}
    </div>
  );
}
