"use client";

// Cliente dos rascunhos de fluxo por voz (squad-api, rotas /api/fluxos/rascunho*).
// A transcrição reaproveita a rota do chat (/api/chat/audio: Groq com Whisper local de reserva).
// NADA aqui constrói ou liga automação: rascunho é só desenho.

import { squadFetch } from "../squadFetch";
import type { FlowDocEdge, FlowDocNode } from "../types";

export interface Rascunho {
  id: string;
  titulo: string;
  description?: string;
  texto_falado?: string;
  nodes: FlowDocNode[];
  edges: FlowDocEdge[];
  estado: "rascunho" | "aprovado";
  estado_texto: string;
  criado_em?: string;
  atualizado_em?: string;
  aprovado_em?: string;
}
export interface RascunhoResumo {
  id: string;
  titulo: string;
  description?: string;
  estado: "rascunho" | "aprovado";
  estado_texto: string;
  etapas: number;
  atualizado_em?: string;
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `erro ${r.status}`;
    try { msg = (await r.json()).erro || msg; } catch { /* corpo vazio */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}
const JSON_H = { "Content-Type": "application/json" };

export const rascunhosApi = {
  audio: async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("audio", blob, "audio");
    return (await json<{ texto: string }>(await squadFetch("/api/chat/audio", { method: "POST", body: fd }))).texto;
  },
  gerar: async (texto: string, id?: string) =>
    (await json<{ rascunho: Rascunho }>(await squadFetch("/api/fluxos/rascunho/gerar", { method: "POST", headers: JSON_H, body: JSON.stringify({ texto, id }) }))).rascunho,
  listar: async () => (await json<{ rascunhos: RascunhoResumo[] }>(await squadFetch("/api/fluxos/rascunhos"))).rascunhos,
  obter: async (id: string) => (await json<{ rascunho: Rascunho }>(await squadFetch(`/api/fluxos/rascunho/${id}`))).rascunho,
  salvar: async (id: string, d: { titulo: string; description?: string; nodes: FlowDocNode[]; edges: FlowDocEdge[] }) =>
    (await json<{ rascunho: Rascunho }>(await squadFetch(`/api/fluxos/rascunho/${id}`, { method: "PUT", headers: JSON_H, body: JSON.stringify(d) }))).rascunho,
  aprovar: async (id: string) =>
    (await json<{ rascunho: Rascunho }>(await squadFetch(`/api/fluxos/rascunho/${id}/aprovar`, { method: "POST" }))).rascunho,
  descartar: async (id: string) => { await json(await squadFetch(`/api/fluxos/rascunho/${id}`, { method: "DELETE" })); },
};
