// =============================================
// Tipos do Jarbas — Estrutura de dados do sistema
// =============================================

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
  user_id?: string;
  created_at?: string;
}

/** Categoria/Aba — workspace do usuário */
export interface Category {
  id: string;
  name: string;
  order: number;
  user_id?: string;
}

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

/** Categorias padrão para novos usuários */
export const DEFAULT_CATEGORIES = [
  "Trabalho",
  "Pessoal",
  "Criação",
  "Pesquisa",
];

/** Agentes padrão para novos usuários */
export const DEFAULT_AGENTS: Omit<Agent, "id" | "user_id" | "created_at">[] = [
  {
    agent_name: "Atlas",
    name: "ChatGPT",
    link: "https://chat.openai.com",
    category: "Trabalho",
    type: "manual",
    icon: "🤖",
    description: "Chat",
    gender: "male",
  },
  {
    agent_name: "Sofia",
    name: "Claude",
    link: "https://claude.ai",
    category: "Trabalho",
    type: "manual",
    icon: "🧠",
    description: "Chat",
    gender: "female",
  },
  {
    agent_name: "Neo",
    name: "Gemini",
    link: "https://gemini.google.com",
    category: "Pesquisa",
    type: "manual",
    icon: "💎",
    description: "Chat",
    gender: "male",
  },
  {
    agent_name: "Luna",
    name: "Midjourney",
    link: "https://www.midjourney.com",
    category: "Criação",
    type: "manual",
    icon: "🎨",
    description: "Imagem",
    gender: "female",
  },
  {
    agent_name: "Max",
    name: "Perplexity",
    link: "https://www.perplexity.ai",
    category: "Pesquisa",
    type: "manual",
    icon: "🔍",
    description: "Pesquisa",
    gender: "male",
  },
  {
    agent_name: "Dev",
    name: "GitHub Copilot",
    link: "https://github.com/features/copilot",
    category: "Trabalho",
    type: "manual",
    icon: "👨‍💻",
    description: "Código",
    gender: "male",
  },
];
