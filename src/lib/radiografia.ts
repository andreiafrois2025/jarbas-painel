// =============================================================
// Radiografia dos fluxos (18/10/2026) — lógica pura, sem React.
//
// Inspirada na skill "radiografar": o MESMO fluxo lido em 3 níveis.
//   1 Leigo          — poucas peças, zero jargão, só o caminho principal
//   2 Intermediário  — todas as peças, decisões, retornos, horários
//   3 Código         — as mesmas peças, apontando pro script real
//
// Tudo sai dos dados que já existem em `flows_doc` (nodes/edges). Nada aqui
// grava no banco.
// =============================================================

import type { FlowDoc, FlowDocEdge, FlowDocNode } from "./types";
import { arestasDeVolta } from "./flow/layout";

export type Nivel = 1 | 2 | 3;

export const NIVEIS: { n: Nivel; rotulo: string; dica: string }[] = [
  { n: 1, rotulo: "Leigo", dica: "o que acontece, em linguagem de gente" },
  { n: 2, rotulo: "Intermediário", dica: "as peças, os horários e as decisões" },
  { n: 3, rotulo: "Código", dica: "o script e o comando de verdade" },
];

// ── Peças e setas já posicionadas pra desenhar ──────────────────────────
export interface Peca {
  id: string;
  type: FlowDocNode["type"];
  label: string;
  icon: string;
  /** peças originais que esta representa (mais de uma no nível Leigo, quando junta) */
  membros: FlowDocNode[];
  x: number;
  y: number;
  w: number;
  h: number;
  camada: number;
}

export interface Seta {
  id: string;
  source: string;
  target: string;
  label?: string;
  isReturn?: boolean;
}

export interface Desenho {
  pecas: Peca[];
  setas: Seta[];
  largura: number;
  altura: number;
  /** id original → id da peça que o representa neste nível */
  mapa: Map<string, string>;
}

const TAM = {
  retangulo: { w: 200, h: 96 },
  circulo: { w: 130, h: 112 },
  losango: { w: 220, h: 120 },
};
const FOLGA_X = 64;
const FOLGA_Y = 40;
const MARGEM = 36;

function tamanho(type: FlowDocNode["type"]) {
  if (type === "start" || type === "end") return TAM.circulo;
  if (type === "condition") return TAM.losango;
  return TAM.retangulo;
}

/** Junta ações seguidas pra caber no nível Leigo (máx. `limite` peças). */
function agrupaParaLeigo(nodes: FlowDocNode[], edges: FlowDocEdge[], limite: number) {
  // grupo: id da peça-líder → membros em ordem
  const grupos = new Map<string, FlowDocNode[]>(nodes.map((n) => [n.id, [n]]));
  const dono = new Map<string, string>(nodes.map((n) => [n.id, n.id]));
  const fwd = edges.filter((e) => !e.isReturn);

  const tenta = (mesmoExecutor: boolean): boolean => {
    for (const e of fwd) {
      const a = dono.get(e.source)!;
      const b = dono.get(e.target)!;
      if (a === b) continue;
      const na = grupos.get(a)!;
      const nb = grupos.get(b)!;
      if (na[na.length - 1].type !== "action" || nb[0].type !== "action") continue;
      if (na.length + nb.length > 4) continue;
      // só junta se for fila indiana: a só sai pra b, b só recebe de a
      const saidasA = fwd.filter((x) => dono.get(x.source) === a && dono.get(x.target) !== a);
      const entradasB = fwd.filter((x) => dono.get(x.target) === b && dono.get(x.source) !== b);
      if (saidasA.length !== 1 || entradasB.length !== 1) continue;
      if (mesmoExecutor && (na[0].data.executor || "") !== (nb[0].data.executor || "")) continue;
      grupos.set(a, [...na, ...nb]);
      grupos.delete(b);
      for (const m of nb) dono.set(m.id, a);
      return true;
    }
    return false;
  };

  while (grupos.size > limite && tenta(true)) { /* junta quem tem o mesmo executor */ }
  while (grupos.size > limite && tenta(false)) { /* depois, qualquer ação seguida */ }
  return { grupos, dono };
}

function rotuloGrupo(membros: FlowDocNode[]): string {
  if (membros.length === 1) return membros[0].data.label;
  if (membros.length === 2) return `${membros[0].data.label} + ${membros[1].data.label}`;
  // 3 ou mais: o primeiro passo e quantos vêm junto (o resto aparece ao clicar)
  return `${membros[0].data.label} (+${membros.length - 1} etapas)`;
}

