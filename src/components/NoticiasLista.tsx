"use client";

// Lista completa de notícias e radar (Áreas › Conteúdo › Notícias).
// Mesmos dados do HojePanel antigo: /api/hoje › caixa (esperando decisão, UAU
// primeiro) e › para_mim (feed de notícias de IA, com "lido" e os atalhos de
// mandar pro grupo ou pro banco de Conteúdos).

import { useState } from "react";
import { useHoje, marcarLido, promoverProGrupo, promoverProConteudo } from "@/lib/hoje";
import { usePainel } from "@/lib/painel-context";
import { COLUNAS_CAIXA, ehUau, CardAprovacao, ParaVoceFicarPorDentro } from "./HojePanel";

export default function NoticiasLista() {
  const { servidora } = usePainel();
  const { dados, erro, recarregar } = useHoje(true, servidora ? "servidora" : undefined);
  const [lidos, setLidos] = useState<Map<string, boolean>>(new Map());
  const [promovidos, setPromovidos] = useState<Set<string>>(new Set());

  if (erro) return <p className="p-6 text-sm text-[var(--text-secondary)]">Não consegui carregar as notícias agora. (Elas vêm da squad-api na VPS.)</p>;
  if (!dados) return <p className="p-6 text-sm text-[var(--text-secondary)] animate-pulse">carregando notícias…</p>;

  const caixa = dados.caixa.filter((c) => COLUNAS_CAIXA.has(c.coluna)).sort((a, b) => Number(ehUau(b)) - Number(ehUau(a)));
  const radar = (dados.para_mim || [])
    .filter((n) => !promovidos.has(n.url))
    .map((n) => (lidos.has(n.url) ? { ...n, lido: lidos.get(n.url) } : n));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        <section className="w-full lg:w-[420px] lg:shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Esperando você {caixa.length > 0 && <span className="text-[var(--ac)]">({caixa.length})</span>}
          </h2>
          {caixa.length === 0
            ? <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">Nenhuma notícia esperando você.</p>
            : <div className="space-y-2">{caixa.map((c) => <CardAprovacao key={c.id} card={c} />)}</div>}
        </section>
        <section className="flex-1 min-w-0 w-full">
          {radar.length === 0
            ? <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Radar</h2>
                <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                  {servidora ? "No modo Só Igam o radar de notícias não aparece." : "Sem notícias novas no radar."}
                </p>
              </>
            : <ParaVoceFicarPorDentro
                itens={radar}
                onToggleLido={(url, v) => { setLidos((m) => new Map(m).set(url, v)); marcarLido(url, v); }}
                onProGrupo={async (url) => { setPromovidos((s) => new Set(s).add(url)); if (await promoverProGrupo(url)) setTimeout(recarregar, 800); }}
                onProConteudo={async (url) => { setPromovidos((s) => new Set(s).add(url)); await promoverProConteudo(url); }} />}
        </section>
      </div>
    </div>
  );
}
