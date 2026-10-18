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
  "despejo", "familia", "pessoal", "viagens", "lembretes", "vencimento", "gastos",
  "pediatr", "terapia", "hwaendrix",
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

/** Nome neutro para uma automação pessoal (nada de Luiz, Pluggy ou caminho de script na projeção). */
export function nomeNeutro(nome: string, ...contexto: (string | null | undefined)[]): string {
  const t = semAcento([nome, ...contexto].filter(Boolean).join(" "));
  if (/luiz|escola/.test(t)) return "Agenda escolar (automação)";
  if (/financ|pluggy|fatura|saldo|vencimento|cartao|gasto/.test(t)) return "Finanças (automação)";
  if (/lembrete/.test(t)) return "Lembretes (automação)";
  return "Automação de uso pessoal";
}

/** Categoria neutra para o agrupamento das automações ocultas. */
export const CATEGORIA_OCULTA = "🔒 Uso pessoal";

/** O nome parece um comando de terminal (a lista de métricas corta em 50 letras e esconde o resto). */
export function pareceComando(nome: string): boolean {
  return /^(\/|docker |python|bash |sh |node )/.test(nome.trim());
}

// Padrões usados para limpar TEXTO LIVRE (bio, habilidades, personalidade).
// Mais estreito que PADROES_PESSOAIS de propósito: aqui não entra "financ" nem
// "louis", senão Louis (que continua visível) ficaria sem descrição.
const PADROES_TEXTO = [
  "luiz", "filho", "filha", "famil", "escola", "escolar", "marmita", "cardapio",
  "nutri", "pessoal", "cartao", "fatura", "hwaendrix", "companheiro", "terapia",
  "psicolog", "saude mental", "pediatr", "casa",
];

/**
 * Tira de um texto livre as frases (ou itens de lista) que citam assunto
 * pessoal. Ex.: "Cordial. Apoio na rotina familiar/Luiz." vira "Cordial.".
 */
export function limpaTexto(texto: string | null | undefined): string {
  if (!texto) return "";
  // com parênteses de captura, o split devolve [trecho, separador, trecho, ...]
  const partes = texto.split(/((?<=[.!?;])\s+|\n+|,\s*(?![^()]*\)))/);
  let saida = "";
  for (let i = 0; i < partes.length; i += 2) {
    const trecho = partes[i];
    const sep = partes[i + 1] ?? "";
    const t = semAcento(trecho);
    const pessoal = PADROES_TEXTO.some((x) => t.includes(x)) || /\b(nara|lara)\b/.test(t);
    if (!pessoal) saida += trecho + sep;
  }
  return saida.replace(/[,;\s]+$/, "").trim();
}

/** Colaborador sem os trechos pessoais dos textos de perfil. */
export function limpaColaborador<T extends { bio?: string; specialization?: string; skills?: string; personality?: string }>(c: T): T {
  return { ...c, bio: limpaTexto(c.bio), specialization: limpaTexto(c.specialization), skills: limpaTexto(c.skills), personality: limpaTexto(c.personality) };
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