/** Monta o desenho de um nível. */
export function montaDesenho(flow: FlowDoc, nivel: Nivel, limiteLeigo = 7): Desenho {
  let nodes = flow.nodes;
  let edges = flow.edges;
  const mapa = new Map<string, string>();
  let pecasBase: { id: string; type: FlowDocNode["type"]; label: string; icon: string; membros: FlowDocNode[]; y: number }[];

  if (nivel === 1) {
    // Leigo: some com anotações e com as setas de retorno (só o caminho feliz)
    nodes = nodes.filter((n) => n.type !== "note");
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => !e.isReturn && ids.has(e.source) && ids.has(e.target));
    const { grupos, dono } = agrupaParaLeigo(nodes, edges, limiteLeigo);
    pecasBase = [...grupos.entries()].map(([id, membros]) => ({
      id,
      type: membros[0].type,
      label: rotuloGrupo(membros),
      icon: membros[0].data.icon || "",
      membros,
      y: membros[0].position?.y ?? 0,
    }));
    for (const [orig, lider] of dono) mapa.set(orig, lider);
    // setas entre grupos (sem duplicar, sem laço)
    const vistas = new Set<string>();
    edges = edges.reduce<FlowDocEdge[]>((acc, e) => {
      const s = dono.get(e.source)!;
      const t = dono.get(e.target)!;
      const chave = `${s}>${t}>${e.label || ""}`;
      if (s === t || vistas.has(chave)) return acc;
      vistas.add(chave);
      acc.push({ ...e, id: `${s}_${t}_${acc.length}`, source: s, target: t });
      return acc;
    }, []);
  } else {
    pecasBase = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.data.label,
      icon: n.data.icon || "",
      membros: [n],
      y: n.position?.y ?? 0,
    }));
    for (const n of nodes) mapa.set(n.id, n.id);
  }

  // ── camadas: caminho mais longo a partir do início, ignorando retornos ──
  const ids = new Set(pecasBase.map((p) => p.id));
  // ligações que voltam (ex.: A→B e B→A): por busca em profundidade, não pela ordem dos números
  const voltas = arestasDeVolta(pecasBase.map((p) => p.id), edges.map((e) => ({ source: e.source, target: e.target, retorno: e.isReturn })));
  const fwd = edges.filter((e, i) => !e.isReturn && !voltas.has(i) && ids.has(e.source) && ids.has(e.target));
  const camada = new Map<string, number>(pecasBase.map((p) => [p.id, 0]));
  for (let volta = 0; volta < pecasBase.length; volta++) {
    let mudou = false;
    for (const e of fwd) {
      const novo = (camada.get(e.source) ?? 0) + 1;
      // trava em n-1 camadas: laços sem marca de retorno não rodam pra sempre
      if (novo > (camada.get(e.target) ?? 0) && novo < pecasBase.length) {
        camada.set(e.target, novo);
        mudou = true;
      }
    }
    if (!mudou) break;
  }
  // Setas "pra trás" sem a marca de retorno viram retorno no desenho
  const setas: Seta[] = edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      isReturn: e.isReturn || voltas.has(edges.indexOf(e)) || (camada.get(e.target) ?? 0) <= (camada.get(e.source) ?? 0),
    }));

  // Fim sempre na última camada ligada; notas soltas ficam na primeira
  const porCamada = new Map<number, typeof pecasBase>();
  for (const p of pecasBase) {
    const c = camada.get(p.id) ?? 0;
    porCamada.set(c, [...(porCamada.get(c) || []), p]);
  }
  const camadasOrdenadas = [...porCamada.keys()].sort((a, b) => a - b);
  const maxLinhas = Math.max(...[...porCamada.values()].map((l) => l.length), 1);

  const larguraCamada = camadasOrdenadas.map((c) =>
    Math.max(...porCamada.get(c)!.map((p) => tamanho(p.type).w)),
  );
  const alturaCamada = camadasOrdenadas.map((c) =>
    porCamada.get(c)!.reduce((s, p, i) => s + tamanho(p.type).h + (i ? FOLGA_Y : 0), 0),
  );
  const alturaTotal = Math.max(...alturaCamada, TAM.retangulo.h);

  const pecas: Peca[] = [];
  let x = MARGEM;
  camadasOrdenadas.forEach((c, ci) => {
    const lista = porCamada.get(c)!.slice().sort((a, b) => a.y - b.y);
    let y = MARGEM + (alturaTotal - alturaCamada[ci]) / 2;
    for (const p of lista) {
      const t = tamanho(p.type);
      pecas.push({
        id: p.id,
        type: p.type,
        label: p.label,
        icon: p.icon,
        membros: p.membros,
        x: x + (larguraCamada[ci] - t.w) / 2,
        y,
        w: t.w,
        h: t.h,
        camada: ci,
      });
      y += t.h + FOLGA_Y;
    }
    x += larguraCamada[ci] + FOLGA_X;
  });
  void maxLinhas;

  const temRetorno = setas.some((s) => s.isReturn);
  return {
    pecas,
    setas,
    largura: x - FOLGA_X + MARGEM,
    altura: alturaTotal + MARGEM * 2 + (temRetorno ? 70 : 0),
    mapa,
  };
}

