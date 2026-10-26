"use client";

// Markdown mínimo (títulos, listas, negrito, código) desenhado como NÓS DO REACT.
// Nunca usa dangerouslySetInnerHTML: o que vier do modelo é só texto.

import { Fragment, type ReactNode } from "react";

// 25/10/2026: links clicáveis ([texto](https://...) e endereço solto). Só http/https.
const LINK = "text-[var(--accent)] underline break-all";
function linksSoltos(s: string, chave: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?"']/g; let ult = 0; let m: RegExpExecArray | null; let n = 0;
  while ((m = re.exec(s))) {
    if (m.index > ult) out.push(s.slice(ult, m.index));
    out.push(<a key={`${chave}-u${n++}`} href={m[0]} target="_blank" rel="noopener noreferrer" className={LINK}>{m[0]}</a>);
    ult = m.index + m[0].length;
  }
  if (ult < s.length) out.push(s.slice(ult));
  return out;
}

function inline(s: string, chave: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g; let ult = 0; let m: RegExpExecArray | null; let n = 0;
  while ((m = re.exec(s))) {
    if (m.index > ult) out.push(...linksSoltos(s.slice(ult, m.index), `${chave}-${n++}`));
    const t = m[0];
    if (t.startsWith("[")) {
      const fim = t.indexOf("](");
      out.push(<a key={`${chave}-${n++}`} href={t.slice(fim + 2, -1)} target="_blank" rel="noopener noreferrer" className={LINK}>{inline(t.slice(1, fim), `${chave}-${n}`)}</a>);
    } else out.push(t.startsWith("**")
      ? <strong key={`${chave}-${n++}`}>{inline(t.slice(2, -2), `${chave}-${n}`)}</strong>
      : <code key={`${chave}-${n++}`} className="px-1 rounded bg-[var(--bg-tertiary)] text-[0.9em]">{t.slice(1, -1)}</code>);
    ult = m.index + t.length;
  }
  if (ult < s.length) out.push(...linksSoltos(s.slice(ult), `${chave}-f`));
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
