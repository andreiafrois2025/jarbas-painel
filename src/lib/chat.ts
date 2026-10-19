"use client";

// Chat do painel (Fase 5-B): chamadas à squad-api (/api/chat/*) e o parser
// SEGURO dos blocos que o modelo devolve. Nada de HTML do modelo: tudo vira
// objetos validados aqui e é desenhado como texto pelo React.

import { squadFetch, squadUrlComToken } from "./squadFetch";

export interface Agente { id: string; nome: string; emoji: string; cargo: string; quando: string; modelo: string; assuntosAuto?: boolean }
export interface Assunto { id: string; titulo: string; arquivado: boolean; criada: string }
export interface ModeloOpcao { chave: string; rotulo: string; motor: "claude" | "codex"; aviso?: string | null; indisponivel?: string | null }
export interface Acao {
  acao: string; parametros: Record<string, unknown>; resumo: string;
  estado: "pendente" | "executando" | "feita" | "erro" | "cancelada";
  resultado?: { ok: boolean; texto: string; arquivos?: { nome: string; tipo: string; arquivo: string }[] };
}
export interface Mensagem {
  id: string; papel: "user" | "assistant" | "sistema"; texto: string; ts: string;
  anexos?: { id: string; nome: string }[]; acoes?: Acao[]; habilidade?: string;
  assuntoId?: string; modeloRotulo?: string; respostaDe?: string;
  obra?: boolean; arquivos?: ArquivoObra[];
  /** Modo obra O2/O3: id da tarefa (AAAA-MM-DD/id) para os bastidores e o botão de desfazer. */
  tarefaId?: string; mudancas?: boolean;
}
/** Arquivo que uma tarefa do modo obra deixou na pasta de trabalho (aparece como cartão no chat). */
export interface ArquivoObra { nome: string; rel: string; tamanho: number; tipo: "imagem" | "pdf" | "arquivo"; url: string }
export interface EstadoObra { ligado: boolean; expira_em: string | null; tarefas_hoje: number; limite: number; ocupada: boolean; permitido: boolean; o2?: boolean }
/** Cartão "posso fazer?" (O2): o servidor descreve em linguagem simples; o painel só mostra e devolve a resposta dela. */
export interface PedidoObra { id: string; titulo: string; descricao: string; detalhe: string; volta: boolean; reinicia: boolean; expira_em: string }
export type DecisaoPasso = "permitido" | "pediu_aprovado" | "pediu_negado" | "pediu_expirou" | "pediu_aguardando" | "bloqueado";
export interface PassoObra { hora: string; ferramenta: string; resumo: string; decisao: DecisaoPasso; motivo: string }
export interface ResultadoDesfazer { ok: boolean; restaurados: number; removidos: number; erros: string[]; aviso: string }
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
  conversa: async (id: string) => json<{ conversa: { id: string; agente: string; titulo: string }; mensagens: Mensagem[]; assuntos: Assunto[]; modelo: string; assuntosAuto: boolean }>(await squadFetch(`/api/chat/conversas/${id}`)),
  habilidades: async () => (await json<{ habilidades: Record<string, { obra: boolean; dono: string | null }> }>(await squadFetch("/api/chat/habilidades"))).habilidades,
  modelos: async () => (await json<{ modelos: ModeloOpcao[] }>(await squadFetch("/api/chat/modelos"))).modelos,
  trocarModelo: async (conversaId: string, modelo: string) =>
    json<{ ok: boolean; modelo: string; texto: string }>(await squadFetch("/api/chat/modelo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversaId, modelo }) })),
  mover: async (conversaId: string, mensagemId: string, assuntoId: string, titulo?: string) =>
    json<{ ok: boolean; assuntos: Assunto[]; mensagens: Mensagem[] }>(await squadFetch("/api/chat/mover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversaId, mensagemId, assuntoId, titulo }) })),
  assunto: async (conversaId: string, assuntoId: string, p: { arquivado?: boolean; titulo?: string }) =>
    (await json<{ ok: boolean; assuntos: Assunto[] }>(await squadFetch("/api/chat/assunto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversaId, assuntoId, ...p }) }))).assuntos,
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

// ── Modo obra (O1): código no Telegram, estado no servidor ──
const post = (path: string, corpo?: unknown) =>
  squadFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo ?? {}) });
export const obraApi = {
  estado: async () => json<EstadoObra>(await squadFetch("/api/obra/estado")),
  pedirCodigo: async () => json<{ ok: boolean; vale_min: number }>(await post("/api/obra/pedir-codigo")),
  ativar: async (codigo: string) => json<EstadoObra>(await post("/api/obra/ativar", { codigo })),
  desligar: async () => json<EstadoObra>(await post("/api/obra/desligar")),
  // O2/O3
  pedidos: async () => json<{ ativo: boolean; pedidos: PedidoObra[] }>(await squadFetch("/api/obra/pedidos")),
  responder: async (id: string, decisao: "permitir" | "negar") => json<{ ok: boolean }>(await post(`/api/obra/pedidos/${encodeURIComponent(id)}`, { decisao })),
  desfazer: async (tarefa: string) => json<ResultadoDesfazer>(await post("/api/obra/desfazer", { tarefa })),
  bastidores: async (tarefa: string) => json<{ passos: PassoObra[]; rodando: boolean; mudancas: boolean }>(await squadFetch(`/api/obra/bastidores/${tarefa.split("/").map(encodeURIComponent).join("/")}`)),
  urlArquivo: (url: string, baixar = false) => squadUrlComToken(url + (baixar ? "?baixar=1" : "")),
};

// ── Envio com resposta aparecendo aos poucos (SSE lido do corpo do fetch) ──
export interface EventosEnvio {
  onMeta: (m: { conversaId: string; mensagemId: string | null; assuntoId?: string | null }) => void;
  onAssunto?: (a: { id: string; titulo: string; novo: boolean }) => void;
  onModelo?: (m: { chave: string; mensagem: Mensagem }) => void;
  onDelta: (t: string) => void;
  onStatus: (t: string) => void;
  onObra?: (o: { tarefa: string; o2: boolean }) => void;
  onDone: (d: { mensagem: Mensagem | null; uso: Uso; aviso: string | null }) => void;
  onErro: (e: string) => void;
}

export async function enviarMensagem(
  corpo: { agente: string; conversaId?: string; mensagem: string; anexos?: string[]; modelo?: string; assuntoId?: string; habilidade?: string },
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
        else if (nome === "assunto") ev.onAssunto?.(d); else if (nome === "modelo") ev.onModelo?.(d);
        else if (nome === "status") ev.onStatus(d.texto); else if (nome === "obra") ev.onObra?.(d); else if (nome === "done") ev.onDone(d);
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
  | { tipo: "botoes"; pergunta?: string; opcoes: { rotulo: string; mensagem: string }[] }
  | { tipo: "agenda"; titulo?: string; dias: { dia: string; itens: { hora: string; titulo: string }[] }[] };

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
  if (o.tipo === "agenda") {
    const l = lista(o.dias, 14); if (!l) return null;
    const dias: { dia: string; itens: { hora: string; titulo: string }[] }[] = [];
    for (const d of l as Record<string, unknown>[]) {
      const dia = txt(d?.dia, 60); if (!dia || !Array.isArray(d.itens) || d.itens.length > 30) return null;
      const itens: { hora: string; titulo: string }[] = [];
      for (const it of d.itens as Record<string, unknown>[]) {
        const h = txt(it?.hora, 30); const t = txt(it?.titulo, 200); if (!h || !t) return null;
        itens.push({ hora: h, titulo: t });
      }
      dias.push({ dia, itens });
    }
    return { tipo: "agenda", titulo, dias };
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
