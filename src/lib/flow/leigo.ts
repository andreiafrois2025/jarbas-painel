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
    edges: flow.edges.map((e) => {
      // saída de decisão que é "sim"/"não" continua dizendo "sim"/"não" (a paráfrase "se for urgente" esconde a escolha)
      const deDecisao = flow.nodes.find((n) => n.id === e.source)?.type === "condition";
      if (deDecisao && e.label && /^(sim|n[aã]o)\b/i.test(e.label.trim())) return { ...e, label: lf?.setas?.[e.id] && /^(sim|n[aã]o)\b/i.test(lf.setas[e.id]) ? lf.setas[e.id] : e.label };
      return { ...e, label: lf?.setas?.[e.id] ?? e.label };
    }),
  };
}

/** No balão, "O sistema" em toda peça só polui: só aparece o nome de quem de fato faz (Mike, Donna, Você…). */
export function quemNoBalao(quem?: string): string | undefined {
  return quem && !/^o sistema$/i.test(quem.trim()) ? quem : undefined;
}

// ── v3.3 (18/10/2026): textos enxutos ───────────────────────────────────────

/** Descrição de uma frase só, escrita à mão, para os fluxos em que o corte automático ficou estranho (chave = início do id). */
export const DESCRICAO_MANUAL: Record<string, string> = {
  "738a9db2": "Fluxo ainda sem descrição.",
  "e0ec4684": "Cria um agente novo para a equipe.",
  "455a8267": "Toda semana, sugere pautas de Reels e escreve o roteiro.",
  "bbdeea3e": "Cria um carrossel para o Instagram a partir de um tema.",
  "47b33465": "Junta os números de saúde e produção num histórico.",
};

const palavras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * UMA frase curta: pega a primeira frase e corta na primeira oração principal
 * (vírgula seguida de "com", "e depois", "para", "sem"…, travessão, ponto e vírgula ou dois pontos),
 * desde que sobrem pelo menos 4 palavras. Termina sempre com ponto.
 */
export function fraseCurta(txt?: string | null, id?: string): string {
  const manual = id ? Object.entries(DESCRICAO_MANUAL).find(([k]) => id.startsWith(k))?.[1] : undefined;
  if (manual) return manual;
  const linha = (txt || "").split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
  if (!linha) return "";
  const m = linha.match(/^(.+?[.!?])(\s|$)/);
  let s = (m ? m[1] : linha).replace(/[.!?:;,\s]+$/, "");
  // só corta onde vem um complemento claro depois da vírgula (nunca no meio de uma ideia)
  const cortes = [/,\s+(com|e depois|e então|e aí|sem|já|mesmo|para|pra|só|depois)\s/, /\s[—–]\s/, /;\s/, /:\s/];
  let melhor = s.length;
  for (const re of cortes) {
    const r = re.exec(s);
    if (r && r.index < melhor && palavras(s.slice(0, r.index)) >= 4) melhor = r.index;
  }
  s = s.slice(0, melhor).replace(/[,;:\s—–-]+$/, "");
  return s ? `${s}.` : "";
}

const PARADAS = new Set(["voce", "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e", "que", "para", "pra", "com", "em", "no", "na"]);
const raiz = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w && !PARADAS.has(w)).map((w) => w.slice(0, 5));

/** Um texto só repete o outro? (igual, um contém o outro com tamanho parecido, ou quase as mesmas palavras). */
export function repete(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ra = raiz(a), rb = raiz(b);
  if (!ra.length || !rb.length) return false;
  const sa = new Set(ra), sb = new Set(rb);
  const comum = [...sa].filter((w) => sb.has(w)).length;
  const menor = Math.min(sa.size, sb.size), uniao = new Set([...sa, ...sb]).size;
  const ja = a.toLowerCase(), jb = b.toLowerCase();
  const contem = (ja.includes(jb) || jb.includes(ja)) && Math.min(ja.length, jb.length) / Math.max(ja.length, jb.length) >= 0.6;
  return contem || comum / uniao >= 0.7 || (comum === menor && menor >= 2 && menor / Math.max(sa.size, sb.size) >= 0.6);
}
