"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePainel } from "@/lib/painel-context";
import { PAGINAS_BUSCA, type EntradaBusca } from "@/lib/navegacao";
import { getFlowDocs } from "@/lib/storage";
import { fetchCatalogo } from "@/lib/biblioteca";
import { ehPessoal, ehColaboradorOculto } from "@/lib/modo";

const sem = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca do topo: procura nas páginas, fluxos, agentes e habilidades que o
// painel já conhece. Não há índice no servidor: fluxos e habilidades são
// pedidos uma vez, na primeira vez que ela clica na caixa.
export default function BuscaGlobal() {
  const router = useRouter();
  const { collaborators, servidora } = usePainel();
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(0);
  const [fluxos, setFluxos] = useState<EntradaBusca[]>([]);
  const [habilidades, setHabilidades] = useState<EntradaBusca[]>([]);
  const pediu = useRef(false);
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const carregarFontes = () => {
    if (pediu.current) return;
    pediu.current = true;
    getFlowDocs().then((fs) => setFluxos(fs.map((f) => ({
      tipo: "fluxo" as const, titulo: f.title, detalhe: (f.description || "").replace(/^\[[^\]]+\]\s*/, "").slice(0, 70),
      ir: `/maquina?aba=mapa&fluxo=${f.id}`, chave: f.description || "", pessoal: ehPessoal(f.title, f.description),
    })))).catch(() => {});
    fetchCatalogo().then((c) => setHabilidades((c?.skills || []).map((s) => ({
      tipo: "habilidade" as const, titulo: s.nome, detalhe: (s.descricao_simples || s.descricao || "").slice(0, 70),
      ir: "/equipe?aba=habilidades", chave: s.categoria || "", pessoal: ehPessoal(s.nome, s.descricao),
    })))).catch(() => {});
  };

  const agentes: EntradaBusca[] = useMemo(() => collaborators.map((c) => ({
    tipo: "agente" as const, titulo: c.name, detalhe: (c.specialization || "").slice(0, 70),
    ir: "/equipe?aba=agentes", chave: c.skills || "", pessoal: ehColaboradorOculto(c.name),
  })), [collaborators]);

  const resultados = useMemo(() => {
    const termo = sem(q.trim());
    if (!termo) return [];
    const todas = [...PAGINAS_BUSCA, ...agentes, ...fluxos, ...habilidades].filter((e) => !(servidora && e.pessoal));
    const pontua = (e: EntradaBusca) => {
      const t = sem(e.titulo);
      if (t.startsWith(termo)) return 3;
      if (t.includes(termo)) return 2;
      if (sem(`${e.detalhe || ""} ${e.chave || ""}`).includes(termo)) return 1;
      return 0;
    };
    return todas.map((e) => ({ e, p: pontua(e) })).filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p).slice(0, 8).map((x) => x.e);
  }, [q, agentes, fluxos, habilidades, servidora]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    const fora = (ev: MouseEvent) => { if (caixa.current && !caixa.current.contains(ev.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const ir = (e: EntradaBusca) => {
    setAberto(false); setQ(""); campo.current?.blur();
    router.push(e.ir);
  };

  return (
    <div ref={caixa} className="relative flex-1 min-w-0 max-w-[280px]">
      <input ref={campo} value={q} placeholder="🔎 procurar em tudo…" aria-label="Procurar em tudo"
        onFocus={() => { setAberto(true); carregarFontes(); }}
        onChange={(e) => { setQ(e.target.value); setAberto(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setAberto(false); campo.current?.blur(); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, resultados.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" && resultados[sel]) ir(resultados[sel]);
        }}
        className="w-full rounded-[10px] bg-[var(--bg-tertiary)] px-3.5 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none border border-transparent focus:border-[var(--ac)]" />
      {aberto && q.trim() && (
        <ul role="listbox" className="absolute left-0 top-full mt-1.5 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-1 max-h-80 overflow-y-auto">
          {resultados.length === 0 && <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">Nada encontrado para “{q.trim()}”.</li>}
          {resultados.map((e, i) => (
            <li key={e.tipo + e.titulo + i} role="option" aria-selected={i === sel}>
              <button onMouseEnter={() => setSel(i)} onClick={() => ir(e)}
                className={`w-full text-left px-3 py-2 rounded-lg cursor-pointer flex items-baseline gap-2 ${i === sel ? "bg-[var(--accent-soft)]" : ""}`}>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-16 shrink-0">{e.tipo}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate text-[var(--text-primary)]">{e.titulo}</span>
                  {e.detalhe && <span className="block text-xs truncate text-[var(--text-secondary)]">{e.detalhe}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
