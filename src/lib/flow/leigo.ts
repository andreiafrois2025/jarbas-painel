// =============================================================
// Textos em linguagem simples (v3.1, 18/10/2026).
// O curador grava, dentro do próprio desenho (aditivo, nada é apagado):
//   nodes[].data.leigo = { rotulo, frase, quem }      (cada etapa)
//   nodes[início].data.leigoFluxo = { nome, frase, comeca, termina, setas }
// Aqui só LEMOS isso. Sem texto leigo (fluxo novo ou editado à mão), cai no texto original.
// =============================================================

import type { FlowDoc, FlowDocNode } from "../types";
import type { Nivel } from "../radiografia";
import { caminhoDeArquivo } from "../radiografia";

export type LeigoFluxo = NonNullable<FlowDocNode["data"]["leigoFluxo"]>;

export function leigoDoFluxo(f: Pick<FlowDoc, "nodes">): LeigoFluxo | null {
  for (const n of f.nodes || []) if (n.data?.leigoFluxo) return n.data.leigoFluxo;
  return null;
}

/** Quem faz, sem nome de arquivo (arquivos só no nível Código). */
export function executorSimples(executor?: string): string | undefined {
  if (!executor) return undefined;
  return caminhoDeArquivo(executor) || /\bcron\b|→|\.py|\.sh/i.test(executor) ? undefined : executor;
}

/**
 * Cópia do fluxo só para MOSTRAR (nunca para salvar): nos níveis 1 e 2 troca rótulos, descrições,
 * "quem faz" e rótulos de seta pelos textos simples. No nível 3 devolve o fluxo como está.
 */
export function aplicaLeigo(flow: FlowDoc, nivel: Nivel): FlowDoc {
  if (nivel === 3) return flow;
  const lf = leigoDoFluxo(flow);
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      const l = n.data.leigo;
      return {
        ...n,
        data: {
          ...n.data,
          label: l?.rotulo || n.data.label,
          details: l?.frase || n.data.details,
          executor: l?.quem || executorSimples(n.data.executor),
        },
      };
    }),
    edges: flow.edges.map((e) => ({ ...e, label: lf?.setas?.[e.id] ?? e.label })),
  };
}

/** No balão, "O sistema" em toda peça só polui: só aparece o nome de quem de fato faz (Mike, Donna, Você…). */
export function quemNoBalao(quem?: string): string | undefined {
  return quem && !/^o sistema$/i.test(quem.trim()) ? quem : undefined;
}
