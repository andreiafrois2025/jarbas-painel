"use client";

// Helper de fetch autenticado para a squad-api.
// Mesmo padrão do `comToken` em src/lib/hoje.ts: pega o access_token da sessão
// Supabase e manda no header Authorization. Use em qualquer chamada à
// SQUAD_API_BASE. Desde 25/07/2026 /api/snapshot e /office também exigem login
// (o iframe do escritório usa squadUrlComToken).

import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export async function squadFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sem sessão");
  return fetch(`${SQUAD_API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
  });
}

// Para casos onde o navegador precisa da URL direto (link/EventSource) e não
// dá pra mandar header — a squad-api aceita o token também via querystring
// ?token=. Só usar quando um fetch normal não servir.
export async function squadUrlComToken(path: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  const sep = path.includes("?") ? "&" : "?";
  return `${SQUAD_API_BASE}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
}

// Pede à squad-api um link assinado (curta duração) para abrir um arquivo de
// /outputs, /uploads-tmp ou /estudio-files, que não aceitam mais acesso sem login.
export async function linkArquivo(caminho: string, validadeS?: number): Promise<string> {
  const r = await squadFetch("/api/link-arquivo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caminho, validade_s: validadeS }),
  });
  if (!r.ok) throw new Error(`link-arquivo ${r.status}`);
  const { url } = await r.json();
  return url as string;
}
