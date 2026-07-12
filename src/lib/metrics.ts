"use client";

import { useState, useEffect } from "react";

// Histórico de métricas publicado diariamente pelo metrics-snapshot.py da VPS
// no mesmo bucket público do status.json.
const METRICS_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/metrics-history.json";

export interface SnapshotDia {
  date: string;
  ts: string;
  saude: {
    nivel: string;
    problemas: string[];
    sinais: Record<string, boolean>;
    crons_ok: number;
    crons_total: number;
    disco_pct: number | null;
  };
  fila: {
    pendentes: number;
    aprovados: number;
    enviados_7d: number;
    enviados_registrados: number;
    cards_gerados_total: number;
    pausado: boolean;
  };
  dicas: { total: number; usadas: number };
  style: { approval_rate_news?: number; total_cards?: number };
  jobs: { total: number; concluidos: number; ultimos_30d: number };
  automacoes: Record<string, string | null>;
  radar_por_status: Record<string, number>;
  enviados_total: number;
  horas_economizadas: number;
}

export interface MetricsHistory {
  updated_at: string;
  days: SnapshotDia[];
  radar_semanas: Record<string, { aprovados: number; descartados: number; taxa: number | null }>;
  envios_semanas: Record<string, number>;
  formula_horas: Record<string, number>;
}

export function useMetricsHistory(refreshMs = 0) {
  const [data, setData] = useState<MetricsHistory | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    const carrega = () =>
      fetch(`${METRICS_URL}?t=${Date.now()}`)
        .then((r) => r.json())
        .then((d) => vivo && setData(d))
        .catch(() => vivo && setErro(true));
    carrega();
    if (refreshMs > 0) {
      const id = setInterval(carrega, refreshMs);
      return () => { vivo = false; clearInterval(id); };
    }
    return () => { vivo = false; };
  }, [refreshMs]);

  return { data, erro, hoje: data?.days?.[data.days.length - 1] ?? null };
}

// Ordena chaves "2026-W27" cronologicamente e devolve rótulo curto "S27".
// Tolera mapa ausente: o JSON publicado pode ser de uma versão mais antiga
// do coletor (foi exatamente isso que derrubou a página em 12/07).
export function semanasOrdenadas<T>(mapa: Record<string, T> | undefined | null): { key: string; label: string; valor: T }[] {
  return Object.keys(mapa ?? {})
    .sort()
    .map((k) => ({ key: k, label: `S${k.split("-W")[1]}`, valor: (mapa as Record<string, T>)[k] }));
}

export function tempoRelativo(iso: string | null): string {
  if (!iso) return "nunca rodou";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h}h`;
  return `há ${Math.round(h / 24)} dias`;
}
