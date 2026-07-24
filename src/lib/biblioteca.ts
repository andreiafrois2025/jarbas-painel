// Catálogo da Biblioteca: tudo que foi criado (com links diretos) e as
// skills/capacidades disponíveis. Mantido pelo Claude — pede pra ele
// adicionar itens novos aqui quando algo for criado.
//
// A partir de 19/07/2026 o catálogo também pode vir AO VIVO da squad-api
// (GET /api/catalogo), lendo skills/automações/squads reais da VPS. Os
// catálogos estáticos abaixo continuam existindo como FALLBACK — se a API
// estiver fora do ar ou a sessão não estiver logada, a tela usa esses dados.

import { squadFetch } from "./squadFetch";

export interface LinkItem {
  rotulo: string;
  url: string;
}

// ── Tipos do catálogo ao vivo (shape de /api/catalogo) ──

export interface SkillApiItem {
  nome: string;
  descricao: string;
  descricao_simples?: string; // versão não-técnica, pra mostrar no card
  fonte_nome?: string; // "Andréia Frois" (padrão) ou nome da fonte externa
  fonte_url?: string; // link da fonte externa, se houver
  conteudo: string; // SKILL.md inteiro
}

export interface AutomacaoApiItem {
  nome: string;
  agenda: string; // expressão cron
  comando: string;
}

export interface CriacaoApiItem {
  icone: string;
  nome: string;
  descricao: string;
  links: LinkItem[];
  grupo: string;
  origem: string;
  criado_em?: string;
}

export interface Catalogo {
  skills: SkillApiItem[];
  automacoes: AutomacaoApiItem[];
  squads: string[];
  criacoes: CriacaoApiItem[];
}

// Busca o catálogo ao vivo. Retorna null em qualquer falha (API fora,
// sessão expirada, etc.) para o componente cair no fallback estático.
export async function fetchCatalogo(): Promise<Catalogo | null> {
  try {
    const resp = await squadFetch("/api/catalogo");
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      skills: Array.isArray(data.skills)
        ? data.skills.map((s: SkillApiItem) => ({
            ...s,
            descricao_simples: s.descricao_simples || s.descricao,
            fonte_nome: s.fonte_nome || "Andréia Frois",
          }))
        : [],
      automacoes: Array.isArray(data.automacoes) ? data.automacoes : [],
      squads: Array.isArray(data.squads) ? data.squads : [],
      criacoes: Array.isArray(data.criacoes) ? data.criacoes : [],
    };
  } catch {
    return null;
  }
}

export interface NovaCriacaoPayload {
  icone: string;
  nome: string;
  descricao: string;
  links: LinkItem[];
  grupo: string;
  origem: string;
}

// Cria uma criação manual (ex.: algo feito num GPT, fora da VPS).
export async function criarCriacao(
  payload: NovaCriacaoPayload
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const resp = await squadFetch("/api/criacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: false, erro: data.error || data.erro || `falha (${resp.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao salvar" };
  }
}

export interface Criacao {
  icone: string;
  nome: string;
  descricao: string;
  links: LinkItem[];
}

export const CRIACOES: { grupo: string; itens: Criacao[] }[] = [
  {
    grupo: "Painéis e sites",
    itens: [
      {
        icone: "🖥️", nome: "Painel Jarbas (este painel)",
        descricao: "Next.js + Supabase na Vercel. Deploy automático a cada push na main.",
        links: [
          { rotulo: "Produção", url: "https://painel.andreiafrois.tech" },
          { rotulo: "Repositório GitHub", url: "https://github.com/andreiafrois2025/jarbas-painel" },
          { rotulo: "Deploys (Vercel)", url: "https://vercel.com/andreiafrois2025s-projects/jarbas-painel" },
          { rotulo: "Banco (Supabase)", url: "https://supabase.com/dashboard/project/pmmyqljiuslstwbmiron" },
        ],
      },
      {
        icone: "🎤", nome: "Modo palco (métricas de palestra)",
        descricao: "Tela pública pra projetar em apresentações, em 2 versões.",
        links: [
          { rotulo: "Versão conteúdo", url: "https://painel.andreiafrois.tech/metricas/palestra" },
          { rotulo: "Versão serviço público", url: "https://painel.andreiafrois.tech/metricas/palestra?tema=trabalho" },
        ],
      },
      {
        icone: "🌐", nome: "Site pessoal",
        descricao: "andreiafrois.tech — destino do funil (palestras, imersão).",
        links: [{ rotulo: "Abrir site", url: "https://andreiafrois.tech" }],
      },
    ],
  },
  {
    grupo: "Notion (Segundo Cérebro)",
    itens: [
      {
        icone: "📡", nome: "Radar de Posts IA",
        descricao: "O kanban de curadoria: notícias, dicas e pautas de reels. Onde você aprova tudo.",
        links: [{ rotulo: "Abrir Radar", url: "https://app.notion.com/p/391b90b9061d81d993b7dc2de46eab87" }],
      },
      {
        icone: "🏭", nome: "Produção de Conteúdo (hub)",
        descricao: "Banco de Ideias, Esteira, Planejamento, Revisão Semanal.",
        links: [{ rotulo: "Abrir hub", url: "https://app.notion.com/p/2fbb90b9061d812f9afce74e767879eb" }],
      },
      {
        icone: "✅", nome: "Acompanhamento de tarefas",
        descricao: "Sua lista oficial — os agentes criam tarefas aqui e avisam no WhatsApp.",
        links: [{ rotulo: "Abrir tarefas", url: "https://app.notion.com/p/a73b90b9061d8299899f81c8938e9de6" }],
      },
      {
        icone: "📈", nome: "Estratégia 2026 (rascunhos)",
        descricao: "Plano de crescimento, rotina semanal, plano de aulas — aguardando sua validação.",
        links: [{ rotulo: "Abrir rascunhos", url: "https://app.notion.com/p/39bb90b9061d819097fdc13ba4df0f1e" }],
      },
    ],
  },
  {
    grupo: "Arquivos e acervos",
    itens: [
      {
        icone: "☁️", nome: "Google Drive (JarbasDrive2)",
        descricao: "Marca (mini-guia de fotografia), Instagram/Reels e Carrosseis, backups da VPS.",
        links: [{ rotulo: "Abrir Drive", url: "https://drive.google.com/drive/my-drive" }],
      },
      {
        icone: "⚡", nome: "Bot do Telegram (Jarbas)",
        descricao: "Fale com o Claude de qualquer lugar; envie vídeos brutos pro reels-studio.",
        links: [{ rotulo: "Abrir chat", url: "https://t.me/jarbas_af_bot" }],
      },
    ],
  },
];

