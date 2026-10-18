"use client";

import { Fragment, type ReactNode } from "react";

// Leitor de Markdown simples (sem dependência e sem HTML cru: tudo vira elemento
// React, então um texto malicioso num documento não executa nada).
// Cobre o que as peças da licitação usam: títulos, listas, tabelas, negrito,
// código, citação e linha. Os marcadores [CONFIRMAR] / [a confirmar] ganham
// destaque, porque são justamente o que ela precisa resolver ao revisar.

const PADRAO_INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[(?:CONFIRMAR|a confirmar)[^\]]*\])/gi;

function inline(texto: string): ReactNode[] {
  return texto.split(PADRAO_INLINE).filter((p) => p !== "").map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) {
      return <code key={i} className="px-1 rounded bg-[var(--bg-tertiary)] text-[0.9em]">{p.slice(1, -1)}</code>;
    }
    if (/^\[(?:CONFIRMAR|a confirmar)/i.test(p)) {
      return <mark key={i} className="px-1 rounded bg-[#C4A460]/30 text-[var(--text-primary)]">{p}</mark>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

const ehTabela = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const celulas = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export default function MarkdownLeve({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < linhas.length) {
    const l = linhas[i];

    if (l.trim() === "") { i++; continue; }

    const t = l.match(/^(#{1,4})\s+(.*)$/);
    if (t) {
      const nivel = t[1].length;
      const cls = nivel === 1 ? "text-xl font-bold mt-4 mb-2"
        : nivel === 2 ? "text-lg font-semibold mt-4 mb-2"
        : "text-base font-semibold mt-3 mb-1";
      blocos.push(<div key={k++} className={cls} role="heading" aria-level={nivel}>{inline(t[2])}</div>);
      i++; continue;
    }

    if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) {
      blocos.push(<hr key={k++} className="my-3 border-[var(--border)]" />);
      i++; continue;
    }

    if (ehTabela(l) && i + 1 < linhas.length && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1])) {
      const cab = celulas(l);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && ehTabela(linhas[i])) { corpo.push(celulas(linhas[i])); i++; }
      blocos.push(
        <div key={k++} className="overflow-x-auto my-2">
          <table className="text-sm border-collapse">
            <thead>
              <tr>{cab.map((c, j) => <th key={j} className="border border-[var(--border)] px-2 py-1 text-left bg-[var(--bg-tertiary)]">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {corpo.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="border border-[var(--border)] px-2 py-1 align-top">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\s*([-*]|\d+[.)])\s+/.test(l)) {
      const ordenada = /^\s*\d+[.)]\s+/.test(l);
      const itens: string[] = [];
      while (i < linhas.length && /^\s*([-*]|\d+[.)])\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^\s*([-*]|\d+[.)])\s+/, ""));
        i++;
      }
      const Lista = ordenada ? "ol" : "ul";
      blocos.push(
        <Lista key={k++} className={`my-2 pl-6 space-y-0.5 ${ordenada ? "list-decimal" : "list-disc"}`}>
          {itens.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </Lista>
      );
      continue;
    }

    if (l.startsWith(">")) {
      const citado: string[] = [];
      while (i < linhas.length && linhas[i].startsWith(">")) { citado.push(linhas[i].replace(/^>\s?/, "")); i++; }
      blocos.push(
        <blockquote key={k++} className="my-2 border-l-4 border-[var(--accent)] pl-3 text-[var(--text-secondary)]">
          {inline(citado.join(" "))}
        </blockquote>
      );
      continue;
    }

    // parágrafo: junta linhas seguidas até uma linha em branco ou outro bloco
    const par: string[] = [];
    while (
      i < linhas.length && linhas[i].trim() !== "" && !/^(#{1,4})\s+/.test(linhas[i]) &&
      !/^\s*([-*]|\d+[.)])\s+/.test(linhas[i]) && !ehTabela(linhas[i]) && !linhas[i].startsWith(">")
    ) { par.push(linhas[i]); i++; }
    if (par.length === 0) { i++; continue; }
    blocos.push(<p key={k++} className="my-2 leading-relaxed">{inline(par.join(" "))}</p>);
  }

  return <div className="text-sm text-[var(--text-primary)] break-words">{blocos}</div>;
}
