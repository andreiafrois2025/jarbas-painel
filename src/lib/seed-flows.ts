// =============================================
// Fluxos-semente — desenhos das automações que já rodam na VPS
// e dos squads existentes. Populados como is_seed=true (read-only).
// A Andréia pode duplicar pra editar.
// =============================================

import type { FlowDoc } from "./types";

type SeedFlow = Omit<FlowDoc, "id" | "user_id" | "created_at" | "updated_at">;

// Layout helper — coluna vertical com espaçamento fixo.
// A rotação pra horizontal acontece no final via toHorizontal + rotateFlow.
const col = (i: number, x = 250) => ({ x, y: 60 + i * 120 });

// Rotaciona 90° anti-horário. Sequência vertical (y aumenta) vira horizontal (x aumenta).
// Ramos laterais (x=100 esquerda, x=400/500 direita) viram ramos superior/inferior.
function toHorizontal({ x, y }: { x: number; y: number }) {
  return {
    x: Math.round(60 + (y - 60) * 2.33),
    y: Math.round(260 + (x - 250) * 1.07),
  };
}

function rotateFlow(f: SeedFlow): SeedFlow {
  return {
    ...f,
    nodes: f.nodes.map((n) => ({ ...n, position: toHorizontal(n.position) })),
  };
}

// ─────────────────────────────────────────────────────────────
// AUTOMAÇÕES
// ─────────────────────────────────────────────────────────────

