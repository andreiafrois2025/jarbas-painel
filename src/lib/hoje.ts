"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export interface CardCaixa {
  id: string;
  titulo: string;
  coluna: string;
  url: string;
}

export interface ItemEscola {
  data: string;
  tipo: string;
  disciplina?: string;
  nome?: string;
  pontos?: string | null;
}

export interface Atividade {
  quando: string;
  quem: string;
  icone: string;
  texto: string;
}

export interface DadosHoje {
  gerado_em: string;
  agenda: string;
  tarefas: string;
  caixa: CardCaixa[];
  escola: ItemEscola[];
  atividades: Atividade[];
  nivel?: string;
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

export function useHoje() {
  const [dados, setDados] = useState<DadosHoje | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await comToken("/api/hoje");
      if (!r.ok) throw new Error(String(r.status));
      setDados(await r.json());
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    carregar();
    // recarrega sozinho a cada 5 min — o "atualizado às HH:MM" fica honesto
    const id = setInterval(carregar, 5 * 60 * 1000);
    // recarrega também quando a aba volta a ficar visível ou ganha foco
    const aoFicarVisivel = () => {
      if (document.visibilityState === "visible") carregar();
    };
    const aoFocar = () => carregar();
    document.addEventListener("visibilitychange", aoFicarVisivel);
    window.addEventListener("focus", aoFocar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoFicarVisivel);
      window.removeEventListener("focus", aoFocar);
    };
  }, [carregar]);
  return { dados, erro, recarregar: carregar };
}

export interface ResumoFin { receitas: number; despesas: number; saldo: number; n: number }
export interface ResumoFinancas { mes: string; pessoal: ResumoFin; empresa: ResumoFin }

export function useFinancas() {
  const [financas, setFinancas] = useState<ResumoFinancas | null>(null);
  const [erroFin, setErroFin] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await comToken("/api/financas");
        if (!r.ok) throw new Error(String(r.status));
        setFinancas(await r.json());
      } catch { setErroFin(true); }
    })();
  }, []);
  return { financas, erroFin };
}

export async function decidirCard(pageId: string, acao: "aprovar" | "prioridade" | "descartar") {
  const r = await comToken(`/api/radar/${pageId}/decidir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao }),
  });
  return r.ok;
}
