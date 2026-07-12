// Catálogo público da equipe de agentes — usado no modo palco (clicável)
// e nas métricas. Sem dados sensíveis: pode aparecer em projeção.

export interface Agente {
  icone: string;
  nome: string;
  papel: string;
  descricao: string;
  habilidades: string[];
}

// Versão pública COMPLETA (dados reais do RH, sincronizados pela VPS —
// /root/equipe-sync.py — sem links privados). O palco usa esta com
// fallback pro catálogo estático abaixo.
export interface AgentePublico {
  nome: string;
  icone: string;
  papel: string;
  bio: string;
  skills: string[];
  personalidade: string;
  funcoes: { nome: string; descricao: string }[];
}

const EQUIPE_PUBLICA_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/equipe-publica.json";

export async function fetchEquipePublica(): Promise<AgentePublico[] | null> {
  try {
    const r = await fetch(`${EQUIPE_PUBLICA_URL}?t=${Date.now()}`);
    const d = await r.json();
    return Array.isArray(d?.equipe) && d.equipe.length ? d.equipe : null;
  } catch {
    return null;
  }
}

export function fallbackPublico(): AgentePublico[] {
  return EQUIPE.map((a) => ({
    nome: a.nome, icone: a.icone, papel: a.papel, bio: a.descricao,
    skills: a.habilidades, personalidade: "", funcoes: [],
  }));
}

export const EQUIPE: Agente[] = [
  { icone: "🤵", nome: "Jarbas", papel: "Orquestrador",
    descricao: "O orquestrador digital: entende o pedido, decide quem da equipe deve agir e acompanha até entregar.",
    habilidades: ["Roteamento de demandas", "Ronda diária do ecossistema", "Coordenação de squads"] },
  { icone: "🗂️", nome: "Donna", papel: "Assistente executiva",
    descricao: "O braço direito no WhatsApp: briefing matinal, avisos de tarefas, alertas de falha e envios pro grupo.",
    habilidades: ["Briefing diário (agenda + tarefas)", "Alertas de qualquer falha do sistema", "Publicação no grupo com agendamento"] },
  { icone: "🔍", nome: "Mike", papel: "Jornalista investigativo",
    descricao: "Monitora dezenas de fontes de IA por dia e propõe só o que tem cara de aprovação — e aprende com cada decisão.",
    habilidades: ["Curadoria de notícias (RSS + scoring)", "Pesquisa OSINT", "Aprende o gosto dela toda semana"] },
  { icone: "✍️", nome: "Izzy", papel: "Copywriter",
    descricao: "Escreve posts, legendas e roteiros no estilo da Andréia — e é re-treinada pelas edições que ela faz.",
    habilidades: ["Posts e legendas sem cara de IA", "Roteiros de reels", "Aprende com as edições dela"] },
  { icone: "🎨", nome: "Felipe", papel: "Designer",
    descricao: "Guardião da identidade visual: carrosséis, slides e peças sempre dentro da Plataforma de Marca.",
    habilidades: ["Carrosséis 1080×1350", "Template tweet da marca", "Direção de arte"] },
  { icone: "🗺️", nome: "Eric", papel: "Geógrafo",
    descricao: "Especialista em geoprocessamento e recursos hídricos — o técnico das demandas do Igam.",
    habilidades: ["Geoprocessamento", "Análise ambiental", "Apoio técnico a pareceres"] },
  { icone: "⚖️", nome: "Dr. Harvey", papel: "Advogado revisor",
    descricao: "Revisa documentos jurídicos com rigor de parecer: aponta riscos, ressalvas e recomendações.",
    habilidades: ["Parecer jurídico", "Revisão de ETP/TR", "Lei 14.133 e normativos MG"] },
  { icone: "📜", nome: "Katrina", papel: "Advogada estruturadora",
    descricao: "Estrutura contratos e documentos de licitação do zero, no padrão do órgão.",
    habilidades: ["ETP e TR", "Contratos", "Processo licitatório Igam"] },
  { icone: "💻", nome: "Junior", papel: "Desenvolvedor",
    descricao: "Full-stack da casa: painel, automações e integrações que mantêm a fábrica rodando.",
    habilidades: ["Painel Next.js", "Automações Python", "Integrações (Notion, WhatsApp)"] },
  { icone: "📊", nome: "Tonny", papel: "Engenheiro de dados",
    descricao: "Transforma logs e planilhas em métricas e dashboards que contam a história certa.",
    habilidades: ["BI e dashboards", "Séries históricas", "Qualidade de dados"] },
  { icone: "🎬", nome: "Theo", papel: "Audiovisual",
    descricao: "Da pauta ao corte final: roteiros de vídeo e a edição automática do reels-studio.",
    habilidades: ["Roteiro de reels", "Edição automática (cortes+legendas)", "Capas de vídeo"] },
  { icone: "🧭", nome: "Rafaela", papel: "Estrategista",
    descricao: "Pensa o jogo longo: posicionamento, funil e metas que cabem na vida real.",
    habilidades: ["Estratégia de crescimento", "Planejamento editorial", "Funil palestras/cursos"] },
  { icone: "💰", nome: "Louis", papel: "Financeiro",
    descricao: "Organiza finanças por áudio no WhatsApp: categoriza, registra e mantém o Notion em dia.",
    habilidades: ["Registro por áudio", "Categorização automática", "Gestão no Notion"] },
  { icone: "🥗", nome: "Lara", papel: "Nutricionista",
    descricao: "Cuida da rotina alimentar da família com praticidade e sem terrorismo nutricional.",
    habilidades: ["Cardápios da semana", "Listas de compras", "Adaptações práticas"] },
  { icone: "🧠", nome: "Dra. Nara", papel: "Psicóloga",
    descricao: "Escuta e organiza o lado humano: carga mental, prioridades e equilíbrio.",
    habilidades: ["Organização de carga mental", "Clareza de prioridades", "Bem-estar na rotina"] },
  { icone: "📚", nome: "Sofia", papel: "Arquiteta da informação",
    descricao: "Bibliotecária do Segundo Cérebro: estrutura, conecta e torna tudo encontrável.",
    habilidades: ["Arquitetura do Notion", "Taxonomias e conexões", "Repositórios e acervos"] },
];
