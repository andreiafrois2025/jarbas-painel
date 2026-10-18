// =============================================================
// MACRO-FLUXOS (PROPOSTA, 18/10/2026) — agrupamento dos 38 fluxos em "fluxos maiores".
//
// Isto é só um arquivo de configuração: NÃO apaga nem altera nenhum fluxo no Supabase.
// Cada fluxo é achado pelos 8 primeiros caracteres do id (não muda nunca; o título
// de alguns é um comando e pode mudar). Fluxo que não estiver listado aqui cai
// sozinho no grupo "Outros", então nada some da tela.
//
// Para ela aprovar: /root/docs/fluxos-agrupamento-proposta.md
// =============================================================

import type { FlowDoc, FlowGrupo } from "../types";
import { leigoDoFluxo } from "./leigo";

export interface MembroMacro {
  /** 8 primeiros caracteres do id do fluxo em `flows_doc` */
  id: string;
  /** nome amigável (opcional; só pros fluxos cujo título é um comando) */
  nome?: string;
}

export interface MacroDef {
  slug: string;
  icone: string;
  titulo: string;
  /** o que é, em uma frase de gente */
  resumo: string;
  /** por que estes fluxos ficaram juntos */
  porque: string;
  membros: MembroMacro[];
  /** setas entre os subfluxos: [de, para, rótulo] (ids de 8 caracteres) */
  ligacoes: [string, string, string?][];
}

