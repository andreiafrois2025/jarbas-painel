// =============================================================
// Layout vertical (de cima para baixo) dos fluxos — lógica pura.
// Sem dependência nova: camadas pelo caminho mais longo + ordem por
// "baricentro" (reduz o cruzamento de setas) + centralizado.
// =============================================================

import type { FlowDoc, FlowDocEdge, FlowDocNode } from "../types";

export interface Caixa { id: string; w: number; h: number; ordem?: number }
export interface Lig { source: string; target: string; retorno?: boolean }
export interface PosCaixa { x: number; y: number; camada: number }

/** Tamanho real de cada peça (o mesmo desenhado pelo RoughNode). */
export function tamanhoDoTipo(type: FlowDocNode["type"]): { w: number; h: number } {
  if (type === "start" || type === "end") return { w: 140, h: 140 };
  if (type === "condition") return { w: 210, h: 130 };
  return { w: 240, h: 110 };
}

const GAP_X = 70;
const GAP_Y = 90; // espaço pra seta e pro rótulo dela

export function layoutVertical(caixas: Caixa[], ligs: Lig[]): Map<string, PosCaixa> {
  const ids = new Set(caixas.map((c) => c.id));
  const fwd = ligs.filter((l) => !l.retorno && ids.has(l.source) && ids.has(l.target) && l.source !== l.target);
  const n = caixas.length;

  // 1) camadas: caminho mais longo; trava em n-1 pra laço sem marca não rodar pra sempre
  const camada = new Map<string, number>(caixas.map((c) => [c.id, 0]));
  for (let volta = 0; volta < n; volta++) {
    let mudou = false;
    for (const l of fwd) {
      const novo = (camada.get(l.source) ?? 0) + 1;
      if (novo > (camada.get(l.target) ?? 0) && novo < n) { camada.set(l.target, novo); mudou = true; }
    }
    if (!mudou) break;
  }
  // ligações "pra trás" (sem marca) não entram na ordenação
  const util = fwd.filter((l) => (camada.get(l.target) ?? 0) > (camada.get(l.source) ?? 0));

  // 2) ordem dentro de cada camada
  const maxC = Math.max(0, ...camada.values());
  const linhas: string[][] = Array.from({ length: maxC + 1 }, () => []);
  caixas
    .slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((c) => linhas[camada.get(c.id) ?? 0].push(c.id));
  const indice = new Map<string, number>();
  const reindexa = () => linhas.forEach((l) => l.forEach((id, i) => indice.set(id, i - (l.length - 1) / 2)));
  reindexa();
  const bary = (id: string, vizinhos: (l: Lig) => string | null) => {
    const v = util.map(vizinhos).filter((x): x is string => !!x && x !== id);
    return v.length ? v.reduce((s, x) => s + (indice.get(x) ?? 0), 0) / v.length : indice.get(id) ?? 0;
  };
  for (let rodada = 0; rodada < 4; rodada++) {
    for (let c = 1; c <= maxC; c++) {
      const b = new Map(linhas[c].map((id) => [id, bary(id, (l) => (l.target === id ? l.source : null))]));
      linhas[c].sort((a, z) => (b.get(a) ?? 0) - (b.get(z) ?? 0));
      reindexa();
    }
    for (let c = maxC - 1; c >= 0; c--) {
      const b = new Map(linhas[c].map((id) => [id, bary(id, (l) => (l.source === id ? l.target : null))]));
      linhas[c].sort((a, z) => (b.get(a) ?? 0) - (b.get(z) ?? 0));
      reindexa();
    }
  }

  // 3) coordenadas: camada por camada, centralizadas em x = 0
  const tam = new Map(caixas.map((c) => [c.id, c]));
  const out = new Map<string, PosCaixa>();
  let y = 0;
  linhas.forEach((ids2, c) => {
    const largura = ids2.reduce((s, id) => s + tam.get(id)!.w, 0) + GAP_X * Math.max(0, ids2.length - 1);
    let x = -largura / 2;
    let alt = 0;
    for (const id of ids2) {
      const t = tam.get(id)!;
      out.set(id, { x, y, camada: c });
      x += t.w + GAP_X;
      alt = Math.max(alt, t.h);
    }
    y += alt + GAP_Y;
  });
  return out;
}

/** Quanto o conjunto de posições ocupa (para caixas-grupo). */
export function limites(pos: Map<string, PosCaixa>, caixas: Caixa[]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of caixas) {
    const p = pos.get(c.id);
    if (!p) continue;
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + c.w); y2 = Math.max(y2, p.y + c.h);
  }
  if (!isFinite(x1)) return { x1: 0, y1: 0, w: 0, h: 0 };
  return { x1, y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * Devolve o fluxo "em pé": posições de cima pra baixo e setas saindo de baixo
 * e entrando por cima (as de retorno contornam pela direita).
 * Se o fluxo já foi arrumado/salvo na vertical (marca `layoutV`), respeita as posições salvas.
 */
export function verticaliza(flow: Pick<FlowDoc, "nodes" | "edges">): { nodes: FlowDocNode[]; edges: FlowDocEdge[]; salvo: boolean } {
  const salvo = flow.nodes.length > 0 && flow.nodes.every((n) => n.data.layoutV);
  const caixas: Caixa[] = flow.nodes.map((n) => ({ id: n.id, ...tamanhoDoTipo(n.type), ordem: n.position?.y ?? 0 }));
  const pos = layoutVertical(caixas, flow.edges.map((e) => ({ source: e.source, target: e.target, retorno: e.isReturn })));
  const nodes = flow.nodes.map((n) => {
    if (salvo) return n;
    const p = pos.get(n.id)!;
    return { ...n, position: { x: Math.round(p.x), y: Math.round(p.y) }, data: { ...n.data, layoutV: 1 } };
  });
  const edges = flow.edges.map((e) => {
    const volta = e.isReturn || (pos.get(e.target)?.camada ?? 0) <= (pos.get(e.source)?.camada ?? 0);
    if (salvo && e.sourceHandle && e.targetHandle) return e;
    return {
      ...e,
      isReturn: !!volta,
      sourceHandle: volta ? "right" : "bottom",
      targetHandle: volta ? "right" : "top",
    };
  });
  return { nodes, edges, salvo };
}
