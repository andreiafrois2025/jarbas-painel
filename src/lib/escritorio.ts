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
  { id: "rafaela", nome: "Rafaela", cargo: "estrategista", sala: "comando", trab: { x: 772, y: 284 }, livre: { x: 835, y: 298 }, ocio: "📌 revendo metas", tam: 70 },
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
  mais?: number;      // outros ajudantes na mesma mesa (balão mostra "+N")
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
// Dois roteiros de ~90 s que repetem, seguindo o fluxo real da squad, com
// CHECKPOINTS HUMANOS: a Andréia aparece no Comando ("Esperando você: ..."),
// "aprova" sozinha depois de ~2 s e o mural registra. Tudo fictício e genérico.
export interface TrechoAula { agente: string; de: number; ate: number; tarefa: string; entrega: string }
export interface CheckpointAula { de: number; espera: string; ok: string; mural: string; pedido?: boolean }
export interface RoteiroAula {
  id: string; rotulo: string; descricao: string; pedido: string; duracao: number;
  trechos: TrechoAula[]; checkpoints: CheckpointAula[];
}
/** Tempo (s) que a Andréia leva para "escolher", e quanto o "✔ escolheu" fica na tela. */
export const CP_ESPERA = 2.2;
export const CP_DURACAO = 4.2;
export const POS_ANDREIA = { x: 688, y: 314 }; // sala de Comando
export const ROTEIROS: RoteiroAula[] = [
  {
    id: "carrossel", rotulo: "📱 Carrossel de IA", descricao: "Para cursos abertos", duracao: 90,
    pedido: "Andréia pede um carrossel sobre 3 jeitos de usar IA para organizar a semana, com vídeo",
    checkpoints: [
      { de: 0.3, pedido: true, espera: "📨 Carrossel sobre 3 jeitos de usar IA para organizar a semana, com vídeo", ok: "", mural: "pediu um carrossel sobre 3 jeitos de usar IA para organizar a semana, com vídeo" },
      { de: 18, espera: "🙋 Esperando você: escolher os casos e o vídeo", ok: "✔ Andréia escolheu", mural: "aprovou os casos e o vídeo" },
      { de: 28, espera: "🙋 Esperando você: escolher o ângulo", ok: "✔ Andréia escolheu", mural: "aprovou o ângulo do carrossel" },
      { de: 41, espera: "🙋 Esperando você: aprovar o texto e o vídeo", ok: "✔ Andréia aprovou", mural: "aprovou o texto e o vídeo" },
      { de: 50, espera: "🙋 Esperando você: escolher o visual", ok: "✔ Andréia escolheu", mural: "aprovou a proposta visual" },
      { de: 75, espera: "🙋 Esperando você: aprovar o carrossel", ok: "✔ Andréia aprovou", mural: "aprovou o carrossel final" },
    ],
    trechos: [
      { agente: "rafaela", de: 3.5, ate: 9, tarefa: "Definindo a estratégia: público iniciante, objetivo ensinar, CTA \"salve e teste o jeito 1 hoje\"", entrega: "Estratégia definida" },
      { agente: "mike", de: 9, ate: 18, tarefa: "Pesquisando casos reais e um vídeo curto de demonstração, seguindo a estratégia", entrega: "Casos reais e vídeo de demonstração encontrados" },
      { agente: "izzy", de: 22.5, ate: 28, tarefa: "Propondo 3 ângulos para o carrossel", entrega: "3 ângulos propostos" },
      { agente: "izzy", de: 32.5, ate: 41, tarefa: "Escrevendo os textos dos slides", entrega: "Texto dos slides pronto" },
      { agente: "theo", de: 32.5, ate: 41, tarefa: "Cortando o trecho do vídeo", entrega: "Trecho do vídeo cortado" },
      { agente: "felipe", de: 45.5, ate: 50, tarefa: "Montando a proposta visual", entrega: "Proposta visual pronta" },
      { agente: "felipe", de: 54.5, ate: 62, tarefa: "Desenhando os slides", entrega: "Slides desenhados" },
      { agente: "izzy", de: 62, ate: 67, tarefa: "Conferindo se o texto ficou no lugar", entrega: "Texto cortado no slide 3" },
      { agente: "felipe", de: 67, ate: 71, tarefa: "Ajustando o slide 3", entrega: "Slide 3 ajustado" },
      { agente: "izzy", de: 71, ate: 75, tarefa: "Conferindo os slides de novo", entrega: "Slides sem cortes nem erros" },
      { agente: "donna", de: 79.5, ate: 84, tarefa: "Agendando a publicação", entrega: "Publicação agendada" },
      { agente: "jarbas", de: 84, ate: 89, tarefa: "Avisando que o carrossel está pronto", entrega: "Carrossel publicado na agenda de terça!" },
    ],
  },
  {
    // Ordem da squad real (pipeline.yaml): ETP, mapa de riscos, preços, TR.
    // O TR só começa depois da pesquisa de preços, porque usa os valores.
    id: "licitacao", rotulo: "📑 Processo de licitação", descricao: "Para o serviço público", duracao: 100,
    pedido: "Andréia envia a demanda: contratar licenças de software de geoprocessamento",
    checkpoints: [
      { de: 0.3, pedido: true, espera: "📨 Demanda: contratar licenças de software de geoprocessamento", ok: "", mural: "enviou a demanda: contratar licenças de software de geoprocessamento" },
      { de: 53, espera: "🙋 Esperando você: revisar o ETP e o TR", ok: "✔ Andréia aprovou", mural: "aprovou o ETP e o TR" },
      { de: 77, espera: "🙋 Esperando você: aprovar o processo", ok: "✔ Andréia aprovou", mural: "aprovou o processo" },
    ],
    trechos: [
      { agente: "jarbas", de: 3.5, ate: 8, tarefa: "Avaliando a demanda: é de tecnologia?", entrega: "Sim, é de tecnologia" },
      { agente: "eric", de: 8, ate: 16, tarefa: "Especificando a parte de geoprocessamento", entrega: "Parte de geoprocessamento pronta" },
      { agente: "junior", de: 9, ate: 17, tarefa: "Especificando a parte de TI: requisitos, compatibilidade e segurança", entrega: "Requisitos de TI prontos" },
      { agente: "sofia", de: 17, ate: 23, tarefa: "Organizando as normas aplicáveis", entrega: "Normas organizadas" },
      { agente: "katrina", de: 23, ate: 31, tarefa: "Redigindo o ETP", entrega: "ETP redigido" },
      { agente: "katrina", de: 31, ate: 35, tarefa: "Montando o mapa de riscos", entrega: "Mapa de riscos pronto" },
      { agente: "louis", de: 35, ate: 44, tarefa: "Pesquisando preços de mercado", entrega: "Pesquisa de preços pronta" },
      { agente: "katrina", de: 44, ate: 52, tarefa: "Redigindo o TR, já com os preços", entrega: "TR redigido" },
      { agente: "harvey", de: 58, ate: 65, tarefa: "Fazendo o parecer do ETP e do TR", entrega: "Parecer com 1 ressalva" },
      { agente: "katrina", de: 65, ate: 71, tarefa: "Corrigindo a ressalva", entrega: "Ressalva corrigida" },
      { agente: "harvey", de: 71, ate: 76, tarefa: "Conferindo a correção", entrega: "Parecer sem ressalvas" },
      { agente: "donna", de: 82, ate: 91, tarefa: "Organizando o envio do processo", entrega: "Envio organizado" },
      { agente: "jarbas", de: 91, ate: 98, tarefa: "Avisando que o processo está pronto", entrega: "Processo pronto para seguir!" },
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

/** Aprovação da Andréia: dois tons, mais graves e "redondos" que o plim. */
export function somDoisTons() { nota(523, 0, 0.2, 0.08, "triangle"); nota(698, 0.16, 0.34, 0.08, "triangle"); }

/** Uma tecla baixinha. */
export function somTecla() { nota(900 + Math.random() * 700, 0, 0.03, 0.012, "square"); }

// ── Arrumação dos balões (sem sobreposição) ────────────────────────────────
// Cada balão nasce em cima do seu agente. Medimos todos no DOM e procuramos,
// por tentativa e volta atrás (para um balão não "roubar" o lugar de outro),
// a combinação com menos deslocamento em que ninguém bate em ninguém: nem em
// outro balão, nem em rosto de outro agente, nem em etiqueta de sala, e tudo
// dentro do prédio. Os balões se deslocam para os lados e para cima, em passos;
// a setinha (--tx) e o talo (--stem) continuam apontando para o dono.
// Prioridade: checkpoint da Andréia > entrega ✅ > trabalhando > pausa/livre.
// Balão discreto (pausa, livre) que não achar lugar some, em vez de tapar alguém.
interface Ret { l: number; t: number; r: number; b: number }
const bate = (a: Ret, b: Ret, folga = 3) => a.l < b.r + folga && a.r + folga > b.l && a.t < b.b + folga && a.b + folga > b.t;
const MAX_POR_SALA_DISCRETO = 3;
const ORCAMENTO_NOS = 6000;

interface Item {
  el: HTMLElement; id: string; sala: string; prio: number; y: number;
  bw: number; bh: number; gap: number; ax: number; corpo: Ret; maxDx: number; discreto: boolean;
  outros: Ret[];
}
interface Cand { dx: number; dy: number; c: number }

export function arrumaBaloes(palco: HTMLElement) {
  // Se não couber com o tamanho normal, os balões de tarefa ficam mais estreitos
  // (nível 1 e 2) antes de desistir de evitar a sobreposição.
  const NIVEIS = ["", "cmp", "cmp2"];
  const aplicaNivel = (n: number) => palco.querySelectorAll<HTMLElement>(".esc-fala").forEach((el) => {
    const prio = Number(el.dataset.prio ?? 4);
    el.classList.toggle("cmp", n === 1 && prio >= 1 && prio <= 2);
    el.classList.toggle("cmp2", n === 2 && prio >= 1 && prio <= 2);
  });
  let escolhido = 0, melhorC = Infinity;
  for (let n = 0; n < NIVEIS.length; n++) {
    aplicaNivel(n);
    const c = resolver(palco, false);
    if (c < melhorC) { melhorC = c; escolhido = n; }
    if (c < 2000) break; // coube sem esconder ninguém
  }
  aplicaNivel(escolhido);
  resolver(palco, true);
}

/** Devolve o custo da melhor arrumação (>= 2000 = escondeu algum balão; >= 3000 = teve que sobrepor). */
function resolver(palco: HTMLElement, aplicar: boolean): number {
  const W = palco.clientWidth, H = palco.clientHeight;
  if (!W || !H) return 0;
  const pr = palco.getBoundingClientRect();
  const ex = W / LARGURA, ey = H / ALTURA;
  const margem = 4;
  const area: Ret = { l: margem, t: margem, r: W - margem, b: H - margem };

  const corpos = new Map<string, Ret>();
  palco.querySelectorAll<HTMLElement>(".esc-ag[data-id]").forEach((ag) => {
    const x = Number(ag.dataset.x) * ex, y = Number(ag.dataset.y) * ey;
    const w = ag.offsetWidth, h = ag.offsetHeight;
    corpos.set(ag.dataset.id!, { l: x - w / 2, r: x + w / 2, t: y - h, b: y });
  });
  const etiquetas: Ret[] = [];
  palco.querySelectorAll<HTMLElement>(".esc-sala").forEach((e) => {
    const r = e.getBoundingClientRect();
    etiquetas.push({ l: r.left - pr.left, r: r.right - pr.left, t: r.top - pr.top, b: r.bottom - pr.top });
  });

  const itens: Item[] = [];
  palco.querySelectorAll<HTMLElement>(".esc-fala").forEach((el) => {
    const ag = el.closest<HTMLElement>(".esc-ag[data-id]");
    const corpo = ag && corpos.get(ag.dataset.id!);
    if (!ag || !corpo) return;
    const bw = el.offsetWidth, bh = el.offsetHeight;
    const prio = Number(el.dataset.prio ?? 4);
    itens.push({
      el, id: ag.dataset.id!, sala: ag.dataset.sala || "", prio, y: Number(ag.dataset.y), bw, bh,
      gap: parseFloat(getComputedStyle(el).marginBottom) || 6, ax: (corpo.l + corpo.r) / 2, corpo,
      maxDx: Math.max(0, bw / 2 - 14), discreto: prio >= 3,
      outros: [...corpos.entries()].filter(([id]) => id !== ag.dataset.id).map(([, r]) => r),
    });
  });
  itens.sort((a, b) => a.prio - b.prio || a.y - b.y);

  const monta = (it: Item, dx: number, dy: number) => {
    const b = it.corpo.t - it.gap + dy;
    const bal: Ret = { l: it.ax - it.bw / 2 + dx, r: it.ax + it.bw / 2 + dx, b, t: b - it.bh };
    const talo: Ret = { l: it.ax - 3, r: it.ax + 3, t: b, b: it.corpo.t };
    return { bal, talo };
  };
  const livre = (it: Item, dx: number, dy: number, colocados: Ret[], comCorpos: boolean) => {
    const { bal, talo } = monta(it, dx, dy);
    if (bal.l < area.l || bal.r > area.r || bal.t < area.t) return false;
    if (colocados.some((c) => bate(bal, c))) return false;
    if (comCorpos && it.outros.some((c) => bate(bal, c, 2))) return false;
    if (etiquetas.some((c) => bate(bal, c, 2))) return false;
    if (dy < -2) {
      if (colocados.some((c) => bate(talo, c, 1))) return false;
      if (comCorpos && it.outros.some((c) => bate(talo, c, 0))) return false;
    }
    return true;
  };
  const grade = (it: Item) => {
    const g: Cand[] = [];
    const subida = Math.max(it.bh * 2.8, 150);
    for (let dx = -it.maxDx; dx <= it.maxDx + 0.1; dx += 16) for (let dy = 0; dy >= -subida; dy -= 10) g.push({ dx, dy, c: Math.abs(dx) + Math.abs(dy) * 1.25 });
    return g.sort((p, q) => p.c - q.c);
  };
  const grades = itens.map(grade);

  // pré-corte: no máximo N balões discretos por sala (os de menor prioridade somem)
  const contaSala: Record<string, number> = {};
  const podeDiscreto = itens.map((it) => {
    if (!it.discreto) return true;
    contaSala[it.sala] = (contaSala[it.sala] ?? 0) + 1;
    return contaSala[it.sala] <= MAX_POR_SALA_DISCRETO;
  });

  // busca com volta atrás: por balão, tenta os melhores lugares de cada coluna (dx)
  const colocados: Ret[] = [];
  const escolha: (Cand | null)[] = new Array(itens.length).fill(null);
  let melhor: (Cand | null)[] | null = null, melhorCusto = Infinity, nos = 0;
  const busca = (i: number, custo: number) => {
    if (custo >= melhorCusto || nos > ORCAMENTO_NOS) return;
    if (i === itens.length) { melhor = escolha.slice(); melhorCusto = custo; return; }
    nos++;
    const it = itens[i];
    const opcoes: Cand[] = [];
    // por coluna (dx): o primeiro lugar livre e alguns degraus acima dele (10, 20, 40, 80 px)
    const base = new Map<number, number>();
    for (const k of grades[i]) {
      if (!livre(it, k.dx, k.dy, colocados, true)) continue;
      const b0 = base.get(k.dx);
      if (b0 === undefined) { base.set(k.dx, k.dy); opcoes.push(k); continue; }
      const sobe = b0 - k.dy;
      if (sobe === 10 || sobe === 20 || sobe === 40 || sobe === 80) opcoes.push(k);
    }
    opcoes.sort((p, q) => p.c - q.c);
    for (const k of opcoes) {
      const { bal, talo } = monta(it, k.dx, k.dy);
      const sobe = k.dy < -2;
      colocados.push(bal); if (sobe) colocados.push(talo);
      escolha[i] = k;
      busca(i + 1, custo + k.c);
      colocados.pop(); if (sobe) colocados.pop();
      escolha[i] = null;
      if (nos > ORCAMENTO_NOS) return;
    }
    if (it.discreto) { escolha[i] = null; busca(i + 1, custo + 400); }
    else if (it.prio === 2 && !opcoes.length) { escolha[i] = null; busca(i + 1, custo + 2500); } // balão de tarefa some em vez de tapar alguém (o agente continua aceso e clicável)
    if (!it.discreto && !opcoes.length && it.prio !== 2) { // sem lugar: relaxa (ignora rostos), último recurso
      const k = grades[i].find((c) => livre(it, c.dx, c.dy, colocados, false)) ?? { dx: 0, dy: 0, c: 0 };
      const { bal } = monta(it, k.dx, k.dy);
      colocados.push(bal); escolha[i] = k;
      busca(i + 1, custo + 3000 + k.c);
      colocados.pop(); escolha[i] = null;
    }
  };
  // balões que não podem aparecer (limite por sala) saem da busca como "ocultos"
  const ativos = itens.map((_, i) => podeDiscreto[i]);
  const idx = itens.map((_, i) => i).filter((i) => ativos[i]);
  if (idx.length !== itens.length) {
    // refaz listas só com os ativos, mantendo a ordem
    const sub = idx.map((i) => itens[i]); const subG = idx.map((i) => grades[i]);
    itens.length = 0; itens.push(...sub); grades.length = 0; grades.push(...subG);
    escolha.length = itens.length;
  }
  busca(0, 0);
  if (!aplicar) return melhorCusto;
  const final = (melhor ?? escolha) as (Cand | null)[];

  const visiveis = new Set<HTMLElement>();
  itens.forEach((it, i) => {
    const esc = final[i];
    const st = it.el.style;
    if (!esc) return;
    visiveis.add(it.el);
    it.el.dataset.oculto = "";
    delete it.el.dataset.oculto;
    st.visibility = "";
    st.setProperty("--dx", `${esc.dx.toFixed(1)}px`);
    st.setProperty("--dy", `${esc.dy.toFixed(1)}px`);
    st.setProperty("--stem", `${(-esc.dy).toFixed(1)}px`);
    st.setProperty("--tx", `${(it.bw / 2 - esc.dx).toFixed(1)}px`);
    it.el.classList.toggle("desl", esc.dy < -2 || Math.abs(esc.dx) > 2);
  });
  palco.querySelectorAll<HTMLElement>(".esc-fala").forEach((el) => {
    if (visiveis.has(el)) return;
    el.style.visibility = "hidden";
    el.dataset.oculto = "1";
  });
  return melhorCusto;
}
