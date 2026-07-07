// =============================================
// Exportadores — o desenho vira Mermaid ou prompt de texto
// pra você colar em outra IA e ela recriar/adaptar o fluxo.
// =============================================

import type { FlowDoc } from "@/lib/types";

const SHAPE = {
  start: (label: string) => `([${label}])`,
  end: (label: string) => `([${label}])`,
  action: (label: string) => `[${label}]`,
  condition: (label: string) => `{${label}}`,
  note: (label: string) => `>${label}]`,
} as const;

function safe(s: string): string {
  return s.replace(/"/g, "'").replace(/\n/g, " ");
}

/** Converte o fluxo em texto Mermaid — versionável, IA lê e escreve. */
export function toMermaid(flow: FlowDoc): string {
  const lines: string[] = ["flowchart LR"];
  for (const n of flow.nodes) {
    const label = safe(n.data.label);
    const shape = SHAPE[n.type](label);
    lines.push(`  ${n.id}${shape}`);
  }
  for (const e of flow.edges) {
    const arrow = e.isReturn ? "-.->|volta|" : e.label ? `-->|${safe(e.label)}|` : "-->";
    lines.push(`  ${e.source} ${arrow} ${e.target}`);
  }
  return lines.join("\n");
}

/** Converte o fluxo em prompt textual — cola em qualquer IA sem estrutura de código. */
export function toPrompt(flow: FlowDoc): string {
  const parts: string[] = [];
  parts.push(`# Fluxo: ${flow.title}\n`);
  parts.push(`**Categoria:** ${flow.category}`);
  if (flow.description) parts.push(`**Descrição:** ${flow.description}\n`);
  parts.push(`## Etapas\n`);
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  for (const n of flow.nodes) {
    const kind =
      n.type === "start" ? "Início" :
      n.type === "end" ? "Fim" :
      n.type === "condition" ? "Decisão" :
      n.type === "note" ? "Nota" : "Ação";
    parts.push(`- **[${n.id}] ${kind}: ${n.data.label}**`);
    if (n.data.executor) parts.push(`  - Executor: ${n.data.executor}`);
    if (n.data.tags?.length) parts.push(`  - Ferramentas: ${n.data.tags.join(", ")}`);
    if (n.data.details) parts.push(`  - Detalhes: ${n.data.details.replace(/\n/g, " ")}`);
  }
  parts.push(`\n## Transições\n`);
  for (const e of flow.edges) {
    const from = byId.get(e.source)?.data.label || e.source;
    const to = byId.get(e.target)?.data.label || e.target;
    const suffix = e.isReturn ? " (volta)" : e.label ? ` [${e.label}]` : "";
    parts.push(`- "${from}" → "${to}"${suffix}`);
  }
  parts.push(
    `\n---\nCole este documento em qualquer IA (ChatGPT/Claude/Gemini) pedindo pra ela adaptar/recriar/converter em código. O formato é auto-explicativo.`,
  );
  return parts.join("\n");
}

export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copy(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}
