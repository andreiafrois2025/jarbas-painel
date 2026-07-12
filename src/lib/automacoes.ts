// Catálogo das automações do ecossistema com a informação-chave da tese dela:
// "uso IA pra CONSTRUIR automações que depois rodam SEM IA".
// usaIA = consome IA na EXECUÇÃO (não na construção — todas foram construídas com IA).

export interface Automacao {
  icone: string;
  nome: string;
  usaIA: boolean;
  custo: string; // descrição honesta do custo de execução
}

export const AUTOMACOES: Automacao[] = [
  { icone: "🚨", nome: "Semáforo + alertas da Donna (5 em 5 min)", usaIA: false, custo: "zero — só Python lendo arquivos" },
  { icone: "🔎", nome: "Ronda diária do ecossistema", usaIA: false, custo: "zero" },
  { icone: "🌅", nome: "Briefing matinal (Telegram + WhatsApp)", usaIA: false, custo: "zero — template fixo com agenda e tarefas" },
  { icone: "📊", nome: "Snapshot diário de métricas", usaIA: false, custo: "zero" },
  { icone: "📤", nome: "Envio agendado pro grupo (sender)", usaIA: false, custo: "zero — lê o card e envia" },
  { icone: "🔁", nome: "Ponte Radar → Instagram", usaIA: false, custo: "zero" },
  { icone: "✂️", nome: "Reels-studio (edição de vídeo)", usaIA: false, custo: "zero — ffmpeg + Whisper local na VPS" },
  { icone: "💾", nome: "Backup diário VPS → Drive", usaIA: false, custo: "zero" },
  { icone: "🧹", nome: "Dedup de títulos e faxinas", usaIA: false, custo: "zero" },
  { icone: "🐕", nome: "Watchdogs (bot, dispatcher, pipeline)", usaIA: false, custo: "zero" },
  { icone: "🔍", nome: "Mike busca notícias (RSS + scoring)", usaIA: false, custo: "zero — IA só entra na escrita" },
  { icone: "✍️", nome: "Izzy escreve posts e dicas", usaIA: true, custo: "Gemini, centavos por rodada" },
  { icone: "🎬", nome: "Pautas e roteiros de reels", usaIA: true, custo: "1 chamada Gemini por pauta/roteiro" },
  { icone: "🧠", nome: "Aprendiz de estilo (semanal)", usaIA: true, custo: "1 chamada Gemini por semana" },
  { icone: "💰", nome: "Louis registra finanças por áudio", usaIA: true, custo: "Gemini por registro" },
  { icone: "🎠", nome: "Squads (carrossel, licitação)", usaIA: true, custo: "assinatura Claude, sob demanda" },
];

export const SEM_IA = AUTOMACOES.filter((a) => !a.usaIA).length;
export const COM_IA = AUTOMACOES.filter((a) => a.usaIA).length;
