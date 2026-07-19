"use client";

// Helper de fetch autenticado para a squad-api.
// Mesmo padrão do `comToken` em src/lib/hoje.ts: pega o access_token da sessão
// Supabase e manda no header Authorization. Use em qualquer chamada à
// SQUAD_API_BASE que não seja /api/snapshot ou /office (essas continuam públicas).

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
