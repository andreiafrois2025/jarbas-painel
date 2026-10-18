// Modo de exibição do painel: "tudo" (normal) ou "servidora" (para projetar em
// curso/palestra sem mostrar nada pessoal).
//
// 18/10/2026 (Fase 5-A). Este arquivo é a LISTA ÚNICA do que é pessoal. Em vez
// de espalhar "if servidora" por cada tela, cada tela pergunta aqui. Quem criar
// automação, colaborador ou área nova de natureza pessoal só precisa incluir o
// termo em PADROES_PESSOAIS (ou o nome em COLABORADORES_OCULTOS).
//
// IMPORTANTE: isto é filtro de EXIBIÇÃO, não cofre. O que é realmente dado
// pessoal (agenda, tarefas, escola, finanças) nem é pedido ao servidor em
// Servidora; o que sobra aqui é nome/rótulo de configuração.

export type Modo = "tudo" | "servidora";

export const CHAVE_MODO = "modoPainel";

/** Contextos (áreas) que somem em Servidora. */
export const CONTEXTOS_PESSOAIS = ["Pessoal", "Família"];

/** Colaboradores que somem em Servidora (decisão dela, 17/10). */
export const COLABORADORES_OCULTOS = ["lara", "dra. nara", "nara"];

// Termos que marcam um texto (nome de automação, atividade, link, criação…)
// como pessoal. Comparados sem acento e sem caixa.
const PADROES_PESSOAIS = [
  "luiz", "escola", "escolar", "financ", "fatura", "cartao", "cartoes", "pluggy",
  "louis", "cardapio", "nutri", "marmita", "psicolog", "livro e compra",
  "despejo", "familia", "pessoal", "viagens",
];

function semAcento(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** O texto menciona algo pessoal? (nome, descrição, comando, atividade…) */
export function ehPessoal(...textos: (string | null | undefined)[]): boolean {
  const t = semAcento(textos.filter(Boolean).join(" ")) + " ";
  // "nara" e "lara" precisam ser palavra inteira (senão pega "narrativa", "clara")
  if (/\b(nara|lara)\b/.test(t)) return true;
  return PADROES_PESSOAIS.some((p) => t.includes(p));
}

export function ehColaboradorOculto(nome: string): boolean {
  const n = semAcento(nome).trim();
  return COLABORADORES_OCULTOS.some((o) => n === o || n.startsWith(o + " "));
}

export function ehContextoPessoal(ctx: string | null | undefined): boolean {
  return CONTEXTOS_PESSOAIS.includes(ctx || "");
}

/** Nome neutro para uma automação pessoal (não mostra "Luiz" na projeção). */
export function nomeNeutro(nome: string): string {
  return nome
    .replace(/Escola do Luiz/gi, "Agenda escolar")
    .replace(/\bLuiz( Fernando)?\b/gi, "(oculto)");
}

/** Áreas do grafo cujo rótulo não denuncia que são pessoais (por id). */
export const NOS_GRAFO_PESSOAIS = ["area-casa", "area-desarrumado", "area-revisao"];

export const ROTULO_OCULTO = "dados ocultos neste modo";

/** Lê a escolha guardada. sessionStorage = vale até fechar o navegador. */
export function lerModoGuardado(): Modo {
  try {
    return window.sessionStorage.getItem(CHAVE_MODO) === "servidora" ? "servidora" : "tudo";
  } catch {
    return "tudo";
  }
}

export function guardarModo(m: Modo) {
  try {
    window.sessionStorage.setItem(CHAVE_MODO, m);
  } catch { /* navegador bloqueou: segue sem lembrar */ }
}
