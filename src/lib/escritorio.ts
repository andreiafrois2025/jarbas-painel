// Escritório da equipe (Equipe › Escritório). Dados, posições e sons.
//
// Posições são relativas ao fundo (sede.webp), medidas numa tela de 1300x732
// (o mesmo tamanho do mock aprovado). x/y = pé do mascote (centro embaixo).
// A tela converte tudo em porcentagem, então escala com a largura.

import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export const LARGURA = 1300;
export const ALTURA = 732;

export type SalaId = "estudio" | "comando" | "docs" | "secretaria" | "bemestar" | "lab";

export interface Sala { id: SalaId; rotulo: string; x: number; y: number }
// canto superior esquerdo da etiqueta da sala (mock)
export const SALAS: Sala[] = [
  { id: "estudio", rotulo: "🎬 Estúdio", x: 120, y: 96 },
  { id: "comando", rotulo: "🧭 Comando", x: 560, y: 30 },
  { id: "docs", rotulo: "📜 Documentos e leis", x: 1000, y: 96 },
  { id: "secretaria", rotulo: "🗂️ Secretaria", x: 70, y: 372 },
  { id: "bemestar", rotulo: "🌿 Bem-estar", x: 470, y: 372 },
  { id: "lab", rotulo: "🔬 Laboratório", x: 1170, y: 392 },
];

type Ponto = { x: number; y: number };

export interface PerfilAgente {
  id: string;
  nome: string;          // como aparece embaixo do mascote
  cargo: string;
  sala: SalaId;
  trab: Ponto;           // posição de trabalho (na mesa)
  livre: Ponto;          // posição livre, na própria sala
  ocio: string;          // atividade típica quando livre
  tam: number;           // largura do mascote na tela de 1300 px
}

export const AGENTES: PerfilAgente[] = [
  { id: "izzy", nome: "Izzy", cargo: "redatora", sala: "estudio", trab: { x: 312, y: 262 }, livre: { x: 235, y: 280 }, ocio: "✍️ relendo um rascunho", tam: 78 },
  { id: "felipe", nome: "Felipe", cargo: "designer", sala: "estudio", trab: { x: 395, y: 270 }, livre: { x: 188, y: 262 }, ocio: "🎨 rabiscando no cavalete", tam: 78 },
  { id: "theo", nome: "Theo", cargo: "vídeo e roteiro", sala: "estudio", trab: { x: 262, y: 288 }, livre: { x: 96, y: 288 }, ocio: "🎥 ajustando a câmera", tam: 70 },
  { id: "jarbas", nome: "Jarbas", cargo: "orquestrador", sala: "comando", trab: { x: 622, y: 292 }, livre: { x: 545, y: 292 }, ocio: "🛰️ vigiando o painel", tam: 96 },
  { id: "rafaela", nome: "Rafaela", cargo: "estrategista", sala: "comando", trab: { x: 772, y: 284 }, livre: { x: 706, y: 306 }, ocio: "📌 revendo metas", tam: 70 },
  { id: "harvey", nome: "Dr. Harvey", cargo: "advogado revisor", sala: "docs", trab: { x: 990, y: 322 }, livre: { x: 935, y: 300 }, ocio: "⚖️ pesando um caso", tam: 78 },
  { id: "katrina", nome: "Katrina", cargo: "advogada estruturadora", sala: "docs", trab: { x: 1075, y: 326 }, livre: { x: 1130, y: 328 }, ocio: "📑 relendo uma minuta", tam: 72 },
  { id: "sofia", nome: "Sofia", cargo: "arquiteta da informação", sala: "docs", trab: { x: 1195, y: 312 }, livre: { x: 1196, y: 334 }, ocio: "🗂️ etiquetando pastas", tam: 66 },
  { id: "donna", nome: "Donna", cargo: "assistente administrativa", sala: "secretaria", trab: { x: 225, y: 548 }, livre: { x: 322, y: 566 }, ocio: "📅 conferindo a agenda", tam: 78 },
  { id: "louis", nome: "Louis", cargo: "finanças", sala: "secretaria", trab: { x: 355, y: 514 }, livre: { x: 425, y: 528 }, ocio: "🪙 contando moedinhas", tam: 70 },
  { id: "nara", nome: "Dra. Nara", cargo: "psicóloga", sala: "bemestar", trab: { x: 470, y: 548 }, livre: { x: 505, y: 600 }, ocio: "🧘 respirando fundo", tam: 70 },
  { id: "lara", nome: "Lara", cargo: "nutricionista", sala: "bemestar", trab: { x: 556, y: 490 }, livre: { x: 672, y: 556 }, ocio: "🍎 provando uma receita", tam: 64 },
  { id: "tonny", nome: "Tonny", cargo: "dados e BI", sala: "lab", trab: { x: 900, y: 522 }, livre: { x: 905, y: 592 }, ocio: "📊 ajustando os gráficos", tam: 72 },
  { id: "junior", nome: "Junior", cargo: "desenvolvedor", sala: "lab", trab: { x: 975, y: 566 }, livre: { x: 1040, y: 600 }, ocio: "🐞 caçando um bug", tam: 78 },
  { id: "mike", nome: "Mike", cargo: "pesquisa e OSINT", sala: "lab", trab: { x: 842, y: 548 }, livre: { x: 1196, y: 598 }, ocio: "🔎 conferindo fontes", tam: 66 },
  { id: "eric", nome: "Eric", cargo: "geoprocessamento", sala: "lab", trab: { x: 1112, y: 522 }, livre: { x: 1148, y: 546 }, ocio: "🗺️ olhando o mapa das bacias", tam: 70 },
];