export const MACROS: MacroDef[] = [
  {
    slug: "noticias-grupo-ia",
    icone: "📰",
    titulo: "Notícias e dicas do Grupo IA",
    resumo: "O Mike acha as notícias, a Izzy escreve e o texto chega ao grupo depois da sua aprovação.",
    porque: "Todos mexem nos mesmos cards do Radar e no mesmo envio pro grupo. O UAU é só um ramo do fluxo normal; o envio imediato e o resumo de pendentes são etapas da mesma fila.",
    membros: [
      { id: "36078246" }, { id: "177f5f98" }, { id: "803b72b5" }, { id: "da5be261" }, { id: "c92bc84a" }, { id: "cb704473" },
    ],
    ligacoes: [
      ["36078246", "177f5f98", "Mike aprende seu gosto"],
      ["177f5f98", "803b72b5", "se for urgente"],
      ["177f5f98", "da5be261", "você pede envio já"],
      ["177f5f98", "c92bc84a", "lembrete do que falta"],
      ["177f5f98", "cb704473", "confere o começo"],
    ],
  },
  {
    slug: "reels",
    icone: "🎬",
    titulo: "Reels, da pauta ao vídeo editado",
    resumo: "Da ideia de vídeo na quarta até o Reel editado depois que você grava.",
    porque: "É uma única cadeia no calendário: quarta nascem as pautas, sexta você grava, e o bruto vai pro editor. Estavam separados só porque cada peça é um script.",
    membros: [{ id: "3890db81" }, { id: "455a8267" }, { id: "422fd5b7" }, { id: "5352dad3" }],
    ligacoes: [
      ["3890db81", "455a8267", "quarta: ideias"],
      ["455a8267", "422fd5b7", "sexta: gravar"],
      ["422fd5b7", "5352dad3", "você envia o vídeo"],
    ],
  },
  {
    slug: "ideias-carrossel",
    icone: "📸",
    titulo: "Ideias e carrossel de Instagram",
    resumo: "As ideias que chegam pela Donna e pelo quadro de conteúdos viram carrossel pronto.",
    porque: "As duas portas de entrada (Donna e Radar) gravam no mesmo lugar, a coluna IDEIAS do banco Conteúdos, e é de lá que a squad de carrossel parte.",
    membros: [{ id: "3a1c5bd1" }, { id: "e80ccc82" }, { id: "bbdeea3e" }],
    ligacoes: [
      ["3a1c5bd1", "bbdeea3e", "ideia guardada"],
      ["e80ccc82", "bbdeea3e", "ideia com pesquisa"],
    ],
  },
  {
    slug: "financas",
    icone: "💰",
    titulo: "Finanças da casa",
    resumo: "Do banco e do WhatsApp até o Notion, mais o aviso de contas perto de vencer.",
    porque: "Tudo escreve nas mesmas tabelas do Notion. O 'dispatcher ensure' só mantém vivo o processo que lê o grupo de finanças: é o primeiro degrau da cadeia WhatsApp → Louis → Notion.",
    membros: [
      { id: "a4a9889e" }, { id: "144398ee" },
      { id: "2dfbdb58", nome: "Traz as transações dos bancos (Pluggy)" },
      { id: "b6bda8c8", nome: "Atualiza os saldos das contas" },
      { id: "d0634136", nome: "Aviso de contas perto do vencimento" },
    ],
    ligacoes: [
      ["a4a9889e", "144398ee", "mantém ligado"],
      ["2dfbdb58", "b6bda8c8", "depois dos lançamentos"],
      ["b6bda8c8", "d0634136", "saldos conferidos"],
    ],
  },
  {
    slug: "donna-dia-a-dia",
    icone: "🗓️",
    titulo: "Donna no dia a dia",
    resumo: "Resumo da manhã, aviso de compromisso, escola do Luiz e o que você manda guardar.",
    porque: "É tudo a Donna cuidando da agenda e da casa. O briefing do WhatsApp é cópia do Telegram, a escola tem aviso e relatório da mesma agenda, e o 'guarda filme, livro e compra' é a mesma Donna anotando.",
    membros: [{ id: "6a105095" }, { id: "57a89e2e" }, { id: "9403a9da" }, { id: "f3cf1cd8" }, { id: "32d7a394" }, { id: "b88ee029" }],
    ligacoes: [
      ["6a105095", "57a89e2e", "mesmo resumo"],
      ["f3cf1cd8", "32d7a394", "mesma agenda"],
    ],
  },
  {
    slug: "saude-vps",
    icone: "🩺",
    titulo: "Saúde e segurança dos sistemas",
    resumo: "Quem vigia se está tudo funcionando, quem avisa quando algo cai e a cópia de segurança.",
    porque: "Todos têm o mesmo propósito (saber se algo parou e consertar). O restart, o watchdog e o necrotério do Telegram são três tempos da mesma história; o semáforo, o alerta da Donna e a ronda usam os mesmos sinais.",
    membros: [
      { id: "a3eb53a2" }, { id: "1e65b77a" }, { id: "2667808f" },
      { id: "a05e09b8" }, { id: "b16013c7" },
      { id: "94c60e3b", nome: "Necrotério do Telegram" },
      { id: "be4b019e" },
    ],
    ligacoes: [
      ["a3eb53a2", "1e65b77a", "problema vira aviso"],
      ["a3eb53a2", "2667808f", "revisão mais funda"],
      ["a05e09b8", "b16013c7", "se travar"],
      ["b16013c7", "94c60e3b", "se o Telegram cair"],
    ],
  },
  {
    slug: "painel-equipe-memoria",
    icone: "🖥️",
    titulo: "Painel, equipe e memória",
    resumo: "Rotinas de madrugada que mantêm o painel, a equipe e o mapa de conhecimento em dia.",
    porque: "Rodam sozinhas de madrugada e alimentam páginas do painel (métricas, equipe, grafo, desenhos de fluxo). Criar agente fica aqui porque o agente novo aparece na equipe pública.",
    membros: [{ id: "47b33465" }, { id: "539c9aa3" }, { id: "3787b3b9" }, { id: "a4d3382c" }, { id: "e0ec4684" }],
    ligacoes: [["e0ec4684", "539c9aa3", "agente novo na equipe"]],
  },
  {
    slug: "licitacao-igam",
    icone: "🏛️",
    titulo: "Licitação Igam",
    resumo: "A equipe de agentes que monta os documentos do processo, e o caminho que ele segue depois.",
    porque: "O GPOF é o setor para onde o processo segue depois da squad: é o mesmo caminho do processo, só que uma parte é a IA e a outra é manual.",
    membros: [{ id: "86017c53" }, { id: "738a9db2" }],
    ligacoes: [["86017c53", "738a9db2", "o processo segue"]],
  },
];

/** Nomes amigáveis pros fluxos cujo título é um comando (valem também na galeria). */
export const NOME_AMIGAVEL: Record<string, string> = Object.fromEntries(
  MACROS.flatMap((m) => m.membros.filter((x) => x.nome).map((x) => [x.id, x.nome!] as const)),
);

/** Nome simples: o que o curador escreveu em linguagem de gente, senão o apelido, senão o título. */
export function nomeDoFluxo(f: Pick<FlowDoc, "id" | "title" | "nodes">): string {
  return leigoDoFluxo(f)?.nome || NOME_AMIGAVEL[f.id.slice(0, 8)] || f.title;
}

