// Grafo do ecossistema — nós e conexões curados (fase 1).
// Fase 2 (futura): arestas derivadas das relations/menções do Notion.

export type TipoNo = "agente" | "automacao" | "lugar" | "canal";

export interface No {
  id: string;
  rotulo: string;
  icone: string;
  tipo: TipoNo;
}

export const NOS: No[] = [
  // canais (como ela interage)
  { id: "andreia", rotulo: "Andréia", icone: "👩🏽", tipo: "canal" },
  { id: "whatsapp", rotulo: "WhatsApp", icone: "📱", tipo: "canal" },
  { id: "telegram", rotulo: "Telegram", icone: "💬", tipo: "canal" },
  { id: "painel", rotulo: "Painel", icone: "🖥️", tipo: "canal" },
  { id: "grupo", rotulo: "Grupo IA", icone: "👥", tipo: "canal" },

  // agentes-chave (os 16 existem; no grafo, os operacionais)
  { id: "donna", rotulo: "Donna", icone: "🗂️", tipo: "agente" },
  { id: "jarbas", rotulo: "Jarbas", icone: "🤵", tipo: "agente" },
  { id: "mike", rotulo: "Mike", icone: "🔍", tipo: "agente" },
  { id: "izzy", rotulo: "Izzy", icone: "✍️", tipo: "agente" },
  { id: "theo", rotulo: "Theo", icone: "🎬", tipo: "agente" },
  { id: "felipe", rotulo: "Felipe", icone: "🎨", tipo: "agente" },
  { id: "louis", rotulo: "Louis", icone: "💰", tipo: "agente" },
  { id: "katrina", rotulo: "Katrina", icone: "📜", tipo: "agente" },

  // automações
  { id: "captura", rotulo: "Central de Captura", icone: "📥", tipo: "automacao" },
  { id: "escola", rotulo: "Escola do Luiz", icone: "🎒", tipo: "automacao" },
  { id: "radar-pipe", rotulo: "Radar de notícias", icone: "📡", tipo: "automacao" },
  { id: "sender", rotulo: "Envio agendado", icone: "📤", tipo: "automacao" },
  { id: "reels-pipe", rotulo: "Pipeline de reels", icone: "🎞️", tipo: "automacao" },
  { id: "reels-studio", rotulo: "Reels-studio", icone: "✂️", tipo: "automacao" },
  { id: "aprendiz", rotulo: "Aprendiz de estilo", icone: "🧠", tipo: "automacao" },
  { id: "semaforo", rotulo: "Semáforo + alertas", icone: "🚨", tipo: "automacao" },
  { id: "briefing", rotulo: "Briefing matinal", icone: "🌅", tipo: "automacao" },
  { id: "metrics", rotulo: "Snapshot métricas", icone: "📊", tipo: "automacao" },
  { id: "squad-carrossel", rotulo: "Squad carrossel", icone: "🎠", tipo: "automacao" },

  // lugares (onde as coisas moram)
  { id: "radar-db", rotulo: "Radar (kanban)", icone: "🗃️", tipo: "lugar" },
  { id: "conteudos-db", rotulo: "Banco Conteúdos", icone: "💡", tipo: "lugar" },
  { id: "planner", rotulo: "Planner (tarefas)", icone: "✅", tipo: "lugar" },
  { id: "agenda", rotulo: "Agenda Google", icone: "📅", tipo: "lugar" },
  { id: "drive", rotulo: "Drive", icone: "☁️", tipo: "lugar" },
  { id: "vps", rotulo: "VPS", icone: "🖳", tipo: "lugar" },
];

// [origem, destino] — a seta importa menos que a conexão
export const ARESTAS: [string, string][] = [
  ["andreia", "whatsapp"], ["andreia", "telegram"], ["andreia", "painel"],
  ["whatsapp", "donna"], ["telegram", "jarbas"],
  ["donna", "captura"], ["captura", "escola"], ["captura", "planner"],
  ["captura", "conteudos-db"], ["escola", "agenda"], ["escola", "planner"],
  ["donna", "briefing"], ["briefing", "agenda"], ["briefing", "planner"],
  ["donna", "semaforo"], ["semaforo", "vps"], ["semaforo", "whatsapp"],
  ["mike", "radar-pipe"], ["radar-pipe", "radar-db"], ["izzy", "radar-pipe"],
  ["radar-db", "sender"], ["sender", "grupo"], ["aprendiz", "radar-db"],
  ["aprendiz", "mike"], ["aprendiz", "izzy"],
  ["reels-pipe", "radar-db"], ["reels-pipe", "izzy"], ["theo", "reels-pipe"],
  ["theo", "reels-studio"], ["reels-studio", "drive"], ["reels-studio", "whatsapp"],
  ["squad-carrossel", "conteudos-db"], ["felipe", "squad-carrossel"],
  ["izzy", "squad-carrossel"], ["mike", "squad-carrossel"],
  ["louis", "whatsapp"], ["katrina", "jarbas"],
  ["metrics", "painel"], ["metrics", "vps"], ["semaforo", "painel"],
  ["jarbas", "vps"], ["radar-pipe", "vps"], ["reels-pipe", "vps"],
  ["painel", "grupo"],
];
