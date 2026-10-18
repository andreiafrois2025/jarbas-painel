// Textos das fichas da equipe (Equipe › Agentes). Os "Chame para" foram tirados
// da descrição de cada agente (/root/.claude/agents/*.md, campo "Use quando…"),
// reescritos em linguagem simples, numa linha só.

import { mascoteId } from "./mascotes";
import { AGENTES, SALAS, type SalaId } from "./escritorio";

export const CHAME_PARA: Record<string, string> = {
  jarbas: "Qualquer pedido: ele decide quem faz",
  donna: "Agenda, lembrete, ofício, prazo",
  izzy: "Legenda, roteiro, e-mail, página",
  harvey: "Parecer, risco jurídico, LGPD",
  felipe: "Arte, capa, paleta, carrossel",
  katrina: "ETP, TR, minuta, edital",
  louis: "Gastos, orçamento, preço de mercado",
  mike: "Pesquisa, checar notícia, fontes",
  eric: "Mapa, bacia, QGIS, análise do território",
  junior: "App, bot, automação, código novo",
  tonny: "Planilha, dashboard, indicadores",
  theo: "Roteiro de vídeo, cortes, abertura de reel",
  rafaela: "Estratégia, metas, prioridades",
  sofia: "Organizar pastas, acervo, Notion",
  nara: "Sobrecarga, conflito, feedback difícil",
  lara: "Cardápio, marmitas, lista de compras",
};

export const SALA_ROTULO: Record<SalaId, string> = Object.fromEntries(SALAS.map((s) => [s.id, s.rotulo.replace(/^\S+\s/, "")])) as Record<SalaId, string>;
export const SALA_EMOJI: Record<SalaId, string> = Object.fromEntries(SALAS.map((s) => [s.id, s.rotulo.split(" ")[0]])) as Record<SalaId, string>;

export function salaDe(nome: string): SalaId | null {
  const id = mascoteId(nome);
  return AGENTES.find((a) => a.id === id)?.sala ?? null;
}

export function cargoDe(nome: string, fallback?: string): string {
  const id = mascoteId(nome);
  const c = AGENTES.find((a) => a.id === id)?.cargo ?? fallback ?? "";
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : "";
}
