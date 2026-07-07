// =============================================
// Fluxos-semente — desenhos das automações que já rodam na VPS
// e dos squads existentes. Populados como is_seed=true (read-only).
// A Andréia pode duplicar pra editar.
// =============================================

import type { FlowDoc } from "./types";

type SeedFlow = Omit<FlowDoc, "id" | "user_id" | "created_at" | "updated_at">;

// Layout helper — coluna vertical com espaçamento fixo
const col = (i: number, x = 250) => ({ x, y: 60 + i * 120 });

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
    "Todo dia 8h BRT o Mike busca notícias de IA. Cria cards no Notion pra você avaliar. 3x por dia (8h/13h/18h BRT) o Izzy gera post das aprovadas, você aprova, o sender publica no grupo.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "8h BRT", icon: "⏰", details: "HEARTBEAT bloco 4, trava diária.", executor: "cron 30min → HEARTBEAT" } },
    { id: "2", type: "action", position: col(1), data: { label: "Mike busca RSS", icon: "🔍", details: "Fontes: OpenAI, Anthropic, Google DeepMind, Google AI, Meta AI, Mistral, NVIDIA, MS AI, HuggingFace, The Verge AI, TechCrunch AI, VentureBeat AI, MIT Tech Review, etc.\nJanela: últimas 48h.\nSalva: ia_raw_news.json.", executor: "ia_news_fetcher.py", tags: ["RSS"] } },
    { id: "3", type: "action", position: col(2), data: { label: "Cria card Notion", icon: "📇", details: "Radar de Posts IA.\nStatus inicial: 'Pra avaliar'.\nSe is_uau=false (não é fonte oficial + verbo de lançamento).", executor: "notion_radar.create_card", tags: ["Notion"] } },
    { id: "4", type: "action", position: col(3), data: { label: "Você avalia no kanban", icon: "👀", details: "Você arrasta o card:\n- 'Aprovado' = vira post\n- 'Descartado' = ignora\n- Fica 'Pra avaliar' = aguarda", executor: "humano", tags: ["Notion"] } },
    { id: "5", type: "action", position: col(4), data: { label: "Izzy gera post", icon: "✏️", details: "3x/dia (8h/13h/18h BRT).\nPega até 25 cards 'Aprovado' e monta o texto do post pro grupo WA.\nCusto: usa Gemini (chave faturada).", executor: "ia_content_generator.py", tags: ["Gemini"] } },
    { id: "6", type: "action", position: col(5), data: { label: "Sender publica", icon: "📤", details: "Janela: 8h–20h30 BRT.\nIntervalo mínimo: 2h entre posts.\nOrdem: Prioridade → Aprovado.", executor: "ia_group_sender.py", tags: ["WhatsApp"] } },
    { id: "7", type: "end", position: col(6), data: { label: "Grupo IA no WA", icon: "💬", details: "Grupo Imersão IA na Prática (comunidade).", tags: ["WhatsApp"] } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5", label: "Aprovado" },
    { id: "e5-6", source: "5", target: "6" },
    { id: "e6-7", source: "6", target: "7" },
  ],
};

const noticiasUAU: SeedFlow = {
  title: "Notícias UAU (fluxo prioritário)",
  category: "automation",
  description:
    "Ramo especial do fluxo de notícias. Se o Mike detecta uma notícia UAU (fonte oficial + verbo de lançamento), o card vai direto pra 'Importante'. A Donna te avisa no WhatsApp pra você olhar rápido. Se você aprovar, move pra 'Prioridade' — que pula a fila.",
  is_seed: true,
  nodes: [
    { id: "1", type: "start", position: col(0), data: { label: "Mike encontrou notícia", icon: "🔍", details: "Já no ia_news_fetcher, cada item é marcado is_uau=true se: (a) fonte oficial (OpenAI/Anthropic/etc.) ou tier-1 (The Verge/TechCrunch/etc.) E (b) título tem verbo de lançamento (launches, releases, announces, novo modelo, gpt-N, claude N, gemini N, fable N, sora, veo N).", executor: "ia_news_fetcher.py" } },
    { id: "2", type: "condition", position: col(1), data: { label: "É UAU?", icon: "🌟", details: "Só entra nesse fluxo se is_uau=true." } },
    { id: "3", type: "action", position: { x: 500, y: 180 }, data: { label: "Card 'Importante'", icon: "🔥", details: "notion_radar.create_card com status='Importante'.\nColuna laranja no kanban.", executor: "notion_radar.py", tags: ["Notion"] } },
    { id: "4", type: "action", position: { x: 500, y: 300 }, data: { label: "Donna monitora", icon: "👁️", details: "A cada 30 min, verifica cards em 'Importante' que ainda não foram vistos.\nGuarda page_ids em notion_important_seen.json.", executor: "notion_important_watcher.py" } },
    { id: "5", type: "action", position: { x: 500, y: 420 }, data: { label: "Notifica WhatsApp", icon: "📱", details: "🔥 *Notícia UAU no Radar*\n*<título>*\n_Fonte: <fonte>_\n\nAvalia no Notion:\n<url>\n\nSe quiser publicar no grupo, move o card pra *Prioridade*.", executor: "OpenClaw", tags: ["WhatsApp"] } },
    { id: "6", type: "action", position: { x: 500, y: 540 }, data: { label: "Você avalia", icon: "🧐", details: "Você abre o Notion, lê a notícia. Decide:\n- Move pra 'Prioridade' = publica na frente da fila\n- Move pra 'Descartado' = ignora\n- Deixa em 'Importante' = fica em standby", executor: "humano" } },
    { id: "7", type: "action", position: { x: 500, y: 660 }, data: { label: "Sender publica primeiro", icon: "🚀", details: "ia_group_sender reordena a fila: 'Prioridade' vai antes de 'Aprovado'.\nAinda respeita janela 8h–20h30 e 2h entre posts.", executor: "ia_group_sender.py", tags: ["WhatsApp"] } },
    { id: "8", type: "end", position: { x: 100, y: 420 }, data: { label: "Fluxo normal", icon: "↩️", details: "Se não é UAU, segue o fluxo normal (card em 'Pra avaliar')." } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3", label: "sim" },
    { id: "e2-8", source: "2", target: "8", label: "não" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
    { id: "e5-6", source: "5", target: "6" },
    { id: "e6-7", source: "6", target: "7", label: "Prioridade" },
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
  // Squads
  squadInstagramCarrossel,
  squadLicitacao,
  squadCriarAgente,
];