// ── Resumo executivo (começa / termina / passos) ────────────────────────
export interface Resumo {
  inicio: string;
  fim: string;
  passos: { id: string; t: string; d: string }[];
}

export function primeiraFrase(txt?: string): string {
  if (!txt) return "";
  const linha = txt.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
  const m = linha.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : linha).slice(0, 200);
}

export function montaResumo(d: Desenho, nivel: Nivel, max = 9): Resumo {
  const ordem = d.pecas
    .filter((p) => p.type !== "note")
    .slice()
    .sort((a, b) => a.camada - b.camada || a.y - b.y);
  const ini = ordem.find((p) => p.type === "start") || ordem[0];
  const fins = ordem.filter((p) => p.type === "end");
  const textoPeca = (p: Peca) =>
    nivel === 1
      ? p.membros.map((m) => primeiraFrase(m.data.details)).filter(Boolean).join(" ")
      : [p.membros[0].data.executor && `Quem faz: ${p.membros[0].data.executor}.`, primeiraFrase(p.membros[0].data.details)]
          .filter(Boolean)
          .join(" ");
  return {
    inicio: ini ? `${ini.label}${primeiraFrase(ini.membros[0].data.details) ? ". " + primeiraFrase(ini.membros[0].data.details) : ""}` : "—",
    fim: fins.length ? fins.map((f) => f.label).join(" ou ") : ordem.length ? ordem[ordem.length - 1].label : "—",
    passos: ordem.slice(0, max).map((p) => ({ id: p.id, t: p.label, d: textoPeca(p) })),
  };
}

// ── Glossário embutido ───────────────────────────────────────────────────
// Só aparecem os termos que de fato estão no texto da peça.
const GLOSSARIO: { re: RegExp; termo: string; definicao: string }[] = [
  { re: /\bcron(tab)?\b/i, termo: "cron / crontab", definicao: "O relógio do servidor: uma lista de tarefas com dia e hora marcados. Quando a hora chega, ele dispara o comando sozinho." },
  { re: /\bUTC\b/, termo: "UTC", definicao: "Horário padrão mundial. O Brasil (Brasília) fica 3 horas atrás: 9h UTC são 6h da manhã aqui." },
  { re: /\bBRT\b/, termo: "BRT", definicao: "Horário de Brasília." },
  { re: /\bVPS\b/, termo: "VPS", definicao: "O computador alugado, ligado o tempo todo, onde o Jarbas e as automações moram." },
  { re: /\bscripts?\b/i, termo: "script", definicao: "Um arquivo de código que faz uma tarefa do começo ao fim quando é chamado." },
  { re: /\blogs?\b/i, termo: "log", definicao: "O caderno de anotações do script: cada vez que roda, ele escreve ali o que fez. É por ele que o painel sabe se está vivo." },
  { re: /heartbeat/i, termo: "HEARTBEAT", definicao: "O batimento do OpenClaw: de tempos em tempos ele confere uma lista de tarefas e executa as que estão na hora." },
  { re: /openclaw/i, termo: "OpenClaw", definicao: "O sistema que hospeda a Donna e o Louis e os conecta ao WhatsApp e ao Telegram." },
  { re: /gemini/i, termo: "Gemini", definicao: "A IA do Google que a Donna e o Louis usam para ler e escrever texto." },
  { re: /haiku|claude/i, termo: "Claude / Haiku", definicao: "A IA da Anthropic usada pela assinatura. O Haiku é o modelo menor e mais barato." },
  { re: /notion/i, termo: "Notion", definicao: "Onde ficam suas tarefas, o Radar de conteúdo e o Segundo Cérebro. A automação lê e escreve lá por uma conexão (API)." },
  { re: /\bAPI\b/, termo: "API", definicao: "Uma porta de serviço: um programa pede algo a outro (ex.: ler o Notion) sem precisar abrir a tela." },
  { re: /webhook/i, termo: "webhook", definicao: "Um aviso automático: quando algo acontece num serviço, ele chama um endereço para contar." },
  { re: /supabase/i, termo: "Supabase", definicao: "O banco de dados online do painel (onde estão os fluxos, por exemplo)." },
  { re: /rclone/i, termo: "rclone", definicao: "Ferramenta que copia arquivos da VPS para o Google Drive." },
  { re: /watchdog/i, termo: "watchdog", definicao: "O cão de guarda: confere se um serviço está de pé e o reinicia se caiu." },
  { re: /\bfila\b/i, termo: "fila", definicao: "Lista de coisas esperando a vez de serem processadas, na ordem em que chegaram." },
  { re: /squad/i, termo: "squad", definicao: "Um time de agentes de IA que trabalha em sequência numa tarefa (ex.: carrossel de Instagram)." },
  { re: /\btrava\b/i, termo: "trava", definicao: "Uma marca que impede a mesma coisa de rodar duas vezes (ex.: o briefing duas vezes no mesmo dia)." },
  { re: /whisper|groq/i, termo: "Whisper / Groq", definicao: "Transforma áudio em texto. O Groq faz isso de graça na nuvem; o Whisper local é a reserva." },
  { re: /pm2/i, termo: "pm2", definicao: "O gerente de processos: mantém programas rodando e os religa se caírem." },
];