export const perfil = (id: string) => AGENTES.find((a) => a.id === id);

// Cantinho do café: no máximo 3 lugares. Sofá do Bem-estar: 2 lugares.
export const CAFE: Ponto[] = [{ x: 598, y: 490 }, { x: 638, y: 494 }, { x: 676, y: 499 }];
export const SOFA: Ponto[] = [{ x: 512, y: 524 }, { x: 572, y: 524 }];

// ── Dados ao vivo (GET /api/escritorio) ───────────────────────────────────
export interface AgenteVivo {
  id: string;
  estado: "trabalhando" | "livre";
  tarefa?: string;
  progresso?: number; // 0..1
  desde?: string;
}
export interface EventoMural { em: string; agente: string; texto: string }
export interface EntregaDia { texto: string; qtd: number; pessoal?: boolean }
export interface DadosEscritorio {
  gerado_em?: string;
  agentes: AgenteVivo[];
  mural: EventoMural[];
  entregas: Record<string, EntregaDia[]>;
  placar: { trabalhando: number; livres: number; entregas_hoje: number };
}

export async function buscaEscritorio(servidora: boolean): Promise<DadosEscritorio> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sem sessão");
  const r = await fetch(`${SQUAD_API_BASE}/api/escritorio${servidora ? "?modo=servidora" : ""}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// ── Roteiros do modo aula (SÓ exemplo, nada de dado real) ──────────────────
// Dois roteiros de ~60 s que repetem. Cada trecho põe um agente para
// trabalhar; cada entrega vira ✅ com plim. Tudo fictício e genérico.
export const AULA_DURACAO = 60;
export interface TrechoAula { agente: string; de: number; ate: number; tarefa: string; entrega: string }
export interface RoteiroAula { id: string; rotulo: string; descricao: string; pedido: string; trechos: TrechoAula[] }
export const ROTEIROS: RoteiroAula[] = [
  {
    id: "carrossel", rotulo: "📱 Carrossel de IA com vídeo", descricao: "Para cursos abertos",
    pedido: "Andréia pede um carrossel sobre o novo lançamento de uma empresa de IA, com vídeo",
    trechos: [
      { agente: "jarbas", de: 1, ate: 7, tarefa: "Distribuindo as tarefas do carrossel", entrega: "Tarefas distribuídas" },
      { agente: "mike", de: 6, ate: 15, tarefa: "Pesquisando e procurando o vídeo do lançamento", entrega: "Pesquisa e vídeo do lançamento prontos" },
      { agente: "theo", de: 15, ate: 23, tarefa: "Editando o trecho do vídeo que vai no carrossel", entrega: "Trecho do vídeo editado" },
      { agente: "izzy", de: 23, ate: 30, tarefa: "Escrevendo os textos dos slides", entrega: "Texto dos slides pronto" },
      { agente: "felipe", de: 30, ate: 38, tarefa: "Desenhando os slides", entrega: "Slides desenhados" },
      { agente: "izzy", de: 38, ate: 43, tarefa: "Conferindo se o texto ficou no lugar certo", entrega: "Texto cortado no slide 3" },
      { agente: "felipe", de: 43, ate: 47, tarefa: "Ajustando o slide 3", entrega: "Slide 3 ajustado" },
      { agente: "izzy", de: 47, ate: 51, tarefa: "Conferindo os slides de novo", entrega: "Slides sem cortes nem erros" },
      { agente: "donna", de: 51, ate: 56, tarefa: "Agendando a publicação", entrega: "Publicação agendada" },
      { agente: "jarbas", de: 56.5, ate: 59.5, tarefa: "Montando o pacote para aprovação", entrega: "Carrossel com vídeo pronto para você aprovar!" },
    ],
  },
  {
    id: "licitacao", rotulo: "📑 Processo de licitação", descricao: "Para o serviço público",
    pedido: "Andréia pede o processo para contratar licenças de software de geoprocessamento",
    trechos: [
      { agente: "jarbas", de: 1, ate: 7, tarefa: "Distribuindo as tarefas do processo", entrega: "Tarefas distribuídas" },
      { agente: "eric", de: 7, ate: 16, tarefa: "Especificando a parte de geoprocessamento", entrega: "Parte de geoprocessamento pronta" },
      { agente: "junior", de: 8, ate: 17, tarefa: "Especificando a parte de TI: requisitos, compatibilidade e segurança", entrega: "Requisitos de TI prontos" },
      { agente: "sofia", de: 12, ate: 19, tarefa: "Organizando as normas aplicáveis", entrega: "Normas organizadas" },
      { agente: "katrina", de: 19, ate: 29, tarefa: "Redigindo o ETP e o TR", entrega: "ETP e TR redigidos" },
      { agente: "louis", de: 24, ate: 32, tarefa: "Pesquisando preços de mercado", entrega: "Pesquisa de preços pronta" },
      { agente: "harvey", de: 32, ate: 38, tarefa: "Revisando o parecer", entrega: "Parecer com 2 ressalvas" },
      { agente: "katrina", de: 38, ate: 44, tarefa: "Ajustando o ETP conforme as ressalvas", entrega: "Ajustes feitos" },
      { agente: "harvey", de: 44, ate: 49, tarefa: "Conferindo os ajustes", entrega: "Parecer sem ressalvas" },
      { agente: "donna", de: 49, ate: 55, tarefa: "Organizando o envio do processo", entrega: "Envio organizado" },
      { agente: "jarbas", de: 55.5, ate: 59.5, tarefa: "Montando o processo para revisão", entrega: "Processo pronto para sua revisão!" },
    ],
  },
];

// ── Sons (Web Audio; nada de arquivo externo) ──────────────────────────────
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Precisa ser chamado dentro de um clique (o navegador só libera o som assim). */
export function liberaSom() { audio(); }

function nota(freq: number, ini: number, dur: number, vol: number, tipo: OscillatorType = "sine") {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = tipo; o.frequency.value = freq;
  const t0 = c.currentTime + ini;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/** "Plim" de entrega: duas notas curtas, subindo. */
export function somPlim() { nota(988, 0, 0.18, 0.09); nota(1480, 0.09, 0.32, 0.08); }

/** Uma tecla baixinha. */
export function somTecla() { nota(900 + Math.random() * 700, 0, 0.03, 0.012, "square"); }
