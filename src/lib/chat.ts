"use client";

// Chat do painel (Fase 5-B): chamadas à squad-api (/api/chat/*) e o parser
// SEGURO dos blocos que o modelo devolve. Nada de HTML do modelo: tudo vira
// objetos validados aqui e é desenhado como texto pelo React.

import { squadFetch, squadUrlComToken } from "./squadFetch";

export interface Agente { id: string; nome: string; emoji: string; cargo: string; quando: string; modelo: string }
export interface Acao {
  acao: string; parametros: Record<string, unknown>; resumo: string;
  estado: "pendente" | "executando" | "feita" | "erro" | "cancelada";
  resultado?: { ok: boolean; texto: string; arquivos?: { nome: string; tipo: string; arquivo: string }[] };
}
export interface Mensagem {
  id: string; papel: "user" | "assistant" | "sistema"; texto: string; ts: string;
  anexos?: { id: string; nome: string }[]; acoes?: Acao[];
}
export interface ConversaResumo { id: string; agente: string; titulo: string; criada: string; atualizada: string; mensagens: number }
export interface Uso {
  hora: { usadas: number; limite: number }; dia: { usadas: number; limite: number };
  liberaEmMin: { hora: number; dia: number }; emUso: boolean; aviso?: string;
}

async function json<T>(r: Response): Promise<T> {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { erro?: string }).erro || `erro ${r.status}`);
  return j as T;
}

export const chatApi = {
  agentes: async () => (await json<{ agentes: Agente[] }>(await squadFetch("/api/chat/agentes"))).agentes,
  uso: async () => json<Uso>(await squadFetch("/api/chat/uso")),
  conversas: async (agente: string) =>
    (await json<{ conversas: ConversaResumo[] }>(await squadFetch(`/api/chat/conversas?agente=${encodeURIComponent(agente)}`))).conversas,
  conversa: async (id: string) => json<{ conversa: { id: string; agente: string; titulo: string }; mensagens: Mensagem[] }>(await squadFetch(`/api/chat/conversas/${id}`)),
  apagar: async (id: string) => json<{ ok: boolean }>(await squadFetch(`/api/chat/conversas/${id}`, { method: "DELETE" })),
  anexo: async (arq: File) => {
    const fd = new FormData(); fd.append("files", arq);
    return (await json<{ anexos: { id: string; nome: string; tamanho: number }[] }>(await squadFetch("/api/chat/anexo", { method: "POST", body: fd }))).anexos;
  },
  audio: async (blob: Blob) => {
    const fd = new FormData(); fd.append("audio", blob, "audio");
    return (await json<{ texto: string }>(await squadFetch("/api/chat/audio", { method: "POST", body: fd }))).texto;
  },
  acao: async (conversaId: string, mensagemId: string, indice: number, cancelar = false) =>
    json<{ ok: boolean; estado: Acao["estado"]; resultado?: Acao["resultado"] }>(await squadFetch("/api/chat/acao", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversaId, mensagemId, indice, cancelar }),
    })),
  urlArquivo: (nome: string) => squadUrlComToken(`/api/chat/arquivo/${encodeURIComponent(nome)}`),
};

// ── Envio com resposta aparecendo aos poucos (SSE lido do corpo do fetch) ──
export interface EventosEnvio {
  onMeta: (m: { conversaId: string; mensagemId: string }) => void;
  onDelta: (t: string) => void;
  onStatus: (t: string) => void;
  onDone: (d: { mensagem: Mensagem; uso: Uso; aviso: string | null }) => void;
  onErro: (e: string) => void;
}

export async function enviarMensagem(
  corpo: { agente: string; conversaId?: string; mensagem: string; anexos?: string[] },
  ev: EventosEnvio, sinal: AbortSignal,
) {
  let r: Response;
  try {
    r = await squadFetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), signal: sinal });
  } catch (e) {
    if ((e as Error).name !== "AbortError") ev.onErro("Não consegui falar com o servidor.");
    return;
  }
  if (!r.ok || !r.body) {
    const j = await r.json().catch(() => ({}));
    ev.onErro((j as { erro?: string }).erro || `Erro ${r.status}`);
    return;
  }
  const leitor = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const bloco = buf.slice(0, i); buf = buf.slice(i + 2);
        const nome = /^event: (\w+)/m.exec(bloco)?.[1]; const dados = /^data: (.*)$/m.exec(bloco)?.[1];
        if (!nome || !dados) continue;
        let d: any; try { d = JSON.parse(dados); } catch { continue; }
        if (nome === "meta") ev.onMeta(d); else if (nome === "delta") ev.onDelta(d.texto);
        else if (nome === "status") ev.onStatus(d.texto); else if (nome === "done") ev.onDone(d);
        else if (nome === "erro") ev.onErro(d.erro);
      }
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") ev.onErro("A conexão caiu no meio da resposta.");
  }
}

