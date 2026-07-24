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
  instalado?: boolean; // true = roda de verdade no ecossistema; false = só referência
  tipo?: "skill" | "plugin" | "prompt"; // default "skill" quando ausente
  categoria?: string; // "🎨 Design & Frontend", "🎬 Vídeo" etc — pra agrupar no painel
  conteudo: string; // SKILL.md inteiro
}

export interface AutomacaoApiItem {
  nome: string;
  categoria?: string;
  agenda: string; // expressão cron
  comando: string;
}

export interface CriacaoApiItem {
  id?: string; // presente só nas criadas via formulário — só essas são editáveis
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
            instalado: true, // vieram da varredura real (VPS/container) — rodam de verdade
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

export async function atualizarCriacao(
  id: string,
  payload: NovaCriacaoPayload
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const resp = await squadFetch(`/api/criacoes/${id}`, {
      method: "PATCH",
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

export async function excluirCriacao(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const resp = await squadFetch(`/api/criacoes/${id}`, { method: "DELETE" });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: false, erro: data.error || data.erro || `falha (${resp.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao excluir" };
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
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Plugin oficial que audita um projeto e recomenda hooks, skills, subagents e MCPs.",
    descricao_simples: "Escaneia seu projeto e sugere o que falta configurar — só leitura, não instala nada sozinho.",
    fonte_nome: "Anthropic (oficial)",
    fonte_url: "https://claude.ai/code",
    instalado: false,
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
    categoria: "🎨 Design & Frontend",
    descricao: "Skills de gosto de design pro Claude: direção estética antes do CSS, passe de qualidade determinístico.",
    descricao_simples: "Ajuda o Claude a ter mais \"olho\" de design em telas e interfaces (grid, cor, tipografia, contraste).",
    fonte_nome: "Anthropic + Paul Bakaus",
    fonte_url: "https://github.com/anthropics/skills",
    instalado: false,
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
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Busca entre +700 mil skills prontas e instala a certa a partir do que você descrever.",
    descricao_simples: "Você diz o que está construindo, ela acha a skill certa numa biblioteca gigante e instala sozinha.",
    fonte_nome: "Vercel Labs",
    fonte_url: "https://github.com/vercel-labs/skills",
    instalado: false,
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
    categoria: "⚙️ Sistema & Automação",
    descricao: "Força o Claude a planejar e revisar o próprio trabalho antes de tocar no projeto de verdade.",
    descricao_simples: "Deixa o Claude mais metódico: planeja e revisa antes de agir, em vez de sair fazendo.",
    fonte_nome: "obra (GitHub)",
    fonte_url: "https://github.com/obra/superpowers",
    instalado: false,
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
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Memória entre sessões: lembra do projeto e arquivos sem reexplicar do zero.",
    descricao_simples: "Dá memória entre conversas — mas você já tem isso com a gente.",
    fonte_nome: "thedotmack (GitHub)",
    fonte_url: "https://github.com/thedotmack/claude-mem",
    instalado: false,
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
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Observa como você trabalha e melhora as outras skills sozinho, em background.",
    descricao_simples: "Fica de olho no seu jeito de trabalhar e mexe nas outras skills sozinho — autonomia alta demais por ora.",
    fonte_nome: "rebelytics (GitHub)",
    fonte_url: "https://github.com/rebelytics/one-skill-to-rule-them-all",
    instalado: false,
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
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Camada de coordenação em cima do Claude Code: transforma ele num maestro de dezenas de agentes.",
    descricao_simples: "Orquestra vários agentes trabalhando juntos — mas isso já é o que o OpenSquad faz por aqui.",
    fonte_nome: "ruvnet (GitHub)",
    fonte_url: "https://github.com/ruvnet/ruflo",
    instalado: false,
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
    categoria: "📝 Produtividade & Notas",
    descricao: "5 skills pra trabalhar com Obsidian: Markdown, bases, canvas espacial, CLI, extração web.",
    descricao_simples: "Skills pra quem usa o Obsidian como segundo cérebro — não é o seu caso hoje (você usa Notion).",
    fonte_nome: "kepano (GitHub)",
    fonte_url: "https://github.com/kepano/obsidian-skills",
    instalado: false,
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
  {
    nome: "Prompt: biblioteca de prompts de imagem (YouMind)",
    categoria: "🖼️ Imagem",
    tipo: "prompt",
    descricao: "Meta-prompt pronto: escolhe o melhor prompt de imagem da biblioteca YouMind e adapta pro seu caso.",
    descricao_simples: "Um prompt pronto pra usar: você descreve a imagem que quer, ele escolhe e adapta o melhor modelo pronto.",
    fonte_nome: "YouMind",
    fonte_url: "https://youmind.com/pt-BR/prompts",
    instalado: false,
    conteudo:
      "# Prompt: biblioteca de prompts de imagem (YouMind)\n\n" +
      "**Tipo:** prompt pronto, não é uma skill instalável — cola direto no chat.\n\n" +
      "**Como usar:** cole este texto (trocando a parte em colchetes) em qualquer conversa com IA de imagem:\n\n" +
      "> Tenho acesso a esta biblioteca de prompts de imagem: https://youmind.com/pt-BR/prompts\n" +
      ">\n" +
      "> Quero gerar a seguinte imagem: [DESCREVE EM PORTUGUÊS O QUE VOCÊ QUER — ex: \"um retrato de " +
      "perfil profissional, fundo neutro, luz suave\"].\n" +
      ">\n" +
      "> Escolhe o prompt mais adequado dessa biblioteca, adapta pro meu caso e me devolve o prompt " +
      "final em inglês, pronto pra colar no Nano Banana. Explica em 1 linha por que escolheu esse.\n\n" +
      "**Recomendação:** útil direto, sem instalar nada — é só um texto de apoio.",
  },

  // ── 42 skills de design (central-felipe-tambara.vercel.app/design-42-skills) ──
  // Organizadas nas mesmas 6 camadas da página original.

  {
    nome: "design-taste-frontend",
    categoria: "🎨 Design & Frontend",
    descricao: "Três botões que aplicam gosto de verdade (layout assimétrico, movimento).",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Aplica \"bom gosto\" visual com 3 comandos simples.",
    fonte_nome: "Leonxlnx (GitHub)",
    fonte_url: "https://github.com/Leonxlnx/taste-skill",
    instalado: false,
    conteudo: "# design-taste-frontend\n\nAutor: Leonxlnx\n\nComando: `npx skills add Leonxlnx/taste-skill --skill design-taste-frontend`",
  },
  {
    nome: "animate",
    categoria: "🎨 Design & Frontend",
    descricao: "Regras de movimento embutidas para 60fps respeitando reduced-motion.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Deixa animações suaves e acessíveis (respeita quem prefere menos movimento).",
    fonte_nome: "Emil Kowalski (GitHub)",
    fonte_url: "https://github.com/delphi-ai/animate-skill",
    instalado: false,
    conteudo: "# animate\n\nAutor: Emil Kowalski\n\nComando: `npx skills add delphi-ai/animate-skill --skill animate`",
  },
  {
    nome: "design-motion-principles",
    categoria: "🎨 Design & Frontend",
    descricao: "Auditor de movimento que pesa contenção, polimento e diversão.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Revisa se a animação está no ponto certo (nem exagerada, nem sem graça).",
    fonte_nome: "kylezantos (GitHub)",
    fonte_url: "https://github.com/kylezantos/design-motion-principles",
    instalado: false,
    conteudo: "# design-motion-principles\n\nAutor: kylezantos\n\nComando: `npx skills add kylezantos/design-motion-principles`",
  },
  {
    nome: "theme-factory",
    categoria: "🎨 Design & Frontend",
    tipo: "plugin",
    descricao: "Gera sistema de tokens real como variáveis CSS.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Cria a paleta/tema do zero como código reutilizável.",
    fonte_nome: "Composio",
    fonte_url: "https://github.com/ComposioHQ/awesome-codex-skills",
    instalado: false,
    conteudo: "# theme-factory\n\nAutor: Composio\n\nComando: `/plugin marketplace add ComposioHQ/awesome-codex-skills`",
  },
  {
    nome: "figma → code (Figma MCP)",
    categoria: "🎨 Design & Frontend",
    tipo: "plugin",
    descricao: "Traduz arquivos Figma em código de produção fiel.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Pega um design pronto no Figma e transforma em código.",
    fonte_nome: "GLips (GitHub)",
    fonte_url: "https://github.com/GLips/Figma-Context-MCP",
    instalado: false,
    conteudo: "# figma → code (Figma MCP)\n\nAutor: GLips\n\nComando: `claude mcp add figma -- npx figma-developer-mcp --stdio`",
  },
  {
    nome: "playwright-mcp",
    categoria: "🎨 Design & Frontend",
    tipo: "plugin",
    descricao: "Oferece visão ao agente via screenshots e comparação com referências.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Deixa o Claude \"ver\" a tela de verdade e comparar com o modelo desejado.",
    fonte_nome: "Microsoft (GitHub)",
    fonte_url: "https://github.com/microsoft/playwright-mcp",
    instalado: false,
    conteudo: "# playwright-mcp\n\nAutor: Microsoft\n\nComando: `claude mcp add playwright -s user -- npx @playwright/mcp@latest`",
  },
  {
    nome: "brandkit",
    categoria: "🎨 Design & Frontend",
    descricao: "Boards de marca com direções de logo, paleta e tipografia.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Monta um mini-guia de marca (logo, cores, fontes) pronto.",
    fonte_nome: "Leonxlnx (GitHub)",
    fonte_url: "https://github.com/Leonxlnx/taste-skill",
    instalado: false,
    conteudo: "# brandkit\n\nAutor: Leonxlnx\n\nComando: `npx skills add Leonxlnx/taste-skill --skill brandkit`",
  },
  {
    nome: "designer-skills",
    categoria: "🎨 Design & Frontend",
    tipo: "plugin",
    descricao: "Trabalho de processo: discovery, UX strategy, specs e QA.",
    descricao_simples: "Camada 01 · Núcleo anti-slop. Conduz o processo inteiro de design, não só a arte final.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/designer-skills",
    instalado: false,
    conteudo: "# designer-skills\n\nAutor: Owl Listener\n\nComando: `/plugin marketplace add Owl-Listener/designer-skills`",
  },
  {
    nome: "nano-banana",
    categoria: "🖼️ Imagem",
    tipo: "plugin",
    descricao: "Gera e edita imagens no terminal via Gemini.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Cria/edita imagem direto no terminal.",
    fonte_nome: "Devon Jones (GitHub)",
    fonte_url: "",
    instalado: false,
    conteudo: "# nano-banana\n\nAutor: Devon Jones\n\nComando: `/plugin install nano-banana@devon-claude-skills`",
  },
  {
    nome: "banana-claude",
    categoria: "🖼️ Imagem",
    tipo: "plugin",
    descricao: "Wrapper de imagem que interpreta intenção e monta prompts.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Entende o que você quer e monta o prompt de imagem sozinho.",
    fonte_nome: "Daniel Agrici (GitHub)",
    fonte_url: "https://github.com/AgriciDaniel/banana-claude",
    instalado: false,
    conteudo: "# banana-claude\n\nAutor: Daniel Agrici\n\nComando: `/plugin marketplace add AgriciDaniel/banana-claude`",
  },
  {
    nome: "canvas-design",
    categoria: "🖼️ Imagem",
    descricao: "Gera PNG e PDF editável (carrossel, quote card, infográfico).",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Cria carrossel/card/infográfico pronto pra exportar.",
    fonte_nome: "Anthropic",
    fonte_url: "https://github.com/anthropics/skills",
    instalado: false,
    conteudo: "# canvas-design\n\nAutor: Anthropic\n\nComando: `npx skills add anthropics/skills --skill canvas-design`",
  },
  {
    nome: "algorithmic-art",
    categoria: "🖼️ Imagem",
    descricao: "Visual generativo por código (flow fields, ruído, partículas).",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Gera arte abstrata por código (sem precisar desenhar).",
    fonte_nome: "Anthropic",
    fonte_url: "https://github.com/anthropics/skills",
    instalado: false,
    conteudo: "# algorithmic-art\n\nAutor: Anthropic\n\nComando: `npx skills add anthropics/skills --skill algorithmic-art`",
  },
  {
    nome: "remotion-superpowers",
    categoria: "🎬 Vídeo",
    tipo: "plugin",
    descricao: "Estúdio de vídeo: locução, trilha, legenda e loop render-revisão.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Monta vídeo completo (voz, música, legenda) e revisa sozinho.",
    fonte_nome: "Dojo Coding (GitHub)",
    fonte_url: "https://github.com/DojoCodingLabs/remotion-superpowers",
    instalado: false,
    conteudo: "# remotion-superpowers\n\nAutor: Dojo Coding\n\nComando: `/plugin marketplace add DojoCodingLabs/remotion-superpowers`",
  },
  {
    nome: "claude-remotion (Remotion Skills)",
    categoria: "🎬 Vídeo",
    tipo: "plugin",
    descricao: "Porta leve para vídeo programático com React → MP4.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Cria vídeo a partir de código (pra quem programa).",
    fonte_nome: "Remotion",
    fonte_url: "https://github.com/remotion-dev/remotion",
    instalado: false,
    conteudo: "# claude-remotion (Remotion Skills)\n\nAutor: Remotion\n\nComando: `npx create-video@latest` (instala as Skills)",
  },
  {
    nome: "blender-motion",
    categoria: "🎬 Vídeo",
    descricao: "Controla Blender por texto via MCP sem precisar saber 3D.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Cria animação 3D só descrevendo o que quer, sem saber usar o programa.",
    fonte_nome: "LobzyJay · ahujasid (GitHub)",
    fonte_url: "https://github.com/LobzyJay/motion-design-with-claude",
    instalado: false,
    conteudo: "# blender-motion\n\nAutor: LobzyJay · ahujasid (MCP)\n\nComando: `npx skills add LobzyJay/motion-design-with-claude --skill blender-motion`",
  },
  {
    nome: "aftereffects-motion",
    categoria: "🎬 Vídeo",
    descricao: "Anima dentro do After Effects por prompt com efeitos.",
    descricao_simples: "Camada 02 · Pixels, movimento & 3D. Cria animações no After Effects só pedindo por texto.",
    fonte_nome: "LobzyJay · TheLlamainator (GitHub)",
    fonte_url: "https://github.com/LobzyJay/motion-design-with-claude",
    instalado: false,
    conteudo: "# aftereffects-motion\n\nAutor: LobzyJay · TheLlamainator (MCP)\n\nComando: `npx skills add LobzyJay/motion-design-with-claude --skill aftereffects-motion`",
  },
  {
    nome: "Claude Design — Mockups de alta fidelidade",
    categoria: "🖥️ Produto (Claude Design)",
    tipo: "plugin",
    descricao: "Telas prontas para iterar elemento por elemento.",
    descricao_simples: "Camada 03 · O produto. Ferramenta paga da própria Anthropic pra desenhar telas.",
    fonte_nome: "Anthropic · Claude Design",
    fonte_url: "https://claude.ai/design",
    instalado: false,
    conteudo: "# Claude Design — Mockups de alta fidelidade\n\nAutor: Anthropic · Claude Design\n\nAcesso: claude.ai/design (plano pago, web)",
  },
  {
    nome: "Claude Design — Design systems",
    categoria: "🖥️ Produto (Claude Design)",
    tipo: "plugin",
    descricao: "Treina canvas na marca e aplica sistema em tudo.",
    descricao_simples: "Camada 03 · O produto. Ensina a IA a manter a sua marca consistente em tudo que ela desenha.",
    fonte_nome: "Anthropic · Claude Design",
    fonte_url: "https://claude.ai/design",
    instalado: false,
    conteudo: "# Claude Design — Design systems\n\nAutor: Anthropic · Claude Design\n\nAcesso: claude.ai/design",
  },
  {
    nome: "Claude Design — Templates",
    categoria: "🖥️ Produto (Claude Design)",
    tipo: "plugin",
    descricao: "Salva versão perfeita como template reutilizável.",
    descricao_simples: "Camada 03 · O produto. Guarda um design bom como modelo pra usar de novo depois.",
    fonte_nome: "Anthropic · Claude Design",
    fonte_url: "https://claude.ai/design",
    instalado: false,
    conteudo: "# Claude Design — Templates\n\nAutor: Anthropic · Claude Design\n\nAcesso: claude.ai/design",
  },
  {
    nome: "Claude Design — Slide decks",
    categoria: "🖥️ Produto (Claude Design)",
    tipo: "plugin",
    descricao: "Apresentações a partir de template e cores da marca.",
    descricao_simples: "Camada 03 · O produto. Gera apresentação já na cor/estilo da sua marca.",
    fonte_nome: "Anthropic · Claude Design",
    fonte_url: "https://claude.ai/design",
    instalado: false,
    conteudo: "# Claude Design — Slide decks\n\nAutor: Anthropic · Claude Design\n\nAcesso: claude.ai/design",
  },
  {
    nome: "composio-mcp",
    categoria: "⚙️ Sistema & Automação",
    tipo: "plugin",
    descricao: "Liga Claude a Figma, Slides, GitHub e 1.000+ apps.",
    descricao_simples: "Camada 03 · O produto. Conecta o Claude a mais de 1.000 outros aplicativos de uma vez.",
    fonte_nome: "Composio",
    fonte_url: "https://composio.dev",
    instalado: false,
    conteudo: "# composio-mcp\n\nAutor: Composio\n\nComando: `claude mcp add composio -- npx @composio/mcp@latest`",
  },
  {
    nome: "context-window-design",
    categoria: "🧠 Comportamento de IA",
    descricao: "Trata janela de contexto como material de design.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Organiza o que a IA \"lembra\" durante a conversa.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# context-window-design\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill context-window-design`",
  },
  {
    nome: "conversation-patterns",
    categoria: "🧠 Comportamento de IA",
    descricao: "Desenha turnos, sequências de reparo e checkpoints.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Organiza como a conversa flui e se corrige.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# conversation-patterns\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill conversation-patterns`",
  },
  {
    nome: "generative-ui",
    categoria: "🧠 Comportamento de IA",
    descricao: "Regras de quando renderizar componentes vs. texto puro.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Decide quando mostrar botão/gráfico em vez de só texto.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# generative-ui\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill generative-ui`",
  },
  {
    nome: "progressive-disclosure",
    categoria: "🧠 Comportamento de IA",
    descricao: "Escalona revelação de poder da IA ao longo das mensagens.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Vai mostrando mais recursos aos poucos, sem sobrecarregar.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# progressive-disclosure\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill progressive-disclosure`",
  },
  {
    nome: "multimodal-orchestration",
    categoria: "🧠 Comportamento de IA",
    descricao: "Sequencia texto, imagem e ferramentas num fluxo coordenado.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Coordena texto + imagem + ferramentas trabalhando juntos.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# multimodal-orchestration\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill multimodal-orchestration`",
  },
  {
    nome: "mixed-initiative-flow",
    categoria: "🧠 Comportamento de IA",
    descricao: "Define quando agente lidera e quando usuário lidera.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Decide quando a IA toma a frente e quando espera você.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# mixed-initiative-flow\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill mixed-initiative-flow`",
  },
  {
    nome: "frustration-detection",
    categoria: "🧠 Comportamento de IA",
    descricao: "Lê frustração e adapta (simplifica, desacelera, oferece humano).",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Percebe quando você está frustrada e ajusta o jeito de responder.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# frustration-detection\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill frustration-detection`",
  },
  {
    nome: "feedback-loops",
    categoria: "🧠 Comportamento de IA",
    descricao: "Mecanismo de correção que muda comportamento de verdade.",
    descricao_simples: "Camada 04 · Comportamento, não pixel. Faz a IA aprender de verdade com sua correção, não só pedir desculpa.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# feedback-loops\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill feedback-loops`",
  },
  {
    nome: "system-prompt-structure",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Anatomia limpa (identidade, contexto, regras, output, exemplos).",
    descricao_simples: "Camada 05 · O prompt é o produto. Organiza a \"receita\" que define como um agente se comporta.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# system-prompt-structure\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill system-prompt-structure`",
  },
  {
    nome: "persona-architecture",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Define personagem, voz e limites para comportamento consistente.",
    descricao_simples: "Camada 05 · O prompt é o produto. Constrói uma persona de IA consistente (parecido com nossos 16 especialistas).",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# persona-architecture\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill persona-architecture`",
  },
  {
    nome: "tone-calibration",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Botões de tom por contexto (formalidade, calor, confiança).",
    descricao_simples: "Camada 05 · O prompt é o produto. Ajusta o tom da resposta conforme a situação.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# tone-calibration\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill tone-calibration`",
  },
  {
    nome: "emotional-design",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Mapa de resposta para frustração, confusão, alegria e angústia.",
    descricao_simples: "Camada 05 · O prompt é o produto. Guia de como reagir a diferentes emoções do usuário.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# emotional-design\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill emotional-design`",
  },
  {
    nome: "template-design",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Templates parametrizados com variáveis tipadas e condições.",
    descricao_simples: "Camada 05 · O prompt é o produto. Cria modelos de texto reutilizáveis com partes que trocam.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# template-design\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill template-design`",
  },
  {
    nome: "few-shot-patterns",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Conjuntos de exemplo que miram erros recorrentes do modelo.",
    descricao_simples: "Camada 05 · O prompt é o produto. Usa exemplos prontos pra corrigir erros que a IA sempre comete.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# few-shot-patterns\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill few-shot-patterns`",
  },
  {
    nome: "chain-of-thought-design",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Cadeias de raciocínio deliberadas estruturadas.",
    descricao_simples: "Camada 05 · O prompt é o produto. Organiza o \"passo a passo de pensar\" da IA antes de responder.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# chain-of-thought-design\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill chain-of-thought-design`",
  },
  {
    nome: "constraint-specification",
    categoria: "💬 Arquitetura de Prompt",
    descricao: "Limites testáveis (formato, tamanho, tom, conteúdo).",
    descricao_simples: "Camada 05 · O prompt é o produto. Define regras claras de formato/tamanho que dá pra checar se foram seguidas.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# constraint-specification\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill constraint-specification`",
  },
  {
    nome: "guardrail-design",
    categoria: "🔒 Segurança & Confiança",
    descricao: "Limites de comportamento e padrões de recusa explícitos.",
    descricao_simples: "Camada 06 · Entrega com segurança. Define claramente o que a IA deve recusar a fazer.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# guardrail-design\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill guardrail-design`",
  },
  {
    nome: "trust-calibration",
    categoria: "🔒 Segurança & Confiança",
    descricao: "Sinais de confiança e fonte para o usuário calibrar expectativas.",
    descricao_simples: "Camada 06 · Entrega com segurança. Mostra o quanto confiar na resposta e de onde ela veio.",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# trust-calibration\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill trust-calibration`",
  },
  {
    nome: "transparency-patterns",
    categoria: "🔒 Segurança & Confiança",
    descricao: "Mostra o que o modelo sabe, não sabe e nível de certeza.",
    descricao_simples: "Camada 06 · Entrega com segurança. Deixa claro o que a IA tem certeza e o que está \"chutando\".",
    fonte_nome: "Owl Listener (GitHub)",
    fonte_url: "https://github.com/Owl-Listener/ai-design-skills",
    instalado: false,
    conteudo: "# transparency-patterns\n\nAutor: Owl Listener\n\nComando: `npx skills add Owl-Listener/ai-design-skills --skill transparency-patterns`",
  },
];
