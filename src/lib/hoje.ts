"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export interface CardCaixa {
  id: string;
  titulo: string;
  coluna: string;
  url: string;
  /** id do agente que pediu (mike, izzy, louis...); ausente = não sei */
  agente?: string | null;
  /** de onde veio, em palavras (ex.: Radar de notícias) */
  origem?: string;
  tipo?: string;
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

export interface ItemParaMim {
  url: string;
  titulo: string;
  fonte: string;
  preview?: string;
  tema?: string;
  quando?: string;
  lido?: boolean;
}

export interface TarefaNotion {
  id: string;
  nome: string;
  status: string;
  prazo: string | null;
}

/** Tarefas com id, pra poder marcar como feita direto no Notion (F6.3). */
export function useTarefas(ativo = true) {
  const [tarefas, setTarefas] = useState<TarefaNotion[] | null>(null);
  // atrasadas ficam à parte: o servidor só manda hoje + 2 dias em "tarefas"
  const [atrasadas, setAtrasadas] = useState<TarefaNotion[]>([]);
  const [atrasadasTotal, setAtrasadasTotal] = useState(0);

  const carregar = useCallback(async () => {
    // Modo Servidora: nem pergunta ao servidor (Fase 5-A)
    if (!ativo) return;
    try {
      const r = await comToken("/api/hoje/tarefas");
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const lista: TarefaNotion[] = d.atrasadas || [];
      setTarefas(d.tarefas || []);
      setAtrasadas(lista);
      setAtrasadasTotal(typeof d.atrasadas_total === "number" ? d.atrasadas_total : lista.length);
    } catch {
      setTarefas(null); // deixa a tela cair no texto de sempre
    }
  }, [ativo]);

  useEffect(() => { carregar(); }, [carregar]);

  /** Só confirma na tela DEPOIS que o Notion aceitou — a condição dela. */
  const marcarFeita = useCallback(async (id: string): Promise<boolean> => {
    try {
      const r = await comToken(`/api/hoje/tarefas/${id}/feita`, { method: "POST" });
      if (!r.ok) return false;
      setTarefas((t) => (t || []).filter((x) => x.id !== id));
      // se era atrasada, tira da lista e baixa o contador
      setAtrasadas((a) => {
        if (a.some((x) => x.id === id)) setAtrasadasTotal((n) => Math.max(0, n - 1));
        return a.filter((x) => x.id !== id);
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return { tarefas, atrasadas, atrasadasTotal, marcarFeita, recarregar: carregar };
}

export interface DadosHoje {
  gerado_em: string;
  agenda: string;
  tarefas: string;
  agenda_semana?: string;
  tarefas_semana?: string;
  tarefas_atrasadas?: TarefaNotion[];
  tarefas_atrasadas_total?: number;
  tarefas_janela_dias?: number;
  caixa: CardCaixa[];
  escola: ItemEscola[];
  atividades: Atividade[];
  para_mim?: ItemParaMim[];
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

// `ativo=false` (modo Servidora): o hook não faz NENHUMA chamada, nem liga o
// relógio. /api/hoje devolve agenda, tarefas e escola numa resposta só, então a
// única forma de o dado pessoal não chegar ao navegador é não pedir.
// `modo="servidora"` pede à squad-api só o que é do trabalho (agenda do Igam e
// tarefas com Área da vida = Trabalho); sem ele, a resposta é a de sempre.
export function useHoje(ativo = true, modo?: "servidora") {
  const [dados, setDados] = useState<DadosHoje | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) return;
    try {
      const r = await comToken(modo === "servidora" ? "/api/hoje?modo=servidora" : "/api/hoje");
      if (!r.ok) throw new Error(String(r.status));
      setDados(await r.json());
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    if (!ativo) { setDados(null); setErro(false); return; }
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
  }, [carregar, ativo]);
  return { dados, erro, recarregar: carregar };
}

export interface ResumoFin { receitas: number; despesas: number; saldo: number; n: number }
export interface ResumoFinancas { mes: string; pessoal: ResumoFin; empresa: ResumoFin }

export function useFinancas(ativo = true) {
  const [financas, setFinancas] = useState<ResumoFinancas | null>(null);
  const [erroFin, setErroFin] = useState(false);
  useEffect(() => {
    if (!ativo) return; // modo Servidora: não pede finanças
    (async () => {
      try {
        const r = await comToken("/api/financas");
        if (!r.ok) throw new Error(String(r.status));
        setFinancas(await r.json());
      } catch { setErroFin(true); }
    })();
  }, [ativo]);
  return { financas, erroFin };
}

export async function marcarLido(url: string, lido: boolean) {
  const r = await comToken(`/api/para-mim/lido`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, lido }),
  });
  return r.ok;
}

// promove uma notícia do feed pessoal pra caixa de aprovação do grupo
export async function promoverProGrupo(url: string) {
  const r = await comToken(`/api/para-mim/pro-grupo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return r.ok;
}

// manda a notícia do feed pessoal pro banco Conteúdos como ideia (Status IDEIAS)
export async function promoverProConteudo(url: string) {
  const r = await comToken(`/api/para-mim/conteudo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return r.ok;
}

export async function decidirCard(pageId: string, acao: "aprovar" | "prioridade" | "descartar") {
  const r = await comToken(`/api/radar/${pageId}/decidir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao }),
  });
  return r.ok;
}
