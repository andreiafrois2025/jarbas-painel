"use client";

// Dados da porta Áreas que vêm das rotas novas da squad-api (/api/areas/*).
// Todas são só leitura. Cada hook devolve { dados, erro, carregando }.

import { useCallback, useEffect, useState } from "react";
import { squadFetch } from "./squadFetch";

export interface CartaoEsteira {
  id: string;
  titulo: string;
  url: string;
  agente: string;
  espera: boolean;
  info?: string;
  etapa?: string;
  data?: string;
  quando?: string;
  origem: "conteudos" | "radar";
}
export type ColunaEsteira = "ideias" | "produzindo" | "aprovar" | "agendado" | "publicado";
export interface Esteira {
  gerado_em: string;
  colunas: Record<ColunaEsteira, { total: number; itens: CartaoEsteira[] }>;
}

export interface PrazoOutlook { prazo: string; assunto: string; fazer: string; url: string }
export interface PrazosOutlook { itens: PrazoOutlook[]; atualizado_em: string | null; erro?: string }

export interface Casa {
  gerado_em: string;
  financas: null | {
    mes: string;
    gasto_mes: number;
    categorias: { nome: string; valor: number }[];
    vencem_semana: { nome: string; data: string; valor: number | null }[];
  };
  erro_financas: string | null;
  lembretes: null | { id: string; texto: string; quando: string; repetir: string | null }[];
}

export function useRotaAreas<T>(caminho: string, ativo = true) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(ativo);

  const carregar = useCallback(async () => {
    if (!ativo) return;
    try {
      const r = await squadFetch(caminho);
      if (!r.ok) throw new Error(String(r.status));
      setDados(await r.json());
      setErro(false);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [caminho, ativo]);

  useEffect(() => {
    carregar();
    if (!ativo) return;
    const id = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [carregar, ativo]);

  return { dados, erro, carregando, recarregar: carregar };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brlCent = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "2026-10-21" -> "21/10" */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
/** "2026-10-21" -> "ter 21" */
export function diaSemanaNum(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${SEMANA[d.getDay()]} ${Number(iso.slice(8, 10))}`;
}

/** Hoje (Brasília) no formato AAAA-MM-DD. */
export const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export function somaDiasISO(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
