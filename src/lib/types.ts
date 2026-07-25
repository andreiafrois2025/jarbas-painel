// =============================================
// Tipos do Jarbas — Estrutura de dados do sistema
// =============================================

/** Sub-link — função adicional de um agente */
export interface SubLink {
  label: string;  // Nome da função ex: "Atendimento", "RH", "Folha"
  url: string;    // Link do GPT/ferramenta
  tool_name?: string; // IA/ferramenta específica desta função (ex: "Claude", "GPT")
}

/** Agente de IA — representa um funcionário do escritório */

/** Categoria/Sala — ambiente dentro de um contexto */
export interface Category {
  id: string;
  name: string;
  order: number;
  context: string; // "IGAM" | "AndréIA" | "Pessoal" | "Família"
  user_id?: string;
}

/** Contextos disponíveis no painel */
export const CONTEXTS = ["IGAM", "AndréIA", "Pessoal", "Família"] as const;
export type ContextType = typeof CONTEXTS[number];

/** Fluxo — sequência de ações entre agentes */

/** Etapa de um fluxo */

// =============================================
// Fluxos-desenho (n8n-like, só documentação, não executa)
// Ficam em tabela separada `flows_doc` pra não misturar com o Flow antigo.
// =============================================

export type FlowCategory = "squad" | "automation" | "manual";

/** Node do desenho — compatível com React Flow */
export interface FlowDocNode {
  id: string;
  type: "start" | "action" | "condition" | "note" | "end";
  position: { x: number; y: number };
  data: {
    label: string;
    /** Descrição longa que aparece ao clicar no node */
    details?: string;
    /** Ícone emoji */
    icon?: string;
    /** Quem executa (agente, sistema, humano) */
    executor?: string;
    /** Tags livres (Notion, WhatsApp, cron, etc.) */
    tags?: string[];
  };
}

/** Edge do desenho — compatível com React Flow */
export interface FlowDocEdge {
  id: string;
  source: string;
  target: string;
  /** Qual handle no node de origem — "top" | "right" | "bottom" | "left" */
  sourceHandle?: string;
  /** Qual handle no node de destino */
  targetHandle?: string;
  /** Rótulo que aparece na seta (ex: "aprovado", "rejeitado", "condição X") */
  label?: string;
  /** Se true, é seta de retorno (loopback) — desenha animada */
  isReturn?: boolean;
}

export interface FlowDoc {
  id: string;
  title: string;
  category: FlowCategory;
  description?: string;
  nodes: FlowDocNode[];
  edges: FlowDocEdge[];
  is_seed?: boolean;
  is_public?: boolean;
  /** Coluna do kanban interno (texto livre por usuário) */
  kanban_column?: string | null;
  /** Ordem dentro da coluna */
  kanban_order?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** Coluna do kanban interno de fluxos — gerenciada pelo usuário */
export interface FlowColumn {
  id: string;
  user_id?: string;
  category: FlowCategory;
  name: string;
  order: number;
  created_at?: string;
}

/** Registro de execução */

// =============================================
// Novo modelo: Colaborador + Atribuição
// =============================================

/** Colaborador — identidade visual (personagem no escritório) */
export interface Collaborator {
  id: string;
  name: string;
  gender: "male" | "female";
  skin_tone: number;
  hair_color: number;
  shirt_color: number;
  has_glasses: boolean;
  icon: string;
  /** Detalhamento sobre o colaborador (bio/perfil) */
  bio?: string;
  /** Formação e especialização profissional */
  specialization?: string;
  /** Habilidades e ferramentas que domina */
  skills?: string;
  /** Traços de personalidade e jeito de trabalhar */
  personality?: string;
  /** Status: ativo ou desligado */
  status?: "active" | "dismissed";
  user_id?: string;
  created_at?: string;
}

/** Atribuição — o que o colaborador faz em uma sala específica */
export interface Assignment {
  id: string;
  collaborator_id: string;
  category_id: string;
  tool_name: string;
  link: string;
  description?: string;
  type: "manual" | "automatic";
  sub_links?: SubLink[];
  /** Tempo economizado por execução em minutos */
  time_saved_minutes?: number;
  user_id?: string;
  created_at?: string;
  // Dados joined (para conveniência)
  collaborator?: Collaborator;
  category?: Category;
}

/** Documento anexado a um squad — fica disponível para os agentes lerem antes/durante a execução */
export interface SquadDocument {
  /** Nome original do arquivo enviado pela Andréia */
  name: string;
  /** URL pública (Supabase Storage) ou caminho dentro do bucket */
  url: string;
  /** Caminho dentro do bucket (para deletar) */
  path: string;
  /** Tamanho em bytes */
  size: number;
  /** Tipo MIME (ex: application/pdf) */
  mime_type?: string;
  /** Quando foi enviado */
  uploaded_at: string;
}

/** Squad — pipeline multi-agente que pode atuar em múltiplos contextos */
export interface Squad {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  /** URL para abrir/acessar o squad */
  link?: string;
  /** Contextos onde este squad aparece (ex: ["AndréIA", "IGAM"]) */
  contexts: string[];
  /** IDs dos colaboradores envolvidos, em ordem de pipeline */
  collaborator_ids?: string[];
  /** Documentos anexados (proposta comercial, carta de exclusividade, ETP de referência, etc) */
  documents?: SquadDocument[];
  status?: "active" | "inactive";
  user_id?: string;
  created_at?: string;
}

/** Quick-link — atalho global no cabeçalho */
export interface QuickLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  order: number;
  user_id?: string;
}

/** Produto/entrega de uma área/setor */

/** Ocupante da mesa — combina colaborador + atribuição para renderização */
export interface DeskOccupant {
  assignment: Assignment;
  collaborator: Collaborator;
}


/** Categorias/Salas padrão para novos usuários */
export const DEFAULT_CATEGORIES: { name: string; context: string; order: number }[] = [
  // IGAM
  { name: "Geotecnologias", context: "IGAM", order: 0 },
  { name: "Comunicação & Divulgação", context: "IGAM", order: 1 },
  { name: "Dados & Análise", context: "IGAM", order: 2 },
  { name: "Administrativo", context: "IGAM", order: 3 },
  { name: "Planejamento Estratégico", context: "IGAM", order: 4 },
  // AndréIA
  { name: "Produção", context: "AndréIA", order: 0 },
  { name: "Publicação", context: "AndréIA", order: 1 },
  { name: "Cursos", context: "AndréIA", order: 2 },
  { name: "Comunidade", context: "AndréIA", order: 3 },
  { name: "Financeiro", context: "AndréIA", order: 4 },
  { name: "Administrativo AndréIA", context: "AndréIA", order: 5 },
  { name: "Planejamento AndréIA", context: "AndréIA", order: 6 },
  // Família
  { name: "Finanças", context: "Família", order: 0 },
  { name: "Luiz Fernando", context: "Família", order: 1 },
  { name: "Viagens & Lazer", context: "Família", order: 2 },
  { name: "Casa", context: "Família", order: 3 },
  // Pessoal
  { name: "Pessoal", context: "Pessoal", order: 0 },
];

/** Agentes padrão para novos usuários */
