// Faixa "⚡ Fazer agora" da porta Áreas: uma lista simples, fácil de crescer.
// Para um botão novo, acrescente uma linha em ACOES. Tipos de botão:
//  - agente + texto: abre /conversa?agente=<id>&texto=<pedido inicial>
//  - acao "novo-processo": abre a gaveta de novo processo (sem ir ao chat)
//  - aviso: mostra um recado curto na própria página
//  - emBreve: botão com selo "em breve"; o texto explica por quê
// `pessoal: true` some no modo Só Igam (ver lib/modo.ts).

export type AreaAcao = "igam" | "conteudo" | "casa";

export interface AcaoAgora {
  id: string;
  area: AreaAcao;
  rotulo: string;
  agente?: string;
  texto?: string;
  acao?: "novo-processo";
  aviso?: string;
  emBreve?: string;
  pessoal?: boolean;
}

const SEM_HABILIDADES = "o chat ainda não roda habilidades (skills)";

export const ACOES: AcaoAgora[] = [
  // ── Igam ──
  {
    id: "mapa-institucional", area: "igam", rotulo: "🗺️ Gerar mapa institucional",
    agente: "eric", texto: "Gera o mapa institucional de ",
    emBreve: `A skill do mapa institucional ainda não foi instalada no chat, e ${SEM_HABILIDADES}.`,
  },
  { id: "acontece-no-igam", area: "igam", rotulo: "📣 Acontece no Igam", agente: "izzy", texto: "Formata no padrão Acontece no Igam: " },
  { id: "nova-licitacao", area: "igam", rotulo: "⚖️ Nova licitação", acao: "novo-processo" },
  { id: "oficio", area: "igam", rotulo: "📄 Redigir ofício/memorando", agente: "donna", texto: "Redige um ofício/memorando sobre " },
  { id: "norma", area: "igam", rotulo: "🔎 Pesquisar norma", agente: "mike", texto: "Pesquisa a norma sobre " },
  // ── Conteúdo ──
  { id: "carrossel", area: "conteudo", rotulo: "📸 Novo carrossel", agente: "jarbas", texto: "Quero um carrossel sobre " },
  {
    id: "reel", area: "conteudo", rotulo: "🎬 Editar um reel",
    aviso: "Mande o vídeo bruto no Telegram, direto para o Jarbas: é lá que o estúdio recebe o vídeo. Quando a edição terminar, o projeto aparece na aba Reels daqui.",
  },
  { id: "ideia", area: "conteudo", rotulo: "💡 Nova ideia", agente: "rafaela", texto: "Tenho uma ideia de conteúdo: " },
  // ── Casa ──
  { id: "luiz", area: "casa", rotulo: "🎒 Anotar coisa do Luiz", agente: "donna", texto: "Anota do Luiz: ", pessoal: true },
  { id: "gasto", area: "casa", rotulo: "💸 Lançar um gasto", agente: "louis", texto: "Lança um gasto: ", pessoal: true },
  { id: "cardapio", area: "casa", rotulo: "🥗 Cardápio da semana", agente: "lara", texto: "Monta o cardápio da semana. ", pessoal: true },
];

/** Endereço do chat com o pedido inicial já escrito. */
export function urlConversa(a: AcaoAgora): string {
  const q = new URLSearchParams();
  if (a.agente) q.set("agente", a.agente);
  if (a.texto) q.set("texto", a.texto);
  return `/conversa?${q.toString()}`;
}
