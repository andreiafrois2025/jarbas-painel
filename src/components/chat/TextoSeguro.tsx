"use client";

// Markdown mínimo (títulos, listas, negrito, código) desenhado como NÓS DO REACT.
// Nunca usa dangerouslySetInnerHTML: o que vier do modelo é só texto.

import { Fragment, type ReactNode } from "react";

function inline(s: string, chave: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /(\*\*[^*]+\*\*|`[^`]+`)/g; let ult = 0; let m: RegExpExecArray | null; let n = 0;
  while ((m = re.exec(s))) {
    if (m.index > ult) out.push(s.slice(ult, m.index));
    const t = m[0];
    out.push(t.startsWith("**")
      ? <strong key={`${chave}-${n++}`}>{t.slice(2, -2)}</strong>
      : <code key={`${chave}-${n++}`} className="px-1 rounded bg-[var(--bg-tertiary)] text-[0.9em]">{t.slice(1, -1)}</code>);
    ult = m.index + t.length;
  }
  if (ult < s.length) out.push(s.slice(ult));
  return out;
}

export default function TextoSeguro({ texto }: { texto: string }) {
  const blocos: ReactNode[] = []; const linhas = texto.replace(/\r/g, "").split("\n");
  let i = 0; let k = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (l.startsWith("```")) { // bloco de código
      const cod: string[] = []; i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) cod.push(linhas[i++]);
      i++;
      blocos.push(<pre key={k++} className="my-2 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs overflow-x-auto whitespace-pre-wrap">{cod.join("\n")}</pre>);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(l)) { // lista
      const ordenada = /^\s*\d+\./.test(l); const itens: ReactNode[] = [];
      while (i < linhas.length && /^\s*([-*]|\d+\.)\s+/.test(linhas[i])) { itens.push(<li key={itens.length}>{inline(linhas[i].replace(/^\s*([-*]|\d+\.)\s+/, ""), `l${k}-${itens.length}`)}</li>); i++; }
      blocos.push(ordenada ? <ol key={k++} className="list-decimal pl-5 my-1.5 space-y-0.5">{itens}</ol> : <ul key={k++} className="list-disc pl-5 my-1.5 space-y-0.5">{itens}</ul>);
    } else if (/^#{1,4}\s+/.test(l)) {
      blocos.push(<p key={k++} className="font-semibold mt-2 mb-0.5">{inline(l.replace(/^#{1,4}\s+/, ""), `h${k}`)}</p>); i++;
    } else if (!l.trim()) { i++; }
    else {
      const par: string[] = [];
      while (i < linhas.length && linhas[i].trim() && !linhas[i].startsWith("```") && !/^\s*([-*]|\d+\.)\s+/.test(linhas[i]) && !/^#{1,4}\s+/.test(linhas[i])) par.push(linhas[i++]);
      blocos.push(<p key={k++} className="my-1.5">{par.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${k}-${j}`)}</Fragment>)}</p>);
    }
  }
  return <div className="text-sm leading-relaxed break-words">{blocos}</div>;
}