export interface MacroMontado {
  def: MacroDef;
  fluxos: FlowDoc[];
}

const OUTROS: MacroDef = {
  slug: "outros", icone: "🗂️", titulo: "Outros", resumo: "Fluxos que ainda não entraram em nenhum grupo.", porque: "Novos ou ainda não classificados.", membros: [], ligacoes: [],
};

/** A migração 006 está aplicada? (a coluna `grupo` veio nas linhas de flows_doc) */
export function temGruposNoBanco(flows: FlowDoc[], grupos: FlowGrupo[] | null | undefined): boolean {
  return !!grupos?.length && flows.some((f) => "grupo" in f);
}

/** Grupo padrão de um fluxo segundo o macro-fluxos.ts (pelos 8 primeiros caracteres do id). */
function slugDeclarado(f: FlowDoc): string | null {
  return MACROS.find((m) => m.membros.some((x) => f.id.startsWith(x.id)))?.slug ?? null;
}

/**
 * Casa a configuração com os fluxos reais; o que sobrar vai pra "Outros".
 * Com a migração 006 (grupos no banco): o grupo de cada fluxo vem da coluna `grupo` (senão, do padrão
 * do macro-fluxos.ts), o nome/emoji/ordem dos grupos vêm da tabela e dá pra arrastar fluxo entre grupos.
 * Sem a migração: igual a antes, só pelo macro-fluxos.ts.
 */
export function montaMacros(flows: FlowDoc[], grupos?: FlowGrupo[] | null): MacroMontado[] {
  if (temGruposNoBanco(flows, grupos)) return montaDoBanco(flows, grupos!);
  const usados = new Set<string>();
  const out: MacroMontado[] = MACROS.map((def) => {
    const fluxos = def.membros
      .map((m) => flows.find((f) => f.id.startsWith(m.id)))
      .filter((f): f is FlowDoc => !!f);
    fluxos.forEach((f) => usados.add(f.id));
    return { def, fluxos };
  }).filter((m) => m.fluxos.length > 0);
  const sobras = flows.filter((f) => !usados.has(f.id));
  if (sobras.length) {
    out.push({ def: { ...OUTROS, membros: sobras.map((f) => ({ id: f.id.slice(0, 8) })) }, fluxos: sobras });
  }
  return out;
}

function montaDoBanco(flows: FlowDoc[], grupos: FlowGrupo[]): MacroMontado[] {
  const porSlug = new Map<string, FlowDoc[]>();
  for (const f of flows) {
    const slug = f.grupo || slugDeclarado(f) || "outros";
    const alvo = grupos.some((g) => g.slug === slug) ? slug : (slugDeclarado(f) && grupos.some((g) => g.slug === slugDeclarado(f)) ? slugDeclarado(f)! : "outros");
    porSlug.set(alvo, [...(porSlug.get(alvo) || []), f]);
  }
  const posicao = (f: FlowDoc, slug: string) => {
    if (f.ordem != null) return f.ordem;
    const i = MACROS.find((m) => m.slug === slug)?.membros.findIndex((x) => f.id.startsWith(x.id)) ?? -1;
    return i >= 0 ? i + 1 : 10_000;
  };
  const monta = (def: MacroDef, slug: string): MacroMontado | null => {
    const fluxos = (porSlug.get(slug) || []).slice().sort((a, b) => posicao(a, slug) - posicao(b, slug) || a.title.localeCompare(b.title));
    return fluxos.length ? { def: { ...def, membros: fluxos.map((f) => ({ id: f.id.slice(0, 8) })) }, fluxos } : null;
  };
  const out: MacroMontado[] = [];
  for (const g of [...grupos].sort((a, b) => a.ordem - b.ordem)) {
    const base = MACROS.find((m) => m.slug === g.slug);
    const def: MacroDef = base
      ? { ...base, titulo: g.nome || base.titulo, icone: g.emoji || base.icone }
      : { slug: g.slug, icone: g.emoji, titulo: g.nome, resumo: "Grupo criado por você.", porque: "Montado por você na lista do Mapa.", membros: [], ligacoes: [] };
    const m = monta(def, g.slug);
    if (m) out.push(m);
  }
  const o = monta(OUTROS, "outros");
  if (o) out.push(o);
  return out;
}