export function termosDoTexto(textos: (string | undefined)[], extras: { termo: string; definicao: string }[] = []) {
  const alvo = textos.filter(Boolean).join(" \n ");
  const achados = GLOSSARIO.filter((g) => g.re.test(alvo)).map(({ termo, definicao }) => ({ termo, definicao }));
  for (const e of extras) if (!achados.some((a) => a.termo === e.termo)) achados.push(e);
  return achados;
}

// ── Utilitários de apresentação ──────────────────────────────────────────
/** Se o executor parece um arquivo, devolve o caminho. */
export function caminhoDeArquivo(executor?: string): string | null {
  if (!executor) return null;
  const m = executor.match(/[\w\-./~]+\.(py|sh|js|mjs|ts|tsx|json|md|yaml|yml)\b/i);
  return m ? m[0] : null;
}

export function ehAposentada(f: Pick<FlowDoc, "description">): boolean {
  return /APOSENTAD/i.test(f.description || "");
}

export function descricaoLimpa(f: Pick<FlowDoc, "description">): string {
  return (f.description || "").replace(/^\[[^\]]+\]\s*/, "");
}

export function semAcento(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Saúde = último sinal de vida vs. a frequência esperada (mesma régua de Automações)
export type Saude = "ok" | "atrasada" | "muda" | "desconhecida";

export function avaliaSaude(ultima: string | null | undefined, frequenciaMin: number): Saude {
  if (!ultima) return "desconhecida";
  const idadeMin = (Date.now() - new Date(ultima).getTime()) / 60000;
  if (idadeMin <= frequenciaMin * 2.5) return "ok";
  if (idadeMin <= frequenciaMin * 10) return "atrasada";
  return "muda";
}

export const SELO_SAUDE: Record<Saude, { bolinha: string; texto: string; cor: string }> = {
  ok: { bolinha: "🟢", texto: "no ar", cor: "var(--success)" },
  atrasada: { bolinha: "🟡", texto: "atrasada", cor: "var(--warning)" },
  muda: { bolinha: "🔴", texto: "sem sinal há muito tempo", cor: "var(--danger)" },
  desconhecida: { bolinha: "⚪", texto: "não dá pra saber", cor: "var(--text-muted)" },
};

export function tempoDesde(iso: string | null | undefined): string {
  if (!iso) return "não sei dizer";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** Quebra o texto em linhas de até `max` caracteres (no máximo `linhas`). */
export function quebraTexto(t: string, max: number, linhas = 3): string[] {
  const palavras = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let atual = "";
  for (const p of palavras) {
    if ((atual + " " + p).trim().length > max && atual) {
      out.push(atual);
      atual = p;
    } else {
      atual = (atual + " " + p).trim();
    }
  }
  if (atual) out.push(atual);
  if (out.length > linhas) {
    const corte = out.slice(0, linhas);
    corte[linhas - 1] = corte[linhas - 1].replace(/.{0,2}$/, "") + "…";
    return corte;
  }
  return out;
}
