import type { Edge } from "@xyflow/react";
import { estiloSeta } from "./estilo";
import { medePeca } from "@/lib/flow/medida";
import type { FlowDocNode } from "@/lib/types";

export interface NoRota {
  id: string;
  type: FlowDocNode["type"];
  label: string;
  icon?: string;
  executor?: string;
  position: { x: number; y: number };
}
export interface SetaRota {
  id: string;
  source: string;
  target: string;
  label?: string;
  isReturn?: boolean;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Roteamento das setas no desenho deitado (v3.2). Só na hora de DESENHAR: o que está salvo não muda.
 *  - seta normal na mesma fileira, sem peça no meio: reta (direita → esquerda)
 *  - seta normal que passaria POR CIMA de uma peça do meio (ex.: o "não" pulando a etapa do "sim"): contorna por cima
 *  - seta que muda de fileira: desce por baixo e entra por cima (como o layout já fazia)
 *  - retorno: contorna por baixo; se a borda de baixo já é usada por uma seta que desce, vai por cima
 *  - cada seta que contorna recebe um afastamento próprio, maior que as peças que ela contorna: nada cruza peça nem se sobrepõe
 */
export function paraRFSetas(setas: SetaRota[], nos: NoRota[] | { id: string; position: { x: number; y: number } }[]): Edge[] {
  type Cx = { x: number; y: number; w: number; h: number };
  const caixa = new Map<string, Cx>();
  for (const n of nos as NoRota[]) {
    const t = "type" in n ? medePeca(n.type, n.label, n.executor, n.icon) : { w: 150, h: 80 };
    caixa.set(n.id, { x: n.position.x, y: n.position.y, w: t.w, h: t.h });
  }
  const mesmaFileira = (a: Cx, b: Cx) => a.y < b.y + b.h && b.y < a.y + a.h;
  // desenho deitado (computador): normais saem pela direita; no de celular as normais descem e as voltas saem pela direita
  const horizontal = setas.some((s) => (s.sourceHandle === "right" && s.targetHandle === "left") || (s.isReturn && s.sourceHandle === "bottom" && s.targetHandle === "bottom"));
  type Rota = SetaRota & { contorna?: boolean; folga?: boolean };
  let lista: Rota[] = setas.map((s) => ({ ...s }));

  if (horizontal) {
    // bordas já ocupadas por seta que muda de fileira (sai por baixo / entra por cima)
    const baixoOcupado = new Set<string>(), cimaOcupado = new Set<string>();
    const saidasPorBaixo: Cx[] = []; // peças de onde sai uma seta que desce para outra fileira (a linha dela corre sob a fileira toda)
    for (const s of lista) {
      const a = caixa.get(s.source), b = caixa.get(s.target);
      if (!s.isReturn && a && b && !mesmaFileira(a, b)) { baixoOcupado.add(s.source); cimaOcupado.add(s.target); saidasPorBaixo.push(a); }
    }
    lista = lista.map((s) => {
      const a = caixa.get(s.source), b = caixa.get(s.target);
      if (!a || !b) return s;
      if (!s.isReturn) {
        if (s.sourceHandle !== "right" || s.targetHandle !== "left" || !mesmaFileira(a, b)) return s;
        const yA = a.y + a.h / 2, yB = b.y + b.h / 2;
        const bloqueada = [...caixa.entries()].some(([id, c]) => id !== s.source && id !== s.target
          && c.x > a.x + a.w - 4 && c.x + c.w < b.x + 4 && Math.min(yA, yB) - 8 < c.y + c.h && Math.max(yA, yB) + 8 > c.y);
        if (!bloqueada) return s;
        const cima = !cimaOcupado.has(s.source) && !cimaOcupado.has(s.target);
        return { ...s, sourceHandle: cima ? "top" : "bottom", targetHandle: cima ? "top" : "bottom", contorna: true };
      }
      // retorno
      if (mesmaFileira(a, b)) return { ...s, sourceHandle: "bottom", targetHandle: "bottom", contorna: true, folga: baixoOcupado.has(s.source) || baixoOcupado.has(s.target) || saidasPorBaixo.some((c) => mesmaFileira(c, a)) };
      // retorno que muda de fileira: sai por baixo e entra pela direita da peça de destino
      const algoADireita = [...caixa.entries()].some(([id, c]) => id !== s.target && mesmaFileira(c, b) && c.x > b.x + b.w);
      return { ...s, sourceHandle: "bottom", targetHandle: algoADireita ? "bottom" : "right", contorna: true };
    });
  }

  if (!horizontal) {
    // desenho de celular (de cima para baixo): seta normal que atravessaria uma peça do meio contorna pela direita
    lista = lista.map((s) => {
      const a = caixa.get(s.source), b = caixa.get(s.target);
      if (s.isReturn || !a || !b || s.sourceHandle !== "bottom" || s.targetHandle !== "top") return s;
      const xa = a.x + a.w / 2, xb = b.x + b.w / 2;
      const bloqueada = [...caixa.entries()].some(([id, c]) => id !== s.source && id !== s.target
        && c.y > a.y + a.h - 4 && c.y + c.h < b.y + 4 && c.x - 8 < Math.max(xa, xb) && c.x + c.w + 8 > Math.min(xa, xb));
      return bloqueada ? { ...s, sourceHandle: "right", targetHandle: "right", contorna: true } : s;
    });
  }

  const contorna = lista.filter((s) => s.contorna || s.isReturn);
  const vao = (s: SetaRota) => { const a = caixa.get(s.source), b = caixa.get(s.target); return a && b ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : 0; };
  const ordem = contorna.slice().sort((a, b) => vao(a) - vao(b)).map((s) => s.id);
  return lista.map((s) => {
    const k = ordem.indexOf(s.id);
    let offset: number | undefined;
    if (k >= 0) {
      // quando a borda de baixo já tem uma seta que desce, a volta passa mais fundo (nunca em cima dela)
      const base = (s as Rota).folga ? 84 : 34;
      offset = base + 30 * k;
      const a = caixa.get(s.source), b = caixa.get(s.target);
      if (a && b && !horizontal && s.sourceHandle === "right" && s.targetHandle === "right") {
        // celular: a volta/desvio passa à direita de todas as peças que contorna
        const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y + a.h, b.y + b.h);
        const meio = [...caixa.values()].filter((c) => c.y < y2 && c.y + c.h > y1);
        offset = Math.max(offset, Math.max(...meio.map((c) => c.x + c.w)) - Math.max(a.x + a.w, b.x + b.w) + 28 + 30 * k);
      }
      if (a && b && s.sourceHandle === s.targetHandle && (s.sourceHandle === "bottom" || s.sourceHandle === "top")) {
        const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y + a.h, b.y + b.h);
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x + a.w, b.x + b.w);
        // só as peças da mesma fileira entram na conta
        const meio = [...caixa.values()].filter((c) => c.x + c.w > x1 && c.x < x2 && c.y < y2 + 20 && c.y + c.h > y1 - 20);
        if (s.sourceHandle === "bottom") offset = Math.max(offset, Math.max(...meio.map((c) => c.y + c.h)) - Math.max(a.y + a.h, b.y + b.h) + base - 10 + 30 * k);
        else offset = Math.max(offset, Math.min(a.y, b.y) - Math.min(...meio.map((c) => c.y)) + base - 10 + 30 * k);
      }
    }
    return estiloSeta(
      { id: s.id, source: s.source, target: s.target, sourceHandle: s.sourceHandle ?? (s.isReturn ? "right" : "bottom"), targetHandle: s.targetHandle ?? (s.isReturn ? "right" : "top") },
      !!s.isReturn,
      s.label,
      offset,
    );
  });
}

