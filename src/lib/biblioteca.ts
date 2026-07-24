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

// ── Catálogo externo (referência) — 24/07/2026 ──
// Material que a Andréia trouxe de fora pra avaliar. NADA aqui está
// instalado — é só uma vitrine de referência com passo a passo, no mesmo
// formato de card+modal das skills de verdade. Ver avaliação completa em
// /root/docs/skills-externas-avaliacao-2026-07-24.md.
export const REFERENCIAS_EXTERNAS: SkillApiItem[] = [
  {
    nome: "claude-code-setup (Anthropic)",
    descricao: "Plugin oficial que audita um projeto e recomenda hooks, skills, subagents e MCPs.",
    descricao_simples: "Escaneia seu projeto e sugere o que falta configurar — só leitura, não instala nada sozinho.",
    fonte_nome: "Anthropic (oficial)",
    fonte_url: "https://claude.ai/code",
    conteudo:
      "# claude-code-setup — plugin oficial da Anthropic\n\n" +
      "**Risco: baixo** — é só leitura, não instala nem modifica nada sozinho.\n\n" +
      "**O que é:** audita um projeto e recomenda hooks, skills, subagents e MCPs certos pro caso.\n\n" +
      "**Passo a passo:**\n" +
      "1. Abra o Claude Code dentro da pasta do projeto que quer auditar.\n" +
      "2. Cole no chat: `/plugin install claude-code-setup@claude-plugins-official`\n" +
      "3. Deixe ele escanear o projeto — devolve uma lista sob medida (MCP servers, skills, hooks, subagents, slash commands).\n" +
      "4. Você decide o que implementar depois; nada é aplicado automaticamente.\n\n" +
      "**Confiança:** aparece \"By: Anthropic\" na tela — é o próprio criador do Claude Code.\n\n" +
      "**Recomendação:** pode testar sem medo, num projeto não-crítico primeiro.",
  },
  {
    nome: "frontend-design + impeccable",
    descricao: "Skills de gosto de design pro Claude: direção estética antes do CSS, passe de qualidade determinístico.",
    descricao_simples: "Ajuda o Claude a ter mais \"olho\" de design em telas e interfaces (grid, cor, tipografia, contraste).",
    fonte_nome: "Anthropic + Paul Bakaus",
    fonte_url: "https://github.com/anthropics/skills",
    conteudo:
      "# frontend-design (Anthropic) + impeccable (Paul Bakaus)\n\n" +
      "**Risco: baixo** — são prompts de estilo, não scripts com comandos livres.\n\n" +
      "**O que fazem:** obrigam a escolher uma direção estética antes de codar, banem fonte padrão genérica, " +
      "e rodam um \"passe de qualidade\" (grid de 4px, cor OKLCH, tipografia fluida, contraste acessível).\n\n" +
      "**Por que importa:** relevante pro nosso painel — evita cara de protótipo.\n\n" +
      "**Passo a passo:**\n" +
      "```\nnpx skills add anthropics/skills --skill frontend-design\n```\n" +
      "```\nnpx impeccable install\n# depois, dentro do Claude Code:\n/impeccable init\n```\n" +
      "Uso depois de instalado: comandos de uma palavra — `polish`, `critique`, `animate`.\n\n" +
      "**Recomendação:** dá pra testar no painel.",
  },
  {
    nome: "Find Skills / npx skills (Vercel Labs)",
    descricao: "Busca entre +700 mil skills prontas e instala a certa a partir do que você descrever.",
    descricao_simples: "Você diz o que está construindo, ela acha a skill certa numa biblioteca gigante e instala sozinha.",
    fonte_nome: "Vercel Labs",
    fonte_url: "https://github.com/vercel-labs/skills",
    conteudo:
      "# Find Skills / npx skills (vercel-labs/skills)\n\n" +
      "**Risco: médio** — instala skills de terceiro automaticamente, sem revisão manual prévia.\n\n" +
      "**O que é:** vasculha um diretório com +700 mil skills prontas, filtra as mais confiáveis e instala sozinha.\n\n" +
      "**Passo a passo:**\n" +
      "1. No terminal, dentro do projeto: `npx skills`\n" +
      "2. Peça em português o que precisa (ex: \"skill pra revisar PR\", \"skill pra landing page\").\n" +
      "3. Ela busca, filtra as \"seguras\" e instala.\n\n" +
      "**Ressalva:** o filtro de segurança é dela, não nosso — prefiro revisar manualmente antes de aceitar " +
      "instalação automática em massa.\n\n" +
      "**Recomendação:** posso usar pra buscar e sugerir, decidindo com você antes de deixar instalar sozinha.",
  },
  {
    nome: "Superpowers",
    descricao: "Força o Claude a planejar e revisar o próprio trabalho antes de tocar no projeto de verdade.",
    descricao_simples: "Deixa o Claude mais metódico: planeja e revisa antes de agir, em vez de sair fazendo.",
    fonte_nome: "obra (GitHub)",
    fonte_url: "https://github.com/obra/superpowers",
    conteudo:
      "# Superpowers (obra/superpowers)\n\n" +
      "**Risco: médio-baixo** — repo de terceiro sem tanto histórico ainda pra atestar reputação/manutenção.\n\n" +
      "**O que é:** obriga o Claude a ir mais devagar — planejar, revisar o próprio trabalho antes de tocar " +
      "no projeto de verdade.\n\n" +
      "**Por que importa:** parecido com o que já praticamos juntos (plano antes de mudança estrutural), " +
      "formalizado como skill instalável.\n\n" +
      "**Passo a passo:** instala via `npx skills` (Find Skills) ou clonando " +
      "`github.com/obra/superpowers` na pasta `.claude/skills/`.\n\n" +
      "**Recomendação:** deixaria pra depois de testar o claude-code-setup oficial.",
  },
  {
    nome: "ClaudeMem",
    descricao: "Memória entre sessões: lembra do projeto e arquivos sem reexplicar do zero.",
    descricao_simples: "Dá memória entre conversas — mas você já tem isso com a gente.",
    fonte_nome: "thedotmack (GitHub)",
    fonte_url: "https://github.com/thedotmack/claude-mem",
    conteudo:
      "# ClaudeMem (thedotmack/claude-mem)\n\n" +
      "**Risco: não recomendo instalar.**\n\n" +
      "**O que é:** dá memória entre sessões — lembra do projeto e arquivos sem você reexplicar tudo.\n\n" +
      "**Por que NÃO:** você já tem isso — é o sistema de memória automática que o Jarbas usa " +
      "(arquivos em `/root/.claude/projects/-root/memory/`, que alimenta o `MEMORY.md`). Instalar uma " +
      "segunda camada de memória pode duplicar ou conflitar com o que já está funcionando.",
  },
  {
    nome: "Task Observer",
    descricao: "Observa como você trabalha e melhora as outras skills sozinho, em background.",
    descricao_simples: "Fica de olho no seu jeito de trabalhar e mexe nas outras skills sozinho — autonomia alta demais por ora.",
    fonte_nome: "rebelytics (GitHub)",
    fonte_url: "https://github.com/rebelytics/one-skill-to-rule-them-all",
    conteudo:
      "# Task Observer (rebelytics/one-skill-to-rule-them-all)\n\n" +
      "**Risco: não recomendo por ora.**\n\n" +
      "**O que é:** fica observando como você trabalha, aprende seu estilo, e melhora as OUTRAS skills " +
      "sozinho em background — inclusive a si mesma.\n\n" +
      "**Por que NÃO por ora:** autonomia alta demais pra um repo que ainda não conhecemos a fundo, " +
      "rodando persistentemente na VPS. Antes de considerar, precisaríamos entender exatamente o que " +
      "ele lê/grava e se tem algum controle de permissão.",
  },
  {
    nome: "Ruflo",
    descricao: "Camada de coordenação em cima do Claude Code: transforma ele num maestro de dezenas de agentes.",
    descricao_simples: "Orquestra vários agentes trabalhando juntos — mas isso já é o que o OpenSquad faz por aqui.",
    fonte_nome: "ruvnet (GitHub)",
    fonte_url: "https://github.com/ruvnet/ruflo",
    conteudo:
      "# Ruflo (ruvnet/ruflo)\n\n" +
      "**Risco: redundante, não recomendo.**\n\n" +
      "**O que é:** \"camada de coordenação\" em cima do Claude Code — 60 agentes em paralelo, memória " +
      "compartilhada, aprende a cada rodada, corta até 75% do custo de API (tarefa simples pro modelo " +
      "grátis, difícil pro modelo certo).\n\n" +
      "**Por que NÃO:** é exatamente o papel que o OpenSquad já cumpre pra você (orquestração de squads " +
      "de agentes). Rodar os dois juntos seria redundante e arriscaria os dois brigarem por controle do " +
      "mesmo processo.",
  },
  {
    nome: "obsidian-skills",
    descricao: "5 skills pra trabalhar com Obsidian: Markdown, bases, canvas espacial, CLI, extração web.",
    descricao_simples: "Skills pra quem usa o Obsidian como segundo cérebro — não é o seu caso hoje (você usa Notion).",
    fonte_nome: "kepano (GitHub)",
    fonte_url: "https://github.com/kepano/obsidian-skills",
    conteudo:
      "# obsidian-skills (kepano/obsidian-skills)\n\n" +
      "**Risco: não se aplica hoje.**\n\n" +
      "**O que vem no repo:**\n" +
      "- `obsidian-markdown` — escreve Markdown no padrão Obsidian (wikilinks, frontmatter, callouts)\n" +
      "- `obsidian-bases` — trabalha com os bancos de dados do Obsidian (.base)\n" +
      "- `json-canvas` — cria e edita canvas espacial (.canvas)\n" +
      "- `obsidian-cli` — usa o Obsidian pelo terminal\n" +
      "- `defuddle` — extrai conteúdo web e converte em Markdown limpo pro vault\n\n" +
      "**Instalação:** `npx skills add https://github.com/kepano/obsidian-skills` na raiz do vault.\n\n" +
      "**Por que não se aplica:** seu \"segundo cérebro\" é o Notion, não o Obsidian. Só faria sentido " +
      "se você decidisse migrar ou usar os dois em paralelo.",
  },
];
