"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "./squadFetch";

// Dados extras da página Máquina › Saúde (19/10/2026): o que o status.json não
// traz. Vêm de /api/saude/resumo (squad-api, só leitura, sem segredo).
// Campo null = "sem dado": a tela escreve isso em vez de inventar.

export interface SaudeResumo {
  gerado_em: string;
  servicos: { claude_remoto: boolean | null };
  conexoes: {
    outlook: { ultima_atividade_em: string | null; prazos_abertos: number | null };
    pluggy: { ultima_leitura_em: string | null };
    codex: { ultimo_uso_em: string | null; ultimo_ok: boolean | null; imagens_mes: number | null; falhas_mes: number | null };
  };
  custos: {
    claude: { mensagens_semana: number; dias: number; medido_em: string | null } | null;
    gemini: { chamadas_mes: number; tokens_entrada_mes: number; valor_brl: number | null; tem_preco: boolean; medido_ate: string | null };
  };
  avisos: { quando: string; quando_texto: string; texto: string; resolvido: boolean; duracao_min: number | null }[];
}

export interface AutomacaoCron {
  nome: string;
  agenda: string;
  ultima_execucao: string | null;
  log_compartilhado?: boolean;
}

/** Lê uma rota da squad-api agora e de tempos em tempos (só enquanto a tela está aberta). */
export function useSquadJson<T>(caminho: string, cadaMs = 120_000) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    const ler = () =>
      squadFetch(caminho)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => { if (vivo) { setDados(d); setErro(false); } })
        .catch(() => { if (vivo) setErro(true); });
    ler();
    const t = cadaMs > 0 ? setInterval(ler, cadaMs) : null;
    return () => { vivo = false; if (t) clearInterval(t); };
  }, [caminho, cadaMs]);
  return { dados, erro };
}

export const useSaudeResumo = () => useSquadJson<SaudeResumo>("/api/saude/resumo");
export const useAutomacoesCron = () => {
  const { dados, erro } = useSquadJson<{ automacoes: AutomacaoCron[] }>("/api/catalogo", 300_000);
  return { automacoes: dados?.automacoes ?? null, erro };
};

// Horas economizadas (/api/numeros/resumo): livro-caixa de entregas.
export interface NumerosResumo {
  hoje: string;
  mes_inicio: string;
  desde: string | null;
  horas: { semana: number; mes: number; total: number };
  entregas: number;
  dias_de_trabalho: number;
  semanas: { inicio: string; horas: number; entregas: number }[];
  por_agente_mes: Record<string, number>;
  por_tipo_total: Record<string, number>;
}
export const useNumerosResumo = () => useSquadJson<NumerosResumo>("/api/numeros/resumo", 300_000);
