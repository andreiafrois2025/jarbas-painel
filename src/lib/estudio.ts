"use client";

// 🎬 Estúdio — revisão da edição automática de reels.
// Segue o mesmo padrão de fetch autenticado de hoje.ts: token do supabase
// via SQUAD_API_BASE, chamadas para a squad-api.

import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export interface ProjetoResumo {
  name: string;
  criado_em: string;
  reelUrl: string;
  reelMtime: number;
  renderizando: boolean;
}

export interface Bloco {
  i: number;
  ini: number;
  fim: number;
  texto: string;
  mantido: boolean;
  motivo?: string;
}

export interface Punch {
  t: number;
  motivo?: string;
}

export interface ProjetoDetalhe {
  name: string;
  video: string;
  criado_em: string;
  duracao_bruta: number;
  words: unknown;
  blocks: Bloco[];
  punches: Punch[];
  args: unknown;
  reel: string;
  reelUrl: string;
  reelMtime: number;
  renderizando: boolean;
}

export interface Correcao {
  de: string;
  para: string;
}

export interface StatusRerender {
  renderizando: boolean;
  lastExit: number | null;
  erro?: string;
}

async function comToken(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sem sessão");
  return fetch(`${SQUAD_API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
  });
}

export async function listarProjetos(): Promise<ProjetoResumo[]> {
  const r = await comToken("/api/estudio");
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function buscarProjeto(name: string): Promise<ProjetoDetalhe> {
  const r = await comToken(`/api/estudio/${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function rerenderizar(
  name: string,
  blocosMantidos: number[],
  punches: { t: number }[],
  correcoes: Correcao[]
): Promise<{ ok: boolean; status: number; erro?: string }> {
  const r = await comToken(`/api/estudio/${encodeURIComponent(name)}/rerender`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks_mantidos: blocosMantidos,
      punches,
      correcoes,
    }),
  });
  if (r.ok) return { ok: true, status: r.status };
  let erro: string | undefined;
  try {
    const data = await r.json();
    erro = data?.erro;
  } catch {
    // corpo não é JSON, ignora
  }
  return { ok: false, status: r.status, erro };
}

export async function statusRerender(name: string): Promise<StatusRerender> {
  const r = await comToken(`/api/estudio/${encodeURIComponent(name)}/status`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export function urlVideo(reelUrl: string, reelMtime: number): string {
  return `${SQUAD_API_BASE}${reelUrl}?v=${reelMtime}`;
}

export function formatarMMSS(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
