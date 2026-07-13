// Grafo do ecossistema — nós e conexões curados.
// Fase 1: agentes, automações, lugares, canais (camada "ecossistema").
// Fase 2: hubs do Segundo Cérebro no Notion (camada "notion"), ligados à
// camada dos agentes por "pontes" (ex.: Inteligência Artificial → Radar).

export type TipoNo =
  | "agente" | "automacao" | "lugar" | "canal"  // camada ecossistema
  | "raiz" | "area";                            // camada notion

export type Camada = "ecossistema" | "notion";

export interface No {
  id: string;
  rotulo: string;
  icone: string;
  tipo: TipoNo;
  camada?: Camada; // ausente = "ecossistema"
  url?: string;    // nós do Notion: link pra página real (abre no clique)
}

const NP = "https://app.notion.com/p/"; // prefixo das páginas do Notion

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

  // ── Camada Notion: Segundo Cérebro (hubs curados = "Áreas da minha vida") ──
  { id: "sc-raiz", rotulo: "Segundo Cérebro", icone: "🧠", tipo: "raiz", camada: "notion", url: NP + "2fbb90b9061d81358ea3dbe208c199eb" },
  { id: "area-ia", rotulo: "Inteligência Artificial", icone: "🤖", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d816f81f3dfe1450b9cdc" },
  { id: "area-servidora", rotulo: "Servidora (IGAM)", icone: "🏛️", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d8134b3ccd3bd863343bc" },
  { id: "area-luiz", rotulo: "Luiz Fernando", icone: "🎒", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d81cfa8f1de2c0dafb784" },
  { id: "area-financas", rotulo: "Finanças Pessoais", icone: "💳", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d811b91aedee510b09f24" },
  { id: "area-revisao", rotulo: "Revisão Diária", icone: "🔁", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d81f8910aca4a14eb484e" },
  { id: "area-conhecimento", rotulo: "Conhecimento", icone: "📚", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d812f9a66e9f7d2ec125d" },
  { id: "area-projetos", rotulo: "Projetos", icone: "📁", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d818c92a5c0440be2806b" },
  { id: "area-familia", rotulo: "Família", icone: "👨‍👩‍👦", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d818cb439ca11cf22b5d3" },
  { id: "area-casa", rotulo: "Casa", icone: "🏠", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d8155af7ff32b5f4c23fa" },
  { id: "area-meraki", rotulo: "Meraki", icone: "✨", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d81d9b698f009cd41b094" },
  { id: "area-desarrumado", rotulo: "Meu Desarrumado", icone: "🗂️", tipo: "area", camada: "notion", url: NP + "2fbb90b9061d81439d79d8516ddb1622" },
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

  // ── Camada Notion: raiz → áreas da vida (hierarquia do Segundo Cérebro) ──
  ["sc-raiz", "area-ia"], ["sc-raiz", "area-servidora"], ["sc-raiz", "area-luiz"],
  ["sc-raiz", "area-financas"], ["sc-raiz", "area-revisao"], ["sc-raiz", "area-conhecimento"],
  ["sc-raiz", "area-projetos"], ["sc-raiz", "area-familia"], ["sc-raiz", "area-casa"],
  ["sc-raiz", "area-meraki"], ["sc-raiz", "area-desarrumado"],
  // relações entre áreas (a vida real dela)
  ["area-ia", "area-servidora"], ["area-meraki", "area-ia"],
  // ── Pontes Notion ↔ ecossistema (os dois mundos se tocam) ──
  ["area-ia", "radar-db"], ["area-ia", "conteudos-db"],
  ["area-luiz", "escola"], ["area-revisao", "planner"], ["area-revisao", "agenda"],
  ["area-financas", "louis"], ["area-servidora", "katrina"],
];
