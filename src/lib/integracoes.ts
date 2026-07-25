"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "./squadFetch";

// Catálogo de integrações servido pela VPS (F2, 25/07/2026).
//
// Antes essa lista era digitada à mão dentro do painel, e três itens diziam
// "sem medição direta" — inclusive o Gemini, que é onde o dinheiro é gasto.
// Agora cada item declara COMO é medido, e a tela mostra isso.
export type Medicao = "ping" | "sinal" | "cron" | "nenhum";

export interface Integracao {
  nome: string;
  icone: string;
  detalhe: string;
  onde: string;
  medicao: Medicao;
  /** só para medicao "ping": resultado da chamada de verificação */
  ok?: boolean | null;
  nota?: string;
  /** só para "sinal": qual sinal vital do status.json responde por ele */
  sinal?: string;
  /** só para "cron": qual rotina agendada prova que ele funciona */
  cron?: string;
  links?: { rotulo: string; url: string }[];
}

export const COMO_MEDIMOS: Record<Medicao, string> = {
  ping: "perguntamos ao serviço agora e ele respondeu",
  sinal: "medido pelo semáforo da VPS, a cada 5 min",
  cron: "provado pela rotina que depende dele",
  nenhum: "não temos como medir isso daqui",
};

export function useIntegracoes() {
  const [integracoes, setIntegracoes] = useState<Integracao[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    squadFetch("/api/integracoes")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (vivo) setIntegracoes(d.integracoes || []); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  return { integracoes, erro };
}
