"use client";

import { useEffect, useState } from "react";
import type { FlowDoc } from "../types";
import type { MacroMontado } from "./macro-fluxos";

// =============================================================
// Ligações AUTOMÁTICAS entre rotinas (Mapa, etapa 4, 18/10/2026).
//
// O curador (/root/curador-fluxos.py, domingo à noite) lê o código de cada rotina, vê o que ela LÊ e o que
// ESCREVE (arquivos, bancos do Notion, tabelas) e liga A -> B quando A escreve algo que B lê. O resultado
// é publicado no bucket público `status`, junto do status.json. Aqui só lemos esse arquivo.
//
// Se o arquivo não existir (ou a rede falhar), o Mapa continua com as ligações declaradas em macro-fluxos.ts.
// =============================================================

const URL_LIGACOES =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/ligacoes-fluxos.json";

export interface LigacaoAuto {
  de: string;
  para: string;
  /** 8 primeiros caracteres do id do fluxo (null = a rotina ainda não tem desenho) */
  de_id: string | null;
  para_id: string | null;
  /** texto simples, ex.: "passa as notícias e dicas aprovadas para o grupo" */
  rotulo: string;
  /** conferida à mão no código (v3.4): vale como seta firme; sem isso é "achada sozinha" (tracejada) */
  verificada?: boolean;
  via?: { recurso: string; rotulo: string; escrito_em?: string; lido_em?: string }[];
}

export interface LigacoesFluxos {
  gerado_em?: string;
  ligacoes: LigacaoAuto[];
  /** fluxos (8 caracteres do id) cujo script mudou depois do desenho */
  desenho_velho: Record<string, { script_mudou_em: string; desenho_em: string }>;
}

let cache: Promise<LigacoesFluxos | null> | null = null;

function busca(): Promise<LigacoesFluxos | null> {
  if (!cache) {
    cache = fetch(`${URL_LIGACOES}?t=${Math.floor(Date.now() / 600_000)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        j && Array.isArray(j.ligacoes)
          ? ({ gerado_em: j.gerado_em, ligacoes: j.ligacoes, desenho_velho: j.desenho_velho || {} } as LigacoesFluxos)
          : null,
      )
      .catch(() => null);
  }
  return cache;
}

/** Lê o arquivo de ligações uma vez por visita. null = ainda carregando ou indisponível. */
export function useLigacoesAuto(): LigacoesFluxos | null {
  const [v, setV] = useState<LigacoesFluxos | null>(null);
  useEffect(() => {
    let vivo = true;
    busca().then((x) => vivo && setV(x));
    return () => { vivo = false; };
  }, []);
  return v;
}

/** Seta entre duas rotinas de um grupo: [de, para, rótulo, automática?] (ids de 8 caracteres) */
export type LigacaoDoGrupo = [string, string, string | undefined, boolean];

/** Declaradas em macro-fluxos.ts + as descobertas, só entre rotinas deste grupo (declarada ganha de automática). */
export function ligacoesDoGrupo(macro: MacroMontado, auto: LigacoesFluxos | null): LigacaoDoGrupo[] {
  const ids8 = new Set(macro.fluxos.map((f) => f.id.slice(0, 8)));
  const out: LigacaoDoGrupo[] = macro.def.ligacoes
    .filter(([a, b]) => ids8.has(a) && ids8.has(b))
    .map(([a, b, r]) => [a, b, r, false]);
  const ja = new Set(out.map(([a, b]) => `${a}>${b}`));
  for (const l of auto?.ligacoes || []) {
    if (!l.verificada) continue; // v3.4: a leitura automática só SUGERE; seta só para o que foi conferido no código
    if (!l.de_id || !l.para_id || !ids8.has(l.de_id) || !ids8.has(l.para_id)) continue;
    const k = `${l.de_id}>${l.para_id}`;
    if (ja.has(k) || ja.has(`${l.para_id}>${l.de_id}`)) continue; // a mão dela/minha já cobre esse par
    ja.add(k);
    out.push([l.de_id, l.para_id, l.rotulo, false]);
  }
  return out;
}

/** O script desta rotina mudou depois do desenho? (só tem resposta quando o curador já rodou) */
export function desenhoPodeEstarVelho(f: Pick<FlowDoc, "id">, auto: LigacoesFluxos | null): { script_mudou_em: string; desenho_em: string } | null {
  return auto?.desenho_velho?.[f.id.slice(0, 8)] ?? null;
}
