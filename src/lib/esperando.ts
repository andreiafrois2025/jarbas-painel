"use client";

// "Esperando você": tudo que pede uma decisão dela, numa lista só, já em ordem
// de prioridade (a squad-api monta e ordena em /api/esperando). Fontes: paradas
// de squad (licitação primeiro), finanças que vencem hoje/amanhã e os cards do
// Radar (dicas e notícias). O painel só mostra.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { SQUAD_API_BASE } from "./config";

export interface AcaoEsperando {
  tipo: "licitacao" | "aprovacao" | "financas" | "externo";
  rotulo: string;
  jobId?: string;
  squad?: string;
  url?: string;
}

export interface ItemEsperando {
  id: string;
  tipo: "checkpoint" | "financa" | "card";
  grupo: 1 | 2 | 3 | 4 | 5;
  prioridade: "alta" | "media" | "baixa";
  agente: string | null;
  origem: string;
  selo: string;
  titulo: string;
  detalhe: string;
  quando: string | null;
  acao: AcaoEsperando;
}

export interface DadosEsperando {
  gerado_em: string;
  total: number;
  altas: number;
  itens: ItemEsperando[];
}

async function buscar(servidora: boolean): Promise<DadosEsperando> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sem sessão");
  const r = await fetch(`${SQUAD_API_BASE}/api/esperando${servidora ? "?modo=servidora" : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/** Uma consulta só para o painel inteiro (o shell chama; as telas leem do contexto).
 *  `logado` falso = o login do painel ainda está chegando: espera, sem acusar erro. */
export function useEsperando(servidora: boolean, logado = true) {
  const [dados, setDados] = useState<DadosEsperando | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar(servidora));
      setErro(false);
    } catch {
      setErro(true);
    }
  }, [servidora]);

  useEffect(() => {
    setDados(null);
    if (!logado) return;
    carregar();
    // parada nova de squad aparece em até 30 s; ao voltar pra aba, na hora
    const id = setInterval(carregar, 30 * 1000);
    const visivel = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", visivel);
    window.addEventListener("focus", carregar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visivel);
      window.removeEventListener("focus", carregar);
    };
  }, [carregar, logado]);

  return { dados, erro, recarregar: carregar };
}