const briefingTelegram: SeedFlow = {
  title: "Briefing matinal Telegram (Donna)",
  category: "automation",
  description:
    "Todo dia 6h BRT, Donna envia no Telegram um resumo com agenda do dia (Google Calendar) e tarefas do Notion. Zero IA, custo 0.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "6h BRT — todo dia", icon: "⏰", details: "Trigger: HEARTBEAT.md bloco 2, primeira passagem depois das 9h UTC.\nTrava por dia (heartbeat-state.json): não repete.", executor: "cron 30min → HEARTBEAT" } },
    { id: "2", type: "action", position: col(1), data: { label: "Ler Google Calendar", icon: "📅", details: "Conta assistentejarbas.ia@gmail.com.\nBusca eventos de hoje (00h–23h59 BRT).", executor: "auto_briefing.py", tags: ["Google Calendar"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Ler Notion Tasks", icon: "📝", details: "Database de tarefas.\nFiltro: prazo = hoje OU atrasada = true.", executor: "auto_briefing.py", tags: ["Notion"] } },
    { id: "4", type: "action", position: col(3), data: { label: "Montar mensagem", icon: "✍️", details: "Template fixo (sem IA):\ncumprimento → agenda cronológica → tarefas → fechamento curto.", executor: "auto_briefing.py" } },
    { id: "5", type: "end", position: col(4), data: { label: "Enviar Telegram", icon: "💬", details: "Chat = TELEGRAM_ALLOWED_USER_IDS.\nCanal privado da Andréia.", executor: "OpenClaw", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
  ],
};

const briefingWhatsApp: SeedFlow = {
  title: "Briefing matinal WhatsApp (Donna)",
  category: "automation",
  description:
    "Mesmo conteúdo do briefing Telegram, mas mandado no WhatsApp pessoal. Roda em paralelo — dupla entrega pra você não perder.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "6h BRT — todo dia", icon: "⏰", details: "Trigger: HEARTBEAT bloco 2b, gate interno 6h–8h BRT.\nTrava por dia.", executor: "cron 30min → HEARTBEAT" } },
    { id: "2", type: "action", position: col(1), data: { label: "Coleta agenda + tarefas", icon: "📥", details: "Reusa a mesma coleta do briefing Telegram (Google Calendar + Notion Tasks).", executor: "wa_daily_briefing.py" } },
    { id: "3", type: "action", position: col(2), data: { label: "Montar mensagem", icon: "✍️", details: "Formato adaptado pro WhatsApp (asteriscos ao invés de markdown).", executor: "wa_daily_briefing.py" } },
    { id: "4", type: "end", position: col(3), data: { label: "Enviar WhatsApp", icon: "📱", details: "openclaw message send --channel whatsapp --target +553189107640.", executor: "OpenClaw", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const alertaCompromisso: SeedFlow = {
  title: "Alerta de compromisso próximo (Donna)",
  category: "automation",
  description:
    "A cada 30 min, Donna verifica se você tem evento começando em menos de 30 min. Se sim, avisa no Telegram. Se não, silêncio.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 30 min", icon: "⏱️", details: "HEARTBEAT bloco 3, sem trava (roda toda vez).", executor: "cron 30min" } },
    { id: "2", type: "action", position: col(1), data: { label: "Ler agenda de hoje", icon: "📅", details: "calendar_skill.py listar 1 (só hoje).", executor: "calendar_skill.py" } },
    { id: "3", type: "condition", position: col(2), data: { label: "Evento em <30min?", icon: "🤔", details: "Calcula delta entre horário do evento e agora_brt.\nInclui se 0 ≤ delta ≤ 30 min." } },
    { id: "4", type: "end", position: { x: 100, y: 420 }, data: { label: "Silêncio", icon: "🤫", details: "Dia normal = não manda nada." } },
    { id: "5", type: "end", position: { x: 400, y: 420 }, data: { label: "🔔 Telegram", icon: "💬", details: "Mensagem: 🔔 *Lembrete:* [hora] — [título do evento].", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4", label: "não" },
    { id: "e3-5", source: "3", target: "5", label: "sim" },
  ],
};

const noticiasNormal: SeedFlow = {
  title: "Notícias diárias — fluxo normal (Mike → Izzy → Grupo IA)",
  category: "automation",
  description:
    "O Mike busca notícias a cada 30 min em ~28 fontes (BR + internacionais). 3x por dia (8h/13h/18h BRT) a Izzy escreve os posts (2 notícias + 1 caso de uso se houver + 3 dicas), cria cards no Radar, você aprova no kanban ou na home do painel, o sender publica no grupo.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 30 min", icon: "⏰", details: "HEARTBEAT bloco 4 (18/07: era 1x/dia às 8h; agora toda passagem — RSS é custo zero).", executor: "cron 30min → HEARTBEAT" } },
    { id: "2", type: "action", position: col(1), data: { label: "Mike busca RSS", icon: "🔍", details: "~28 fontes: labs oficiais (OpenAI, Anthropic, DeepMind...), tier-1 (TechCrunch, Verge...), BR (InfoMoney IA, IA Todo Dia, IA Brasil, Catai, NotJournal, Mundo Conectado, Exame, CNN, Convergência, Olhar Digital, TecMundo, TechTudo...).\nJanela 48h, dedup semântico.\nDetecta: is_uau e is_caso_uso.", executor: "ia_news_fetcher.py", tags: ["RSS"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Izzy escreve + cria cards", icon: "✏️", details: "3x/dia (8h/13h/18h BRT): 2 notícias por score + 1 caso de uso (vaga garantida, card '🧩 Caso de uso') + 3 dicas do banco curado.\nDica descartada 1x não volta nunca mais.\nNotícias: Izzy via Claude; dicas: Gemini formata.", executor: "ia_content_generator.py", tags: ["Notion", "Gemini"] } },
    { id: "4", type: "action", position: col(3), data: { label: "Você avalia", icon: "👀", details: "No kanban do Radar OU na caixa de aprovação da home do painel (só notícias):\n- 'Aprovado' = vira post\n- 'Descartado' = ignora e o sistema aprende", executor: "humano", tags: ["Notion"] } },
    { id: "5", type: "action", position: col(4), data: { label: "Sender publica", icon: "📤", details: "Janela: 8h–20h30 BRT.\nIntervalo mínimo: 2h entre posts.\nCard com [Prioridade] no título fura a fila.", executor: "ia_group_sender.py", tags: ["WhatsApp"] } },
    { id: "6", type: "end", position: col(5), data: { label: "Grupo IA no WA", icon: "💬", details: "Grupo Imersão IA na Prática (comunidade).", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5", label: "Aprovado" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};

const noticiasUAU: SeedFlow = {
  title: "Notícias UAU (fluxo prioritário)",
  category: "automation",
  description:
    "Ramo especial do fluxo de notícias. UAU agora dispara por TEMA em qualquer fonte (modelo aberto chinês, rebrand de ferramenta popular, marco BR de proteção de dados) além das fontes oficiais. O card nasce NA HORA (sem esperar o slot), com [Prioridade] no título, e a Donna te avisa no WhatsApp. Aprovar já fura a fila.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Mike encontrou notícia", icon: "🔍", details: "is_uau=true se: fonte oficial/tier-1 + verbo de lançamento, OU tema forte em QUALQUER fonte (18/07): labs chineses/modelo aberto (Kimi, DeepSeek, Qwen...), 'Kimi K3' e afins, rebrand de ferramenta que ela ensina (NotebookLM...), marcos BR de proteção de dados/LGPD.", executor: "ia_news_fetcher.py" } },
    { id: "2", type: "condition", position: col(1), data: { label: "É UAU?", icon: "🌟", details: "Só entra nesse fluxo se is_uau=true.\nDedup: mesma bomba em várias fontes vira 1 card só (semântico + por entidade)." } },
    { id: "3", type: "action", position: { x: 500, y: 180 }, data: { label: "Card imediato [Prioridade]", icon: "🔥", details: "Gerado NA HORA pelo heartbeat (--uau-only, a cada 30 min), sem esperar os slots.\nStatus 'Pra avaliar - Notícia' com [Prioridade] no título (a coluna própria foi extinta 18/07).", executor: "ia_content_generator.py --uau-only", tags: ["Notion"] } },
    { id: "4", type: "action", position: { x: 500, y: 300 }, data: { label: "Donna monitora", icon: "👁️", details: "A cada 30 min, procura cards 'Pra avaliar - Notícia' com [Prioridade] no título ainda não vistos.", executor: "notion_important_watcher.py" } },
    { id: "5", type: "action", position: { x: 500, y: 420 }, data: { label: "Notifica WhatsApp", icon: "📱", details: "🔥 *Notícia UAU no Radar* + link do card.\nNa home do painel o card aparece com selo 🔥 UAU em destaque.", executor: "OpenClaw", tags: ["WhatsApp"] } },
    { id: "6", type: "action", position: { x: 500, y: 540 }, data: { label: "Você avalia", icon: "🧐", details: "No Notion ou na home do painel:\n- 'Aprovado' = publica furando a fila (o [Prioridade] no título garante)\n- 'Descartado' = ignora", executor: "humano" } },
    { id: "7", type: "action", position: { x: 500, y: 660 }, data: { label: "Sender publica primeiro", icon: "🚀", details: "Aprovado + [Prioridade] no título = frente da fila.\nAinda respeita janela 8h–20h30 e 2h entre posts.", executor: "ia_group_sender.py", tags: ["WhatsApp"] } },
    { id: "8", type: "end", position: { x: 100, y: 420 }, data: { label: "Fluxo normal", icon: "↩️", details: "Se não é UAU, segue o fluxo normal (espera o próximo slot de escrita)." } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3", label: "sim" },
    { id: "e2-8", source: "2", target: "8", label: "não" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
    { id: "e6-7", source: "6", target: "7", label: "Aprovado" },
  ],
};

const financasWA: SeedFlow = {
  title: "Finanças WhatsApp → Louis → Notion",
  category: "automation",
  description:
    "Dispatcher persistente (24/7) lê o grupo de finanças no WhatsApp. Transcreve áudio se preciso. Louis (a IA) categoriza e salva linha na tabela de faturas do Notion.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Mensagem no grupo WA", icon: "💰", details: "Grupo de finanças (id 120363316064808672@g.us).\nQualquer mensagem (texto, áudio, foto de nota).", executor: "humano" } },
    { id: "2", type: "action", position: col(1), data: { label: "Dispatcher lê log", icon: "📥", details: "wa_finances_dispatcher.py roda em loop dentro do container.\nWatchdog no host reinicia se cair (cron 1 min).", executor: "wa_finances_dispatcher.py", tags: ["WhatsApp"] } },
    { id: "3", type: "condition", position: col(2), data: { label: "É áudio?", icon: "🎤", details: "Se sim, transcreve com Whisper local (transcribe_audio.py)." } },
    { id: "4", type: "action", position: { x: 500, y: 300 }, data: { label: "Transcreve", icon: "🗣️", details: "python3 transcribe_audio.py (Whisper).\nCusto 0 (rodado local).", executor: "transcribe_audio.py" } },
    { id: "5", type: "action", position: col(4), data: { label: "Louis categoriza", icon: "🧾", details: "Extrai: valor, descrição, categoria, forma de pagamento, data.\nUsa Gemini.", executor: "wa_finances_save.py", tags: ["Gemini"] } },
    { id: "6", type: "end", position: col(5), data: { label: "Linha no Notion", icon: "📊", details: "Tabela de faturas do Louis no Notion.", executor: "wa_finances_save.py", tags: ["Notion"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4", label: "sim" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e3-5", source: "3", target: "5", label: "não" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};

const saudeEcossistema: SeedFlow = {
  title: "Saúde do ecossistema (semáforo painel)",
  category: "automation",
  description:
    "A cada 5 min, dois scripts coletam sinais: watchdog verifica se containers/gateways estão vivos, status-saude junta com idade de artefatos e produz status.json. O painel lê e mostra o semáforo (verde/amarelo/vermelho).",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 5 min", icon: "⏱️", details: "Dois crons no host.", executor: "cron" } },
    { id: "2", type: "action", position: { x: 100, y: 180 }, data: { label: "Watchdog checa vida", icon: "🩺", details: "Verifica: container OpenClaw up, gateway WhatsApp respondendo, bot Telegram vivo, PM2 dos squads.\nSe algo caiu, tenta reiniciar.", executor: "watchdog.py" } },
    { id: "3", type: "action", position: { x: 400, y: 180 }, data: { label: "Status-saude coleta", icon: "📊", details: "Junta: estado do watchdog + idade de artefatos (backup, briefing, heartbeat, resumo 12h) + estado da fila IA + ronda diária.", executor: "status-saude.py" } },
    { id: "4", type: "action", position: col(2), data: { label: "Escreve status.json", icon: "📄", details: "Semáforo:\n🟢 verde = tudo ok\n🟡 amarelo = artefato velho / fila alta\n🔴 vermelho = sinal vital caído", executor: "status-saude.py" } },
    { id: "5", type: "action", position: col(3), data: { label: "Upload Supabase Storage", icon: "☁️", details: "Bucket público /status.json.", executor: "status-saude.py", tags: ["Supabase"] } },
    { id: "6", type: "end", position: col(4), data: { label: "Painel mostra semáforo", icon: "🚦", details: "Componente HealthBadge no Início do painel.", tags: ["painel"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e1-3", source: "1", target: "3" },
    { id: "e2-4", source: "2", target: "4" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};

const rondaDiaria: SeedFlow = {
  title: "Ronda diária de saúde (7h BRT)",
  category: "automation",
  description:
    "1x/dia às 7h BRT roda uma varredura mais profunda: idade de artefatos das últimas 24h, erros novos nos logs, disco, memória do container, fila do kanban. Dia normal = silêncio. Se problema = Telegram.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "7h BRT — todo dia", icon: "🌅", details: "cron 0 10 * * * (10h UTC = 7h BRT).", executor: "cron" } },
    { id: "2", type: "action", position: col(1), data: { label: "Checar frescor artefatos", icon: "🔍", details: "Backup diário (26h), briefing 9h (1h), resumo pendentes 12h (26h), watchdog 5min (1h), retomar pipeline (1h).", executor: "ronda-diaria.py" } },
    { id: "3", type: "action", position: col(2), data: { label: "Grep de erros nos logs", icon: "🐛", details: "Padrão: traceback|error|exception|falhou|failed.\nIgnora: errors=0|0 errors.", executor: "ronda-diaria.py" } },
    { id: "4", type: "action", position: col(3), data: { label: "Disco + memória container", icon: "💾", details: "df -h + docker stats.", executor: "ronda-diaria.py" } },
    { id: "5", type: "condition", position: col(4), data: { label: "Achou problema?", icon: "🤔", details: "Qualquer alerta acima." } },
    { id: "6", type: "end", position: { x: 100, y: 660 }, data: { label: "Silêncio", icon: "🤫", details: "Dia normal = não notifica." } },
    { id: "7", type: "end", position: { x: 400, y: 660 }, data: { label: "🚨 Telegram", icon: "🚨", details: "Manda resumo dos problemas pro Telegram pessoal.", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6", label: "não" },
    { id: "e5-7", source: "5", target: "7", label: "sim" },
  ],
};

const resumoPendentesIA: SeedFlow = {
  title: "Resumo diário de pendentes IA (12h UTC)",
  category: "automation",
  description:
    "Todo dia 9h BRT te manda no Telegram uma lista dos cards em 'Pra avaliar' no kanban do Radar IA que você ainda não decidiu (aprovar/descartar). Serve pra não acumular.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "9h BRT — todo dia", icon: "⏰", details: "cron 0 12 * * * (12h UTC = 9h BRT).", executor: "cron" } },
    { id: "2", type: "action", position: col(1), data: { label: "Consulta Notion", icon: "📇", details: "Database Radar de Posts IA, filtro Status = 'Pra avaliar'.", executor: "send_ia_pending.sh", tags: ["Notion"] } },
    { id: "3", type: "condition", position: col(2), data: { label: "Tem card pendente?", icon: "🤔" } },
    { id: "4", type: "end", position: { x: 100, y: 420 }, data: { label: "Silêncio", icon: "🤫", details: "Se lista vazia, não manda nada." } },
    { id: "5", type: "action", position: { x: 400, y: 420 }, data: { label: "Monta lista curta", icon: "📝", details: "Ex: 'Você tem 12 cards pra avaliar no Radar IA. Últimos 3: [titulos]'." } },
    { id: "6", type: "end", position: { x: 400, y: 540 }, data: { label: "Telegram", icon: "💬", details: "Chat privado da Andréia.", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4", label: "não" },
    { id: "e3-5", source: "3", target: "5", label: "sim" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};

// ─────────────────────────────────────────────────────────────
// SQUADS
// ─────────────────────────────────────────────────────────────

const squadInstagramCarrossel: SeedFlow = {
  title: "Squad: Instagram Carrossel",
  category: "squad",
  description:
    "Pipeline pra criar carrossel Instagram sobre um tema. Passa por curadoria de dica, cópia, design, aprovação humana, render final e agendamento. Se qualquer revisor rejeitar, volta pro agente responsável.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Tópico recebido", icon: "🎯", details: "Andréia envia comando com o tema.", executor: "humano" } },
    { id: "2", type: "action", position: col(1), data: { label: "Rafaela: banco de dicas", icon: "🗂️", details: "Consulta banco de ferramentas primeiro (não gera do zero se já existe boa).", executor: "Rafaela" } },
    { id: "3", type: "action", position: col(2), data: { label: "Izzy: copy", icon: "✏️", details: "Escreve título, capa, corpo, CTA e legenda.\nSem hífen/travessão estilístico.\nGancho humano.", executor: "Izzy" } },
    { id: "4", type: "action", position: col(3), data: { label: "Felipe: design", icon: "🎨", details: "Layout, cores, tipografia.\nAtenção: capa sem jargão.", executor: "Felipe" } },
    { id: "5", type: "action", position: col(4), data: { label: "Checkpoint humano", icon: "🚦", details: "Você revisa: aprova ou rejeita indicando qual agente refazer.", executor: "humano" } },
    { id: "6", type: "action", position: col(5), data: { label: "Render final", icon: "🖼️", details: "Gera PNG/PDF das páginas do carrossel." } },
    { id: "7", type: "end", position: col(6), data: { label: "Agendar publicação", icon: "📅", details: "Salva no Drive + agenda no gerenciador de conteúdo." } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6", label: "aprova" },
    { id: "e5-2", source: "5", target: "2", label: "refazer Rafaela", isReturn: true },
    { id: "e5-3", source: "5", target: "3", label: "refazer Izzy", isReturn: true },
    { id: "e5-4", source: "5", target: "4", label: "refazer Felipe", isReturn: true },
    { id: "e6-7", source: "6", target: "7" },
  ],
};

const squadLicitacao: SeedFlow = {
  title: "Squad: Licitação IGAM",
  category: "squad",
  description:
    "Pipeline pra montar processo licitatório (ETP + TR + Nota Jurídica). Sofia estrutura info, Katrina redige ETP/TR, Junior entra se for TI, Eric se for geo, Harvey faz parecer jurídico, checkpoint humano no fim.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Demanda recebida", icon: "📥", details: "Andréia envia: tipo (aquisição/contratação), objeto, requisitos.", executor: "humano" } },
    { id: "2", type: "action", position: col(1), data: { label: "Sofia: estrutura info", icon: "🗂️", details: "Organiza normativos aplicáveis (Lei 14.133, decretos MG, resoluções SEPLAG). Monta o esqueleto do processo.", executor: "Sofia" } },
    { id: "3", type: "action", position: col(2), data: { label: "Katrina: ETP + TR", icon: "📋", details: "Redige o ETP e o TR. Baseia no TR-PADRÃO v.20.09.2020 e no Contrato v2.2025.01. Se SEPLAG não tem modelo, orienta adaptar AGU.", executor: "Katrina" } },
    { id: "4", type: "condition", position: col(3), data: { label: "É TI?", icon: "🤔", details: "Se objeto envolve tecnologia da informação (Deliberação CETIC 01/2025)." } },
    { id: "5", type: "action", position: { x: 100, y: 540 }, data: { label: "Junior: técnico TI", icon: "💻", details: "Especifica requisitos técnicos, integração, segurança, LGPD.", executor: "Junior" } },
    { id: "6", type: "condition", position: col(5), data: { label: "É geo?", icon: "🗺️", details: "Se objeto envolve geoprocessamento." } },
    { id: "7", type: "action", position: { x: 100, y: 780 }, data: { label: "Eric: técnico geo", icon: "🌍", details: "Especifica requisitos geoespaciais.", executor: "Eric" } },
    { id: "8", type: "action", position: col(7), data: { label: "Harvey: parecer jurídico", icon: "⚖️", details: "Redige Nota Jurídica (estrutura tripartite Relatório/Fundamentação/Conclusão).\nRessalvas (N.) obrigatórias, Recomendações (N.) sugeridas.\nProcuradora: Valéria M. Nogueira.", executor: "Harvey" } },
    { id: "9", type: "action", position: col(8), data: { label: "Checkpoint humano", icon: "🚦", details: "Você revisa: aprova para prosseguir OU pede refação de agente específico.", executor: "humano" } },
    { id: "10", type: "end", position: col(9), data: { label: "Docs finais", icon: "📄", details: "Word ETP + Word TR + Nota Jurídica + índice, salvos em /root/downloads/." } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5", label: "sim" },
    { id: "e4-6", source: "4", target: "6", label: "não" },
    { id: "e5-6", source: "5", target: "6" },
    { id: "e6-7", source: "6", target: "7", label: "sim" },
    { id: "e6-8", source: "6", target: "8", label: "não" },
    { id: "e7-8", source: "7", target: "8" },
    { id: "e8-9", source: "8", target: "9" },
    { id: "e9-10", source: "9", target: "10", label: "aprova" },
    { id: "e9-2", source: "9", target: "2", label: "refazer Sofia", isReturn: true },
    { id: "e9-3", source: "9", target: "3", label: "refazer Katrina", isReturn: true },
    { id: "e9-8", source: "9", target: "8", label: "refazer Harvey", isReturn: true },
  ],
};

const squadCriarAgente: SeedFlow = {
  title: "Squad: Criar Agente",
  category: "squad",
  description:
    "Meta-squad: cria um novo agente/persona. Rafaela define quem é a persona (função, tom, especialidade), Junior faz o scaffold do skill/comando, testes e ficha final.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Ideia da persona", icon: "💡", details: "Andréia diz: 'quero um agente pra X'.", executor: "humano" } },
    { id: "2", type: "action", position: col(1), data: { label: "Rafaela: define persona", icon: "🎭", details: "Nome, função, tom de voz, especialização, personalidade, quando aciona.", executor: "Rafaela" } },
    { id: "3", type: "action", position: col(2), data: { label: "Junior: scaffold", icon: "⚙️", details: "Cria arquivos: skill YAML (comando /nome), prompt do sistema, integração com openclaw se aplicável.", executor: "Junior" } },
    { id: "4", type: "action", position: col(3), data: { label: "Testes", icon: "🧪", details: "Roda casos-teste do agente (input → resposta esperada).", executor: "Junior" } },
    { id: "5", type: "action", position: col(4), data: { label: "Checkpoint humano", icon: "🚦", details: "Você aprova ou pede ajustes.", executor: "humano" } },
    { id: "6", type: "end", position: col(5), data: { label: "Agente vivo", icon: "🎉", details: "Registrado no time (memória equipe.md), /comando disponível." } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6", label: "aprova" },
    { id: "e5-2", source: "5", target: "2", label: "ajusta persona", isReturn: true },
    { id: "e5-3", source: "5", target: "3", label: "ajusta scaffold", isReturn: true },
  ],
};

const pipelineReels: SeedFlow = {
  title: "Pipeline de reels (pauta → roteiro → feedback)",
  category: "automation",
  description:
    "Quarta 18h nascem as pautas DIRETO no banco Conteúdos (coluna IDEIAS, Formato Reels). Você aprova movendo pra 'A fazer'; em até 30 min o roteiro aparece no PRÓPRIO card e ele vai pra 'Gravar Reels'. Quer ajustar? Escreve 'FEEDBACK: ...' no card e volta pra 'A fazer' — regrava e aprende pros próximos.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Quarta 18h BRT", icon: "⏰", details: "Trilhos: backlog Descomplicando…, dica-bank menos usada, notícia UAU da semana ([Prioridade] no título).", executor: "cron → reels_pipeline.py ideias", tags: ["Gemini"] } },
    { id: "2", type: "action", position: col(1), data: { label: "Pautas no banco Conteúdos", icon: "💡", details: "Status IDEIAS · Formato Reels · Canal Instagram (18/07: o Radar não tem mais coluna de reels).\nAviso no Telegram + WhatsApp + tarefa no Notion.", executor: "reels_pipeline.py", tags: ["Notion", "WhatsApp"] } },
    { id: "3", type: "condition", position: col(2), data: { label: "Você aprova?", icon: "👩🏽", details: "Aprovar = mover o card IDEIAS → 'A fazer'.\nNão gostou = deixa lá ou descarta.", executor: "Andréia" } },
    { id: "4", type: "action", position: col(3), data: { label: "Roteiro no PRÓPRIO card", icon: "🎬", details: "Em até 30 min (heartbeat).\nGancho ≤3s, 3 blocos, CTA, capa, sugestão visual — estilo dela + aprendizados de feedbacks anteriores.\nCard vai pra 'Gravar Reels'.", executor: "reels_pipeline.py roteiros", tags: ["Gemini"] } },
    { id: "5", type: "condition", position: col(4), data: { label: "Quer ajustar?", icon: "✍️", details: "Escreve parágrafo 'FEEDBACK: ...' no card e move de volta pra 'A fazer'.\nRegrava em até 30 min seguindo o feedback; o pedido fica salvo e vale pros próximos roteiros.", executor: "Andréia" } },
    { id: "6", type: "end", position: col(5), data: { label: "Gravar sexta", icon: "📱", details: "Roteiro no card ('Gravar Reels') + tarefa no Notion + aviso WhatsApp.\nSábado é o plano B oficial.", executor: "Andréia" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4", label: "A fazer" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-4", source: "5", target: "4", label: "FEEDBACK + A fazer" },
    { id: "e5-6", source: "5", target: "6", label: "tá bom" },
  ],
};

const reelsStudio: SeedFlow = {
  title: "Reels-studio: edição automática (\"meu CapCut\")",
  category: "automation",
  description:
    "Você grava e sobe o bruto; a VPS devolve o reel editado no seu estilo: cortes de silêncio e de \"corta isso\", legendas IBM Plex com destaque Terracota, punch-in no gancho, trilha com ducking e capa da série. Zero token (ffmpeg + Whisper local).",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Vídeo bruto", icon: "🎥", details: "Você envia pro BOT do Telegram (@jarbas_open_bot) — a Donna do WhatsApp NÃO edita vídeo. Pode dizer o título da capa e a série na mesma mensagem.", executor: "Andréia" } },
    { id: "2", type: "action", position: col(1), data: { label: "Transcrever", icon: "🎧", details: "faster-whisper local (modelo small, mesmo cache do transcribe.py).", executor: "/opt/reels-studio/studio.py" } },
    { id: "3", type: "action", position: col(2), data: { label: "Cortar silêncios e erros", icon: "✂️", details: "Silêncio ≥0,8s sai; trecho com \"corta isso\"/\"de novo\" é descartado.", executor: "studio.py" } },
    { id: "4", type: "action", position: col(3), data: { label: "Legendas + zoom + trilha", icon: "🎨", details: "Legendas queimadas (IBM Plex, destaque Terracota), punch-in 3s no gancho, música com ducking na voz.", executor: "ffmpeg" } },
    { id: "5", type: "end", position: col(4), data: { label: "Reel 1080×1920 + capa", icon: "✅", details: "MP4 + capa PNG (Special Elite) prontos pra agendar.\nPreset: estilo-andreia.yaml (ajusta 1x, repete sempre).", executor: "studio.py" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
  ],
};

const radarParaInstagram: SeedFlow = {
  title: "Ponte Radar → Instagram",
  category: "automation",
  description:
    "Card do Radar marcado com o checkbox \"→ Instagram\" vira ideia no banco Conteúdos (coluna IDEIAS) com a pesquisa já pronta — a squad de carrossel pula a etapa do Mike. De hora em hora, zero token.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "De hora em hora", icon: "⏰", details: "18/07: era 1x/dia às 18h; agora roda a cada hora.", executor: "cron → radar_to_carousel.py" } },
    { id: "2", type: "action", position: col(1), data: { label: "Buscar cards marcados", icon: "☑️", details: "Checkbox \"→ Instagram\" no Radar.", executor: "radar_to_carousel.py", tags: ["Notion"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Criar ideia no banco Conteúdos", icon: "💡", details: "Status=IDEIAS · Formato=Carrossel · Canal=Instagram · corpo com o texto do card.", executor: "radar_to_carousel.py", tags: ["Notion"] } },
    { id: "4", type: "end", position: col(3), data: { label: "Aviso no Telegram", icon: "💬", executor: "Bot Telegram" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const aprendizEstilo: SeedFlow = {
  title: "Aprendiz de estilo (Mike melhorando)",
  category: "automation",
  description:
    "Domingo à noite o sistema estuda o que você aprovou, editou e descartou no Radar e recalcula os pesos do Mike (fontes e temas). 1 chamada Gemini por semana pros padrões de edição.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Domingo 21h30 BRT", icon: "⏰", executor: "cron → style_learner.py" } },
    { id: "2", type: "action", position: col(1), data: { label: "Ler decisões do Radar", icon: "🗂️", details: "Aprovados vs descartados por fonte, tema, tipo; edições que você fez nos textos.", executor: "style_learner.py", tags: ["Notion"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Atualizar style-profile.json", icon: "🧠", details: "Pesos por fonte/tema + padrões de edição (Gemini 1x/semana).", executor: "style_learner.py", tags: ["Gemini"] } },
    { id: "4", type: "end", position: col(3), data: { label: "Mike e Izzy usam na próxima rodada", icon: "📈", details: "Fonte ruim perde ponto; taxa de aprovação vira o gráfico do painel /metricas.", executor: "ia_content_generator.py" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const snapshotMetricas: SeedFlow = {
  title: "Snapshot diário de métricas",
  category: "automation",
  description:
    "Toda noite a VPS consolida saúde + produção (fila, Radar, dicas, jobs) e publica o histórico que alimenta as páginas /metricas e /metricas/palestra. Zero token.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "23h BRT — todo dia", icon: "⏰", executor: "cron → metrics-snapshot.py" } },
    { id: "2", type: "action", position: col(1), data: { label: "Coletar fontes", icon: "🧮", details: "status.json, ia_queue, Radar (Notion), dica-bank, jobs das squads, logs.", executor: "metrics-snapshot.py", tags: ["Notion"] } },
    { id: "3", type: "end", position: col(2), data: { label: "Publicar metrics-history.json", icon: "📊", details: "Bucket público do Supabase Storage (mesmo padrão do status.json).", executor: "Supabase Storage", tags: ["Supabase"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
  ],
};

const alertaFalhasDonna: SeedFlow = {
  title: "Donna alerta falhas (canal cruzado)",
  category: "automation",
  description:
    "A cada 5 min o semáforo verifica ENTREGAS (o briefing saiu hoje? tem envio pendente?), não só processos. Problema novo = alerta com canal CRUZADO: problema no WhatsApp/gateway chega pelo Telegram (direto na API, sem passar pelo gateway caído); problema no Telegram chega pelo WhatsApp. Fila do kanban só alerta com 10+ NOTÍCIAS pendentes (dica/reel não contam). Sem spam (cooldown 6h, silêncio 22h30–6h30 exceto vermelho).",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 5 min", icon: "⏰", executor: "cron → status-saude.py" } },
    { id: "2", type: "action", position: col(1), data: { label: "Checar entregas de verdade", icon: "🔎", details: "Briefings WhatsApp/Telegram saíram HOJE? Pendente travado? Crons frescos? 10+ notícias esperando avaliação? Disco?", executor: "status-saude.py" } },
    { id: "3", type: "condition", position: col(2), data: { label: "Problema novo?", icon: "❓", details: "Compara com o último estado alertado (dedup).", executor: "status-saude.py" } },
    { id: "4", type: "action", position: col(3), data: { label: "Alerta no canal que FUNCIONA", icon: "🚨", details: "Problema no WhatsApp/gateway → Telegram (Bot API direta).\nOutros problemas → WhatsApp pessoal (nunca o grupo).\nRecuperação também avisa (1x), pelo mesmo canal.", executor: "status-saude.py", tags: ["WhatsApp", "Telegram"] } },
    { id: "5", type: "end", position: col(4), data: { label: "Painel atualizado", icon: "🟢", details: "status.json AO VIVO → semáforo do topo + aba Saúde do /metricas (mesma fonte).", executor: "Supabase Storage" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
  ],
};

const donnaCapturaIdeias: SeedFlow = {
  title: "Donna captura ideias de conteúdo (WhatsApp)",
  category: "automation",
  description:
    "Encaminhou um link do Instagram pra Donna, ou disse 'isso é ideia de post/reels/carrossel/stories'? Ela salva no banco Conteúdos com Status IDEIAS e o campo Link preenchido — sem formato nem plataforma, porque quem decide o que a ideia vira é você, depois.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Você manda pra Donna", icon: "📱", details: "Link do Instagram encaminhado OU mensagem tipo 'ideia pra post/reels/carrossel/stories' + o conteúdo.", executor: "Andréia", tags: ["WhatsApp"] } },
    { id: "2", type: "action", position: col(1), data: { label: "Donna classifica", icon: "🧠", details: "Reconhece que é ideia de conteúdo pras redes (não tarefa, não despejo).", executor: "Donna (Gemini)", tags: ["Gemini"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Salva no banco Conteúdos", icon: "💡", details: "captura.py ideia \"título\" \"descrição\" \"link\".\nStatus SEMPRE IDEIAS · Link preenchido · SEM formato/canal (você decide depois).", executor: "capturas/captura.py", tags: ["Notion"] } },
    { id: "4", type: "end", position: col(3), data: { label: "Confirmação em 1 linha", icon: "✅", details: "\"💡 Salvei no banco de Conteúdos, coluna IDEIAS.\"", executor: "Donna", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const rotinaSemanal: SeedFlow = {
  title: "Minha semana de conteúdo (rotina)",
  category: "manual",
  description:
    "A rotina realista: semana é celular (aprovações rápidas), produção pesada é sexta/sábado/domingo. O sistema te lembra de tudo por WhatsApp + lista de tarefas.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Seg-qua: kanban no celular", icon: "📱", details: "~10 min/dia: aprovar/descartar notícias e dicas; responder comentários.", executor: "Andréia" } },
    { id: "2", type: "action", position: col(1), data: { label: "Qua 18h: pautas de reels chegam", icon: "🎬", details: "Automático (aviso WhatsApp + tarefa).", executor: "reels_pipeline" } },
    { id: "3", type: "action", position: col(2), data: { label: "Qui: aprovar + ler roteiros à noite", icon: "🌙", details: "Roteiro chega pronto à noite; ler e deixar a ideia decantar.", executor: "Andréia" } },
    { id: "4", type: "action", position: col(3), data: { label: "Sex: gravar (plano B: sábado)", icon: "🎥", details: "Falou \"corta isso\"? O reels-studio limpa. Subir brutos no Telegram/Drive.", executor: "Andréia" } },
    { id: "5", type: "action", position: col(4), data: { label: "Sáb: revisar artes + agendar", icon: "🗓️", details: "Checkpoints da squad, Canva, Meta Business Suite (semana seguinte).", executor: "Andréia" } },
    { id: "6", type: "end", position: col(5), data: { label: "Dom: Revisão Semanal (30 min)", icon: "📊", details: "Colar métricas no Notion; olhar o Calendário Editorial. Produção longa (e-book, aulas) é fds.", executor: "Andréia" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};


// ─────────────────────────────────────────────────────────────
// AUTOMAÇÕES SEM DESENHO até 24/07/2026 — desenhadas lendo os scripts
// reais (não é chute: cada nó reflete o que o .sh/.py faz de fato).
// ─────────────────────────────────────────────────────────────

const backupDiario: SeedFlow = {
  title: "Backup diário da VPS pro Drive",
  category: "automation",
  description:
    "Todo dia às 2h BRT, empacota o que não dá pra reinstalar (memória do Claude, config do OpenClaw, scripts, banco) e manda pro Google Drive do Jarbas. Guarda 3 cópias aqui e 7 dias lá. Zero IA.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "2h BRT — todo dia", icon: "⏰", details: "cron 0 5 * * * (UTC).", executor: "cron → backup-vps.sh" } },
    { id: "2", type: "action", position: col(1), data: { label: "Empacotar Claude Code", icon: "🧠", details: "Memória, CLAUDE.md, docs e scripts do /root.\nPlugins e cache ficam de fora: são reinstaláveis.", executor: "backup-vps.sh" } },
    { id: "3", type: "action", position: col(2), data: { label: "Empacotar OpenClaw", icon: "🤖", details: "openclaw.json, credenciais OAuth, workspaces e agentes.\nBinários e libs Python ficam de fora (volumosos).", executor: "backup-vps.sh" } },
    { id: "4", type: "action", position: col(3), data: { label: "Faxina local", icon: "🧹", details: "Mantém só os 3 snapshots mais recentes em /root/backups.", executor: "backup-vps.sh" } },
    { id: "5", type: "condition", position: col(4), data: { label: "Drive conectado?", icon: "❓", details: "Se o remote JarbasDrive2 não responde, o backup fica só local e o log avisa.", executor: "rclone" } },
    { id: "6", type: "end", position: col(5), data: { label: "Enviado pro Drive", icon: "💾", details: "JarbasDrive2:backup-vps/<data>.\nRetenção remota: 7 dias.", executor: "rclone", tags: ["Google Drive"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" }, { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
  ],
};

const watchdogTelegram: SeedFlow = {
  title: "Watchdog do bot Telegram",
  category: "automation",
  description:
    "De 30 em 30 min confere se o bot do Telegram está mesmo respondendo — não basta o serviço estar 'ligado'. Se achar sessão travada, menu preso ou login expirado, reinicia sozinho.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 30 min", icon: "⏰", executor: "cron → watchdog-claude-telegram.sh" } },
    { id: "2", type: "condition", position: col(1), data: { label: "Serviço no ar?", icon: "❓", details: "systemctl is-active claude-telegram.", executor: "watchdog-claude-telegram.sh" } },
    { id: "3", type: "condition", position: col(2), data: { label: "Sessão tmux existe?", icon: "❓", details: "tmux has-session -t claude-telegram.", executor: "watchdog-claude-telegram.sh" } },
    { id: "4", type: "condition", position: col(3), data: { label: "Vivo mas quebrado?", icon: "🔍", details: "Lê a tela do tmux procurando: prompt vazio parado, menu inicial preso, sessão/auth expirada, limite de uso, crash do CLI.", executor: "tmux capture-pane" } },
    { id: "5", type: "end", position: col(4), data: { label: "Reinicia e registra", icon: "🔄", details: "systemctl restart + linha no log dizendo o motivo.", executor: "systemd", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" }, { id: "e4-5", source: "4", target: "5" },
  ],
};

const restartPreventivoTelegram: SeedFlow = {
  title: "Restart preventivo do bot Telegram",
  category: "automation",
  description:
    "Todo dia às 5h BRT o bot é reiniciado mesmo estando bem. É higiene: sessão longa acumula lixo e trava justo quando você vai usar de manhã.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "5h BRT — todo dia", icon: "⏰", details: "cron 0 8 * * * (UTC). Antes do seu dia começar.", executor: "cron" } },
    { id: "2", type: "action", position: col(1), data: { label: "Reinicia o serviço", icon: "🔄", details: "systemctl restart claude-telegram — sem perguntar se está travado.", executor: "systemd" } },
    { id: "3", type: "end", position: col(2), data: { label: "Bot fresco pro dia", icon: "💬", details: "Registrado no mesmo log do watchdog.", executor: "claude-telegram", tags: ["Telegram"] } },
  ],
  edges: [{ id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" }],
};

const dispatcherFinancas: SeedFlow = {
  title: "Dispatcher de finanças do Jarbas (ensure)",
  category: "automation",
  description:
    "De minuto em minuto verifica se o processo que entrega as mensagens de finanças (Louis) está de pé dentro do container. Se caiu, sobe de novo. É a automação mais frequente do ecossistema — e a mais barata: não faz nada quando está tudo certo.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "A cada 1 minuto", icon: "⏰", executor: "cron → ensure-jarbas-dispatcher.sh" } },
    { id: "2", type: "condition", position: col(1), data: { label: "Processo rodando?", icon: "❓", details: "pgrep wa_finances_dispatcher.py dentro do container do OpenClaw.", executor: "docker exec" } },
    { id: "3", type: "action", position: col(2), data: { label: "Sim → não faz nada", icon: "😌", details: "Custo zero. O caso normal.", executor: "ensure-jarbas-dispatcher.sh" } },
    { id: "4", type: "end", position: col(3), data: { label: "Não → sobe de novo", icon: "🔄", details: "nohup python3 wa_finances_dispatcher.py, log em /tmp/wa_finances.log.", executor: "docker exec", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e2-4", source: "2", target: "4" },
  ],
};

const equipePublica: SeedFlow = {
  title: "Equipe pública do modo palco",
  category: "automation",
  description:
    "Toda madrugada publica uma versão PÚBLICA da sua equipe de agentes — a mesma do RH, mas sem os links dos seus GPTs e sem ids. É o que aparece quando você mostra o painel numa palestra.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "23h10 BRT — todo dia", icon: "⏰", details: "cron 10 2 * * * (UTC).", executor: "cron → equipe-sync.py" } },
    { id: "2", type: "action", position: col(1), data: { label: "Ler equipe no Supabase", icon: "📖", details: "Tabelas collaborators + assignments (as mesmas da tela de RH).", executor: "equipe-sync.py", tags: ["Supabase"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Tirar o que é privado", icon: "🔒", details: "Links dos GPTs dela e ids internos ficam de fora.", executor: "equipe-sync.py" } },
    { id: "4", type: "end", position: col(3), data: { label: "Publica equipe-publica.json", icon: "🎤", details: "Bucket público status — é dele que o modo palco lê.", executor: "Supabase Storage" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const grafoConhecimento: SeedFlow = {
  title: "Grafo de conhecimento (coletor diário)",
  category: "automation",
  description:
    "Toda manhã varre o Notion e remonta o mapa que liga temas, conteúdos e agentes — o grafo que você vê na Biblioteca. Roda dentro do container do OpenClaw, que é onde mora a chave do Notion.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "5h10 BRT — todo dia", icon: "⏰", details: "cron 10 8 * * * (UTC).", executor: "cron → grafo-conteudo-cron.sh" } },
    { id: "2", type: "action", position: col(1), data: { label: "Pegar credenciais", icon: "🔑", details: "Lê Supabase do .env.local do painel e injeta no container (a chave do Notion já vive lá dentro).", executor: "grafo-conteudo-cron.sh" } },
    { id: "3", type: "action", position: col(2), data: { label: "Varrer o Notion", icon: "🕸️", details: "Até 250 páginas, últimos 120 dias. Monta nós e ligações entre temas, conteúdos e agentes.", executor: "grafo_conteudo.py", tags: ["Notion"] } },
    { id: "4", type: "end", position: col(3), data: { label: "Publica grafo_conteudo.json", icon: "📊", details: "Bucket público status → aba 🕸️ Grafo da Biblioteca.", executor: "Supabase Storage" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

const checagemIzzy: SeedFlow = {
  title: "Checagem da 1ª rodada da Izzy",
  category: "automation",
  description:
    "Depois que a Izzy passou a escrever pelo Claude, esta checagem confere de manhã se a primeira rodada saiu certo e te conta pelo Telegram. Auto-desativa depois do primeiro aviso: era pra tranquilizar uma vez, não virar rotina.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "7h30 BRT", icon: "⏰", details: "cron 30 10 * * * (UTC).", executor: "cron → check-izzy-primeira-rodada.sh" } },
    { id: "2", type: "condition", position: col(1), data: { label: "Já avisou uma vez?", icon: "❓", details: "Se /tmp/izzy-check-done existe, sai calado.", executor: "check-izzy-primeira-rodada.sh" } },
    { id: "3", type: "action", position: col(2), data: { label: "Contar acertos e erros", icon: "🔢", details: "Lê o log da ponte: quantas escritas OK pelo Claude, quantos erros, se houve queda pro Gemini.", executor: "check-izzy-primeira-rodada.sh" } },
    { id: "4", type: "action", position: col(3), data: { label: "Pegar 2 títulos gerados", icon: "📰", details: "Últimas notícias da fila (ia_queue.json) — pra você ver o resultado, não só o número.", executor: "check-izzy-primeira-rodada.sh" } },
    { id: "5", type: "end", position: col(4), data: { label: "Avisa e se aposenta", icon: "💬", details: "Manda no Telegram e cria /tmp/izzy-check-done — não roda mais.", executor: "Bot API", tags: ["Telegram"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" }, { id: "e4-5", source: "4", target: "5" },
  ],
};

const escolaAvisoD2: SeedFlow = {
  title: "Escola do Luiz: aviso D-2",
  category: "automation",
  description:
    "Todo dia às 7h30 avisa o que o Luiz tem daqui a 2 dias: prova, trabalho, entrega. A agenda vem das fotos que você manda pra Donna; o cálculo de prazo é Python puro, sem gastar IA.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "7h30 BRT — todo dia", icon: "⏰", details: "cron 30 10 * * * (UTC).", executor: "cron → escola_luiz.py avisos" } },
    { id: "2", type: "action", position: col(1), data: { label: "Ler a agenda salva", icon: "🎒", details: "escola-agenda.json — alimentado quando você manda foto do caderno pra Donna.", executor: "escola_luiz.py" } },
    { id: "3", type: "action", position: col(2), data: { label: "Calcular prazos", icon: "🧮", details: "Para-casa sem data usa a PRÓXIMA AULA da disciplina. Dedup pra não repetir aviso. Zero token.", executor: "escola_luiz.py" } },
    { id: "4", type: "condition", position: col(3), data: { label: "Tem algo em 2 dias?", icon: "❓", executor: "escola_luiz.py" } },
    { id: "5", type: "end", position: col(4), data: { label: "Avisa você", icon: "📣", details: "Mensagem com o que é, de qual matéria e quantos pontos vale. Também vira tarefa no Notion.", executor: "Donna", tags: ["Notion"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" }, { id: "e4-5", source: "4", target: "5" },
  ],
};

const escolaRelatorioSemana: SeedFlow = {
  title: "Escola do Luiz: relatório da semana",
  category: "automation",
  description:
    "Domingo às 19h fecha a semana escolar do Luiz num resumo só: o que teve, o que vem, o que ficou pendente. Pra você começar a semana sabendo.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Domingo, 19h BRT", icon: "⏰", details: "cron 0 22 * * 0 (UTC).", executor: "cron → escola_luiz.py relatorio-semana" } },
    { id: "2", type: "action", position: col(1), data: { label: "Juntar a semana", icon: "📅", details: "Provas, trabalhos e entregas dos últimos 7 dias e dos próximos.", executor: "escola_luiz.py" } },
    { id: "3", type: "end", position: col(2), data: { label: "Manda o resumo", icon: "📊", details: "Um texto só, sem gastar IA — template fixo.", executor: "Donna" } },
  ],
  edges: [{ id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" }],
};

const lembreteGravarReels: SeedFlow = {
  title: "Lembrete de gravar os reels (sexta)",
  category: "automation",
  description:
    "Sexta às 18h a Donna te lembra no WhatsApp que é hora de gravar — os roteiros já chegaram nos cards. A mensagem é fixa e carinhosa, inclusive com o plano B do sábado. Zero IA.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Sexta, 18h BRT", icon: "⏰", details: "cron 0 21 * * 5 (UTC).", executor: "cron" } },
    { id: "2", type: "action", position: col(1), data: { label: "Mensagem pronta", icon: "✍️", details: "Texto fixo: onde estão os roteiros, o truque do \"corta isso\", e o plano B do sábado sem culpa.", executor: "openclaw message send" } },
    { id: "3", type: "end", position: col(2), data: { label: "Chega no seu WhatsApp", icon: "🎥", details: "Número pessoal — nunca no grupo.", executor: "Donna", tags: ["WhatsApp"] } },
  ],
  edges: [{ id: "e1-2", source: "1", target: "2" }, { id: "e2-3", source: "2", target: "3" }],
};


const envioImediato: SeedFlow = {
  title: "Envio imediato marcado no Radar",
  category: "automation",
  description:
    "Você marca um card como 'Enviar agora' no Radar e ele fura a fila: sai em até 5 minutos, sem esperar o intervalo de 2h nem a alternância notícia/dica. Só respeita a janela de 8h às 20h30 — fora dela, espera as 8h. Zero IA.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Você marca no Notion", icon: "⚡", details: "Campo 'Prioridade de envio' do Radar:\n· Enviar agora → fura a fila\n· Próximo → primeiro no próximo envio normal", executor: "Andréia", tags: ["Notion"] } },
    { id: "2", type: "start", position: col(1), data: { label: "A cada 5 minutos", icon: "⏰", details: "Checagem própria, separada do envio normal (que roda a cada 30 min).", executor: "cron → ia_group_sender.py agora" } },
    { id: "3", type: "condition", position: col(2), data: { label: "Está dentro da janela?", icon: "🕗", details: "8h às 20h30 BRT. Fora disso, espera — decisão dela: 'envio de notícia sempre dentro da janela, mesmo eu mandando agora'.", executor: "ia_group_sender.py" } },
    { id: "4", type: "action", position: col(3), data: { label: "Pega o texto ATUAL do card", icon: "📄", details: "Lê o corpo do card no Notion na hora do envio, então suas edições valem.", executor: "notion_radar.py", tags: ["Notion"] } },
    { id: "5", type: "end", position: col(4), data: { label: "Envia e limpa a marcação", icon: "📤", details: "Manda no grupo, marca como Enviado e apaga a prioridade — senão o card ficaria furando a fila pra sempre.", executor: "OpenClaw", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-3", source: "1", target: "3" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
  ],
};


const donnaGuardaPessoal: SeedFlow = {
  title: "Donna guarda filme, livro e compra",
  category: "automation",
  description:
    "Você manda um print ou áudio pra Donna no WhatsApp e a coisa aparece no banco certo do Notion, COM a imagem anexada. Nasceu em 25/07/2026 do pedido dela: ver um produto num story, printar, e não precisar abrir o Notion pra guardar.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Você manda print ou áudio", icon: "📱", details: "Pelo WhatsApp. Pode dizer o que é (\"filme\", \"série\", \"livro\", \"compras\") ou mandar só a imagem.", executor: "Andréia", tags: ["WhatsApp"] } },
    { id: "2", type: "condition", position: col(1), data: { label: "Ela disse o que era?", icon: "❓", details: "Se disse, vale a palavra dela — sem adivinhação.\nSe não disse, a Donna OLHA a imagem e decide.", executor: "Donna" } },
    { id: "3", type: "action", position: col(2, 100), data: { label: "Donna lê a imagem", icon: "👁️", details: "Capa de livro → livro.\nPôster ou trailer → filme.\nProduto com preço, story de loja → compra.\nNa dúvida entre dois, pergunta em UMA linha.", executor: "Donna (Gemini)", tags: ["Gemini"] } },
    { id: "4", type: "action", position: col(3), data: { label: "Extrai o que dá pra ler", icon: "🔎", details: "Nome, autor, preço, onde assistir, link.\nO que não der pra ler fica em branco — não inventa.", executor: "Donna" } },
    { id: "5", type: "action", position: col(4), data: { label: "Sobe a imagem pro Notion", icon: "🖼️", details: "A foto vai pro próprio Notion (API de upload), não como link externo. Se o upload falhar, o item é salvo assim mesmo — melhor sem foto do que sem registro.", executor: "captura_pessoal.py", tags: ["Notion"] } },
    { id: "6", type: "end", position: col(5, 100), data: { label: "🎬 Filmes & Séries", icon: "🎬", details: "Status \"Quero assistir\". Campos: Tipo, Onde está, Sinopse, Capa.", executor: "Notion", tags: ["Notion"] } },
    { id: "7", type: "end", position: col(5, 250), data: { label: "📚 Livros", icon: "📚", details: "Status \"Quero ler\". Campos: Autor, Descrição, Link para compra, Capa.", executor: "Notion", tags: ["Notion"] } },
    { id: "8", type: "end", position: col(5, 400), data: { label: "🛍️ Minha Lista de Desejos", icon: "🛍️", details: "Status \"Desejo\", Prioridade \"Quero\". Campos: Preço, Link, Categoria, Imagem.", executor: "Notion", tags: ["Notion"] } },
    { id: "9", type: "end", position: col(6), data: { label: "Confirma em 1 linha", icon: "✅", details: "Com o link do card, pra você conferir sem procurar.", executor: "Donna", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3", data: { label: "não disse" } },
    { id: "e2-4", source: "2", target: "4", data: { label: "disse" } },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
    { id: "e5-7", source: "5", target: "7" },
    { id: "e5-8", source: "5", target: "8" },
    { id: "e6-9", source: "6", target: "9" },
    { id: "e7-9", source: "7", target: "9" },
    { id: "e8-9", source: "8", target: "9" },
  ],
};

export const SEED_FLOWS: SeedFlow[] = [
  // Automações
  briefingTelegram,
  briefingWhatsApp,
  alertaCompromisso,
  noticiasNormal,
  noticiasUAU,
  financasWA,
  saudeEcossistema,
  rondaDiaria,
  resumoPendentesIA,
  pipelineReels,
  reelsStudio,
  radarParaInstagram,
  donnaCapturaIdeias,
  donnaGuardaPessoal,
  aprendizEstilo,
  snapshotMetricas,
  alertaFalhasDonna,
  // Automações desenhadas em 24/07 (antes só existiam no crontab)
  backupDiario,
  watchdogTelegram,
  restartPreventivoTelegram,
  dispatcherFinancas,
  equipePublica,
  grafoConhecimento,
  checagemIzzy,
  escolaAvisoD2,
  escolaRelatorioSemana,
  lembreteGravarReels,
  envioImediato,
  // Squads
  squadInstagramCarrossel,
  squadLicitacao,
  squadCriarAgente,
  // Rotina manual
  rotinaSemanal,
].map(rotateFlow);
