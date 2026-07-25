"use client";

import { useEffect, useState } from "react";

// Estado de saúde do ecossistema — leitura ÚNICA e compartilhada.
//
// 25/07/2026 (F3.6): antes três componentes (semáforo, aba Saúde de Métricas e
// Config › Integrações) buscavam este mesmo arquivo por conta própria, cada um
// com seu relógio. Eram três downloads do mesmo JSON a cada minuto.
//
// Agora existe um só: quem chama useStatus() entra numa lista de interessados,
// e o resultado é entregue a todos. O relógio só existe enquanto houver alguém
// olhando — quando a última tela fecha, ele para.
//
// O arquivo é publicado a cada 5 min pela VPS (/root/status-saude.py) no bucket
// público do Supabase. É a MESMA fonte que alimenta os avisos de WhatsApp e
// Telegram, que continuam saindo de lá e não dependem de tela nenhuma.

const STATUS_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/status.json";

const INTERVALO_MS = 60_000;
/** Se a VPS parou de publicar há mais que isso, o próprio silêncio é o alerta. */
const LIMITE_SILENCIO_MIN = 20;

export interface SinaisVitais {
  container?: boolean;
  gateway?: boolean;
  telegram?: boolean;
  whatsapp?: boolean;
}

export interface CronSaude {
  ok: boolean;
  idade_min: number;
  limite_min: number;
}

export interface StatusSaude {
  gerado_em: string;
  nivel: "verde" | "amarelo" | "vermelho";
  problemas: string[];
  disco_pct?: number;
  sinais_vitais?: SinaisVitais;
  crons?: Record<string, CronSaude>;
  automacoes?: Record<string, string | null>;
  fila_kanban?: Record<string, number>;
  atividades?: { quando: string; quem: string; icone: string; texto: string }[];
  ronda_diaria?: unknown;
}

export interface EstadoStatus {
  status: StatusSaude | null;
  /** A VPS não publica há muito tempo (ou não deu pra buscar). */
  mudo: boolean;
  carregando: boolean;
}

let atual: EstadoStatus = { status: null, mudo: false, carregando: true };
let timer: ReturnType<typeof setInterval> | null = null;
const interessados = new Set<(e: EstadoStatus) => void>();

function avisa(novo: EstadoStatus) {
  atual = novo;
  for (const f of interessados) f(novo);
}

async function buscar() {
  try {
    const r = await fetch(`${STATUS_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const dados: StatusSaude = await r.json();
    const idadeMin = (Date.now() - new Date(dados.gerado_em).getTime()) / 60000;
    avisa({ status: dados, mudo: idadeMin > LIMITE_SILENCIO_MIN, carregando: false });
  } catch {
    // Mantém o último retrato conhecido, mas marca que está mudo.
    avisa({ ...atual, mudo: true, carregando: false });
  }
}

export function useStatus(): EstadoStatus {
  const [estado, setEstado] = useState<EstadoStatus>(atual);

  useEffect(() => {
    interessados.add(setEstado);
    setEstado(atual);
    if (!timer) {
      buscar();
      timer = setInterval(buscar, INTERVALO_MS);
    }
    return () => {
      interessados.delete(setEstado);
      if (interessados.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return estado;
}

/** Força uma releitura agora (botão "atualizar"). */
export function recarregarStatus() {
  return buscar();
}

export const NIVEL_UI = {
  verde: { dot: "🟢", label: "Tudo funcionando" },
  amarelo: { dot: "🟡", label: "Atenção" },
  vermelho: { dot: "🔴", label: "Algo caiu" },
} as const;
