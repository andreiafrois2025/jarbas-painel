// =============================================================
// Tamanho de cada peça do diagrama, calculado pelo TEXTO que ela leva (v3.1, 18/10/2026).
// Mede o texto de verdade (canvas, com a mesma fonte da peça), quebra em linhas e devolve
// largura/altura que o desenho e o auto-layout usam. Assim nada vaza para fora do balão.
//
//  - retângulo: encolhe/estica a largura (124 a 250) e cresce na altura conforme as linhas
//  - losango (decisão): o texto só cabe no retângulo inscrito, então a peça cresce ~2x o texto
//  - círculo (início/fim): o diâmetro cresce até o texto caber dentro do anel
// Se o canvas não existir (servidor), usa uma estimativa por quantidade de letras.
// =============================================================

import type { FlowDocNode } from "../types";

type Tipo = FlowDocNode["type"];

export interface Medida {
  w: number;
  h: number;
  /** largura da caixa de texto (para a peça centralizar o texto e quebrar igual à medição) */
  textoW: number;
  /** linhas do rótulo (a peça corta nelas) */
  linhas: number;
}

const LH = 15; // altura da linha do rótulo (13px × 1,15)
const LINHAS_MAX = 3;

let ctx: CanvasRenderingContext2D | null | undefined;
let familia = "";
let versaoFonte = 0; // sobe quando a fonte termina de carregar (o cache é descartado)
const cache = new Map<string, Medida>();

function pegaCtx(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Chamar quando a fonte do desenho carregar: as medidas antigas deixam de valer. */
export function fonteCarregou() {
  cache.clear();
  familia = "";
  versaoFonte += 1;
  return versaoFonte;
}

function largura(texto: string, px = 13, peso = 600, italico = false): number {
  const c = pegaCtx();
  if (c) {
    if (!familia && typeof document !== "undefined") {
      const v = getComputedStyle(document.body).getPropertyValue("--font-kalam").trim();
      familia = `${v ? v + ", " : ""}"Comic Sans MS", cursive`;
    }
    c.font = `${italico ? "italic " : ""}${peso} ${px}px ${familia}`;
    return c.measureText(texto).width * 1.05; // folga: a fonte real pode ser um pouco mais larga
  }
  return texto.length * px * 0.56;
}

/** Quebra o texto em linhas que cabem em `max` px; devolve as linhas e a largura da maior. */
function quebra(texto: string, max: number): { linhas: string[]; maior: number } {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tenta = atual ? `${atual} ${p}` : p;
    if (atual && largura(tenta) > max) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = tenta;
    }
  }
  if (atual) linhas.push(atual);
  const maior = Math.max(0, ...linhas.map((l) => largura(l)));
  return { linhas, maior };
}

const par = (n: number) => Math.ceil(n / 4) * 4;

function mede(tipo: Tipo, rotulo: string, executor?: string, icone?: string): Medida {
  const texto = (rotulo || "sem título").trim();
  const extraH = (icone ? 20 : 0) + (executor ? 14 : 0);
  const exW = executor ? Math.min(largura(executor, 10, 400, true), 150) : 0;

  if (tipo === "condition") {
    // losango: testa várias larguras de quebra e fica com o de menor área
    let melhor: Medida | null = null;
    for (const quebraEm of [90, 110, 130, 150, 175]) {
      const { linhas, maior } = quebra(texto, quebraEm);
      const n = Math.min(linhas.length, LINHAS_MAX);
      const tw = Math.max(maior, exW);
      const th = n * LH + extraH;
      // o retângulo de texto precisa caber no losango: tw/w + th/h <= 0,82 (com a razão w = 1,75h)
      const h = Math.max(92, par((tw / 1.75 + th) / 0.82));
      const w = Math.max(168, par(h * 1.75));
      const m = { w, h, textoW: Math.min(w * 0.6, Math.max(quebraEm, tw)), linhas: n };
      if (!melhor || m.w * m.h < melhor.w * melhor.h) melhor = m;
    }
    return melhor!;
  }

  if (tipo === "start" || tipo === "end") {
    let melhor: Medida | null = null;
    for (const quebraEm of [64, 84, 104, 124]) {
      const { linhas, maior } = quebra(texto, quebraEm);
      const n = Math.min(linhas.length, LINHAS_MAX + 1);
      const tw = Math.max(maior, exW * 0.8);
      const th = n * LH + extraH;
      const hip = Math.sqrt((tw / 2) ** 2 + (th / 2) ** 2);
      const d = Math.max(108, par(2 * hip + 34)); // o anel interno do fim tem 22px a menos
      const m = { w: d, h: d, textoW: Math.min(d - 34, Math.max(quebraEm, tw)), linhas: n };
      if (!melhor || m.w < melhor.w) melhor = m;
    }
    return melhor!;
  }

  // retângulo (ação) e nota
  let q = quebra(texto, 178);
  if (q.linhas.length > LINHAS_MAX) q = quebra(texto, 220);
  const n = Math.min(q.linhas.length, LINHAS_MAX);
  const w = Math.max(124, Math.min(256, par(Math.max(q.maior, exW) + 36)));
  const h = Math.max(66, par(n * LH + extraH + 40));
  return { w, h, textoW: w - 36, linhas: n };
}

/** Tamanho da peça pelo texto (com cache). */
export function medePeca(tipo: Tipo, rotulo?: string, executor?: string, icone?: string): Medida {
  const chave = `${versaoFonte}|${tipo}|${rotulo || ""}|${executor || ""}|${icone ? 1 : 0}`;
  let m = cache.get(chave);
  if (!m) {
    m = mede(tipo, rotulo || "", executor, icone);
    cache.set(chave, m);
  }
  return m;
}

/** Largura de um rótulo de seta (11px), para abrir o corredor das setas entre raias. */
export function larguraRotuloSeta(texto: string): number {
  return Math.ceil(largura(texto, 11, 500)) + 12;
}