// ── Visuais: formato JSON simples, validado campo a campo ───────────────────
export type Visual =
  | { tipo: "cartoes"; titulo?: string; itens: { titulo: string; texto: string; rotulo?: string }[] }
  | { tipo: "comparacao"; titulo?: string; colunas: { titulo: string; itens: string[] }[] }
  | { tipo: "linha_tempo"; titulo?: string; itens: { quando: string; titulo: string; texto?: string }[] }
  | { tipo: "checklist"; titulo?: string; itens: { texto: string; feito: boolean }[] }
  | { tipo: "botoes"; pergunta?: string; opcoes: { rotulo: string; mensagem: string }[] };

const txt = (v: unknown, max = 400): string | null => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
const txtOpc = (v: unknown, max = 400): string | undefined => (v == null ? undefined : txt(v, max) ?? undefined);
const lista = (v: unknown, max: number): unknown[] | null => (Array.isArray(v) && v.length > 0 && v.length <= max ? v : null);

export function validarVisual(raw: unknown): Visual | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>; const titulo = txtOpc(o.titulo, 120);
  if (o.tipo === "cartoes") {
    const l = lista(o.itens, 12); if (!l) return null;
    const itens: { titulo: string; texto: string; rotulo?: string }[] = [];
    for (const it of l as Record<string, unknown>[]) {
      const t = txt(it?.titulo, 120); const x = txt(it?.texto, 600); if (!t || !x) return null;
      itens.push({ titulo: t, texto: x, rotulo: txtOpc(it.rotulo, 40) });
    }
    return { tipo: "cartoes", titulo, itens };
  }
  if (o.tipo === "comparacao") {
    const l = lista(o.colunas, 4); if (!l || l.length < 2) return null;
    const colunas: { titulo: string; itens: string[] }[] = [];
    for (const c of l as Record<string, unknown>[]) {
      const t = txt(c?.titulo, 80); const its = lista(c?.itens, 12); if (!t || !its) return null;
      const s = its.map((x) => txt(x, 300)); if (s.some((x) => x === null)) return null;
      colunas.push({ titulo: t, itens: s as string[] });
    }
    return { tipo: "comparacao", titulo, colunas };
  }
  if (o.tipo === "linha_tempo") {
    const l = lista(o.itens, 20); if (!l) return null;
    const itens: { quando: string; titulo: string; texto?: string }[] = [];
    for (const it of l as Record<string, unknown>[]) {
      const q = txt(it?.quando, 60); const t = txt(it?.titulo, 160); if (!q || !t) return null;
      itens.push({ quando: q, titulo: t, texto: txtOpc(it.texto, 400) });
    }
    return { tipo: "linha_tempo", titulo, itens };
  }
  if (o.tipo === "checklist") {
    const l = lista(o.itens, 30); if (!l) return null;
    const itens: { texto: string; feito: boolean }[] = [];
    for (const it of l as Record<string, unknown>[]) {
      const t = txt(it?.texto, 300); if (!t) return null;
      itens.push({ texto: t, feito: it.feito === true });
    }
    return { tipo: "checklist", titulo, itens };
  }
  if (o.tipo === "botoes") {
    const l = lista(o.opcoes, 5); if (!l) return null;
    const opcoes: { rotulo: string; mensagem: string }[] = [];
    for (const it of l as Record<string, unknown>[]) {
      const r = txt(it?.rotulo, 60); if (!r) return null;
      opcoes.push({ rotulo: r, mensagem: txt(it.mensagem, 500) ?? r });
    }
    return { tipo: "botoes", pergunta: txtOpc(o.pergunta, 200), opcoes };
  }
  return null;
}

// Pedaços de uma resposta: texto, visual válido ou "montando" (bloco ainda aberto no streaming).
export type Pedaco = { k: "texto"; v: string } | { k: "visual"; v: Visual } | { k: "montando" };

export function dividirResposta(texto: string, emAndamento = false): Pedaco[] {
  const out: Pedaco[] = []; let resto = texto;
  const re = /```(visual|acao)[ \t]*\r?\n/;
  for (;;) {
    const m = re.exec(resto);
    if (!m) { if (resto.trim()) out.push({ k: "texto", v: resto }); break; }
    const antes = resto.slice(0, m.index); if (antes.trim()) out.push({ k: "texto", v: antes });
    const apos = resto.slice(m.index + m[0].length); const fim = apos.indexOf("```");
    if (fim < 0) { if (emAndamento) out.push({ k: "montando" }); else out.push({ k: "texto", v: "```\n" + apos }); break; }
    const corpo = apos.slice(0, fim); resto = apos.slice(fim + 3);
    if (m[1] === "acao") continue; // vira botão Confirmar (vem validado do servidor), nunca texto
    let v: Visual | null = null; try { v = validarVisual(JSON.parse(corpo)); } catch { v = null; }
    if (v) out.push({ k: "visual", v }); else out.push({ k: "texto", v: "```\n" + corpo.trim() + "\n```" });
  }
  return out;
}
