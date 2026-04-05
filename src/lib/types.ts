// =============================================
// Tipos do Jarbas — Estrutura de dados do sistema
// =============================================

/** Sub-link — função adicional de um agente */
export interface SubLink {
  label: string;  // Nome da função ex: "Atendimento", "RH", "Folha"
  url: string;    // Link do GPT/ferramenta
}

/** Agente de IA — representa um funcionário do escritório */
export interface Agent {
  id: string;
  /** Nome personalizado do agente (aparece acima da cabeça) ex: "Jarvis", "Ana" */
  agent_name?: string;
  /** Nome da IA/ferramenta (aparece na plaquinha da mesa) ex: "Claude", "ChatGPT" */
  name: string;
  /** Link para abrir a ferramenta */
  link: string;
  /** Categoria/workspace (aba) ex: "Trabalho", "Pessoal" */
  category: string;
  /** Tipo de execução */
  type: "manual" | "automatic";
  /** Ícone emoji */
  icon?: string;
  /** Função/descrição curta (aparece na mesa, linha 2) ex: "Chat", "Imagem" */
  description?: string;
  /** Gênero do bonequinho */
  gender?: "male" | "female";
  /** Tom de pele (índice 0-5) */
  skin_tone?: number;
  /** Cor do cabelo (índice 0-9) */
  hair_color?: number;
  /** Cor da camisa (índice 0-9) */
  shirt_color?: number;
  /** Usa óculos */
  has_glasses?: boolean;
  /** Links adicionais — cada botão abre um GPT/ferramenta diferente */
  sub_links?: SubLink[];
  user_id?: string;
  created_at?: string;
}

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
export interface Flow {
  id: string;
  name: string;
  steps: FlowStep[];
  user_id?: string;
  created_at?: string;
}

/** Etapa de um fluxo */
export interface FlowStep {
  agentId: string;
  action: string;
  order: number;
}

/** Registro de execução */
export interface Execution {
  id: string;
  flow_id?: string;
  agent_id?: string;
  result?: string;
  status: "running" | "completed" | "failed";
  created_at?: string;
  user_id?: string;
}

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
  user_id?: string;
  created_at?: string;
  // Dados joined (para conveniência)
  collaborator?: Collaborator;
  category?: Category;
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

/** Ocupante da mesa — combina colaborador + atribuição para renderização */
export interface DeskOccupant {
  assignment: Assignment;
  collaborator: Collaborator;
}

/** Converter DeskOccupant para Agent (adapter para OfficeScene) */
export function occupantToAgent(occ: DeskOccupant): Agent {
  return {
    id: occ.assignment.id,
    agent_name: occ.collaborator.name,
    name: occ.assignment.tool_name,
    link: occ.assignment.link,
    category: occ.assignment.category?.name || "",
    type: occ.assignment.type,
    icon: occ.collaborator.icon,
    description: occ.assignment.description,
    gender: occ.collaborator.gender,
    skin_tone: occ.collaborator.skin_tone,
    hair_color: occ.collaborator.hair_color,
    shirt_color: occ.collaborator.shirt_color,
    has_glasses: occ.collaborator.has_glasses,
    sub_links: occ.assignment.sub_links,
  };
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
export const DEFAULT_AGENTS: Omit<Agent, "id" | "user_id" | "created_at">[] = [
  {
    agent_name: "Atlas",
    name: "ChatGPT",
    link: "https://chat.openai.com",
    category: "Dados & Análise",
    type: "manual",
    icon: "🤖",
    description: "Chat",
    gender: "male",
  },
  {
    agent_name: "Sofia",
    name: "Claude",
    link: "https://claude.ai",
    category: "Produção",
    type: "manual",
    icon: "🧠",
    description: "Chat",
    gender: "female",
  },
  {
    agent_name: "Neo",
    name: "Gemini",
    link: "https://gemini.google.com",
    category: "Dados & Análise",
    type: "manual",
    icon: "💎",
    description: "Chat",
    gender: "male",
  },
  {
    agent_name: "Luna",
    name: "Midjourney",
    link: "https://www.midjourney.com",
    category: "Produção",
    type: "manual",
    icon: "🎨",
    description: "Imagem",
    gender: "female",
  },
  {
    agent_name: "Max",
    name: "Perplexity",
    link: "https://www.perplexity.ai",
    category: "Geotecnologias",
    type: "manual",
    icon: "🔍",
    description: "Pesquisa",
    gender: "male",
  },
];