export interface SkillItem {
  icone: string;
  nome: string;
  descricao: string;
  como: string; // como acionar
}

export const SKILLS: { grupo: string; itens: SkillItem[] }[] = [
  {
    grupo: "Personas (16 especialistas — no Claude Code e Telegram)",
    itens: [
      { icone: "🤵", nome: "/jarbas", descricao: "Orquestrador: entende o pedido e chama o especialista certo.", como: "/jarbas no terminal ou Telegram" },
      { icone: "✍️", nome: "/izzy", descricao: "Copywriter no seu estilo (legendas, ganchos, CTAs).", como: "/izzy" },
      { icone: "🔍", nome: "/mike", descricao: "Jornalista investigativo/OSINT: pesquisa e apuração.", como: "/mike" },
      { icone: "📜", nome: "/katrina + /harvey", descricao: "Jurídico: Katrina estrutura (ETP/TR), Harvey revisa (parecer).", como: "/katrina · /harvey" },
      { icone: "🧭", nome: "demais especialistas", descricao: "Donna, Eric, Felipe, Junior, Tonny, Theo, Rafaela, Louis, Lara, Nara, Sofia.", como: "/nome no terminal" },
    ],
  },
  {
    grupo: "Squads (times de agentes — aba Squads)",
    itens: [
      { icone: "🎠", nome: "instagram-carrossel", descricao: "Tema → carrossel completo: pesquisa, copy, arte 1080×1350, legenda. Checkpoints humanos.", como: "botão Iniciar na aba Squads, ou /noticia /tutorial /persona" },
      { icone: "⚖️", nome: "licitacao-igam", descricao: "Pipeline do processo licitatório (ETP, TR, pareceres) no padrão Igam.", como: "aba Squads" },
      { icone: "🤖", nome: "criar-agente", descricao: "Documenta um GPT/agente novo: prompt, nome, configurações.", como: "aba Squads" },
    ],
  },
  {
    grupo: "Automações (rodam sozinhas — desenhos na aba Fluxos)",
    itens: [
      { icone: "📡", nome: "Radar de notícias", descricao: "Mike busca RSS 3x/dia, cria cards, Izzy escreve, sender publica no grupo (com agendamento).", como: "automática — você só aprova no kanban" },
      { icone: "🎬", nome: "Pipeline de reels", descricao: "Pautas qua 18h + roteiros qui à noite, no seu estilo, com aviso no WhatsApp.", como: "automática — aprova no kanban" },
      { icone: "🧠", nome: "Aprendiz de estilo", descricao: "Aprende com suas aprovações/edições e recalibra o Mike toda semana.", como: "automática (domingo)" },
      { icone: "🚨", nome: "Donna vigilante", descricao: "Verifica entregas de 5 em 5 min e te alerta no WhatsApp quando algo quebra.", como: "automática" },
    ],
  },
  {
    grupo: "Ferramentas (na VPS, via chat ou Telegram)",
    itens: [
      { icone: "✂️", nome: "Reels-studio (\"meu CapCut\")", descricao: "Vídeo bruto → editado: corta silêncios e \"corta isso\", legendas na sua marca, capa da série.", como: "manda o vídeo no Telegram" },
      { icone: "🎧", nome: "Transcrição Whisper", descricao: "Áudio/vídeo → texto, local e grátis.", como: "manda áudio no Telegram" },
      { icone: "🖼️", nome: "Template tweet da marca", descricao: "Slide estilo tweet com sua foto oficial, IBM Plex, fundo branco.", como: "usado pela squad de carrossel" },
      { icone: "📊", nome: "Dataviz", descricao: "Gráficos e dashboards com método de design validado (este painel usa).", como: "pede um gráfico no chat" },
      { icone: "🎨", nome: "Gerador de apresentações", descricao: "Tema → slides na sua marca (IBM Plex + paleta AF) + notas de fala. Substitui o Gamma.", como: "me pede um deck no chat (presets palestra ou Igam)" },
      { icone: "📥", nome: "Central de Captura da Donna", descricao: "Manda áudio/foto/print/link no WhatsApp; ela classifica e roteia (tarefa, ideia, escola do Luiz, demanda).", como: "manda qualquer coisa no WhatsApp da Donna" },
      { icone: "🎒", nome: "Agenda escolar do Luiz", descricao: "Foto do caderno vira agenda com prazos + avisos D-3/D-1 e relatório de domingo no WhatsApp.", como: "manda a foto da tarefa pra Donna" },
    ],
  },
  {
    grupo: "Suas skills personalizadas (em construção)",
    itens: [
      { icone: "🎨", nome: "design-marca-af (próxima!)", descricao: "Skill com a sua Plataforma de Marca inteira: paleta, IBM Plex + Special Elite, tom, modelos — pra qualquer agente criar já dentro da marca.", como: "me pede no chat que eu crio com você" },
    ],
  },
];
