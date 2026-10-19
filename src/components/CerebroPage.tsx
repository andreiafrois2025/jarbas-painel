"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { squadFetch } from "@/lib/squadFetch";
import { usePainel } from "@/lib/painel-context";
import MarkdownLeve from "./MarkdownLeve";
import { Vazio } from "./ui";

// =============================================================
// 🧠 Cérebro: o "Obsidian próprio" da Andréia. Mostra a memória do Jarbas:
// notas em Markdown, ligações entre notas ([[nome]]), busca, etiquetas,
// cartões dos projetos e um grafo. Dados vêm da squad-api (/api/cerebro).
// No celular mostra uma coisa por vez; no computador, lista à esquerda e
// conteúdo à direita, em largura total.
// =============================================================

interface Nota {
  id: string; nome: string; titulo: string; descricao: string; pasta: string;
  tipo: string; status: string; area: string; tags: string[]; atualizado: string; ligacoes: string[];
}
interface NotaAberta { id: string; fm: Record<string, unknown>; corpo: string }

const PASTAS: Record<string, { rotulo: string; cor: string }> = {
  projetos: { rotulo: "Projetos", cor: "#2D6B6B" },
  regras: { rotulo: "Regras", cor: "#A0583C" },
  notas: { rotulo: "Notas", cor: "#C4A460" },
  "sobre-ela": { rotulo: "Sobre ela", cor: "#9B7BB8" },
  referencias: { rotulo: "Referências", cor: "#5A7A85" },
  diario: { rotulo: "Diário", cor: "#8A8A8A" },
};
const infoPasta = (p: string) => PASTAS[p] ?? { rotulo: p || "Outras", cor: "#8A8A8A" };

const STATUS: { id: string; rotulo: string; recolhido?: boolean }[] = [
  { id: "esperando-ela", rotulo: "🙋 Esperando você" },
  { id: "andamento", rotulo: "🟢 Em andamento" },
  { id: "pausado", rotulo: "⏸️ Pausado" },
  { id: "a-avaliar", rotulo: "💭 A avaliar" },
  { id: "feito", rotulo: "✅ Feito", recolhido: true },
];
const rotuloStatus = (s: string) => STATUS.find((x) => x.id === s)?.rotulo ?? "";

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function quando(iso: string): string {
  if (!iso) return "sem data";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  const dias = Math.round((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR");
}

type Painel = "inicio" | "grafo" | "lista";

export default function CerebroPage() {
  const { servidora } = usePainel();
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [pasta, setPasta] = useState("");
  const [tag, setTag] = useState("");
  const [painel, setPainel] = useState<Painel>("inicio");
  const [aberta, setAberta] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<NotaAberta | null>(null);
  const [erroNota, setErroNota] = useState(false);
  const [todasTags, setTodasTags] = useState(false);
  const cache = useRef<Record<string, NotaAberta>>({});
  const topoNota = useRef<HTMLDivElement>(null);

  const sufixo = servidora ? "modo=servidora" : "";

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await squadFetch(`/api/cerebro${sufixo ? `?${sufixo}` : ""}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setNotas(Array.isArray(j.notas) ? j.notas : []);
    } catch { setErro(true); }
  }, [sufixo]);
  useEffect(() => { cache.current = {}; carregar(); }, [carregar]);

  // abre uma nota: busca o corpo (com cache)
  useEffect(() => {
    if (!aberta) { setConteudo(null); return; }
    setErroNota(false);
    const guardada = cache.current[aberta];
    if (guardada) { setConteudo(guardada); return; }
    setConteudo(null);
    let vivo = true;
    (async () => {
      try {
        const r = await squadFetch(`/api/cerebro/nota?id=${encodeURIComponent(aberta)}${sufixo ? `&${sufixo}` : ""}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as NotaAberta;
        cache.current[aberta] = j;
        if (vivo) setConteudo(j);
      } catch { if (vivo) setErroNota(true); }
    })();
    return () => { vivo = false; };
  }, [aberta, sufixo]);

  useEffect(() => { topoNota.current?.scrollTo({ top: 0 }); }, [aberta]);

  const porNome = useMemo(() => {
    const m = new Map<string, Nota>();
    (notas ?? []).forEach((n) => m.set(norm(n.nome), n));
    return m;
  }, [notas]);
  const porId = useMemo(() => new Map((notas ?? []).map((n) => [n.id, n])), [notas]);

  const abrirPorNome = (nome: string) => {
    const n = porNome.get(norm(nome));
    if (n) setAberta(n.id);
  };

  const filtradas = useMemo(() => {
    const q = norm(busca.trim());
    return (notas ?? [])
      .filter((n) => !pasta || n.pasta === pasta)
      .filter((n) => !tag || n.tags.includes(tag))
      .filter((n) => !q || norm(`${n.titulo} ${n.descricao} ${n.tags.join(" ")}`).includes(q))
      .sort((a, b) => (b.atualizado || "").localeCompare(a.atualizado || ""));
  }, [notas, busca, pasta, tag]);

  const tagsFreq = useMemo(() => {
    const c = new Map<string, number>();
    (notas ?? []).forEach((n) => n.tags.forEach((t) => c.set(t, (c.get(t) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [notas]);

  const contagemPasta = useMemo(() => {
    const c: Record<string, number> = {};
    (notas ?? []).forEach((n) => { c[n.pasta] = (c[n.pasta] ?? 0) + 1; });
    return c;
  }, [notas]);

  const citadaEm = useMemo(() => {
    if (!conteudo) return [];
    const eu = porId.get(conteudo.id);
    if (!eu) return [];
    const alvo = norm(eu.nome);
    return (notas ?? []).filter((n) => n.id !== eu.id && n.ligacoes.some((l) => norm(l.split("|")[0].trim()) === alvo));
  }, [conteudo, notas, porId]);

  const filtrando = !!(busca.trim() || pasta || tag);
  const escolherTag = (t: string) => { setTag(t === tag ? "" : t); setAberta(null); setPainel("lista"); };

  const meta = aberta ? porId.get(aberta) : undefined;

  // ── peças ──
  const Chip = ({ t }: { t: string }) => (
    <button type="button" onClick={() => escolherTag(t)}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${tag === t ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-tertiary)]"}`}>
      #{t}
    </button>
  );

  const Pontinho = ({ p }: { p: string }) => (
    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: infoPasta(p).cor }} />
  );

  const abas: { id: Painel; rotulo: string }[] = [
    { id: "inicio", rotulo: "📁 Projetos" },
    { id: "grafo", rotulo: "🕸️ Grafo" },
    { id: "lista", rotulo: "📝 Notas" },
  ];

  // ── lista lateral (computador) / aba Notas (celular) ──
  const lateral = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-3 space-y-2 border-b border-[var(--border)] shrink-0">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setPasta("")}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${!pasta ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
            Todas ({notas?.length ?? 0})
          </button>
          {Object.keys(PASTAS).filter((p) => contagemPasta[p]).map((p) => (
            <button key={p} type="button" onClick={() => setPasta(pasta === p ? "" : p)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${pasta === p ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
              <Pontinho p={p} />{PASTAS[p].rotulo} ({contagemPasta[p]})
            </button>
          ))}
        </div>
        {tagsFreq.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {(todasTags ? tagsFreq : tagsFreq.slice(0, 12)).map(([t]) => <Chip key={t} t={t} />)}
            {tagsFreq.length > 12 && (
              <button type="button" onClick={() => setTodasTags(!todasTags)} className="text-xs text-[var(--text-secondary)] underline cursor-pointer bg-transparent border-0">
                {todasTags ? "menos" : `mais ${tagsFreq.length - 12}`}
              </button>
            )}
          </div>
        )}
        {filtrando && (
          <button type="button" onClick={() => { setBusca(""); setPasta(""); setTag(""); }}
            className="text-xs font-semibold text-[var(--accent)] underline cursor-pointer bg-transparent border-0 p-0">
            limpar filtros
          </button>
        )}
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto list-none m-0 p-0">
        {filtradas.length === 0 && <li className="p-6 text-sm text-[var(--text-secondary)] text-center">Nenhuma nota encontrada.</li>}
        {filtradas.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => setAberta(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--border)] cursor-pointer bg-transparent hover:bg-[var(--bg-tertiary)] ${aberta === n.id ? "bg-[var(--bg-tertiary)]" : ""}`}>
              <div className="flex items-center gap-2"><Pontinho p={n.pasta} /><span className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{n.titulo || n.nome}</span></div>
              {n.descricao && <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{n.descricao}</div>}
              <div className="text-xs text-[var(--text-muted)] mt-1">{infoPasta(n.pasta).rotulo} · {quando(n.atualizado)}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // ── tela inicial: projetos em cartões ──
  const inicio = (() => {
    if (filtrando) {
      return (
        <div className="p-4 md:p-6">
          <p className="text-sm text-[var(--text-secondary)] mb-3">{filtradas.length} nota(s) encontrada(s)</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((n) => <CartaoNota key={n.id} n={n} onAbrir={() => setAberta(n.id)} />)}
          </div>
        </div>
      );
    }
    const projetos = (notas ?? []).filter((n) => n.pasta === "projetos");
    const semStatus = projetos.filter((n) => !STATUS.some((s) => s.id === n.status));
    return (
      <div className="p-4 md:p-6 space-y-6">
        {projetos.length === 0 && <Vazio icone="📁" titulo="Nenhum projeto ainda" descricao="Quando o Jarbas anotar um projeto, ele aparece aqui." />}
        {STATUS.map((s) => {
          const lista = projetos.filter((n) => n.status === s.id).sort((a, b) => (b.atualizado || "").localeCompare(a.atualizado || ""));
          if (lista.length === 0) return null;
          const cartoes = (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {lista.map((n) => <CartaoNota key={n.id} n={n} onAbrir={() => setAberta(n.id)} />)}
            </div>
          );
          return s.recolhido ? (
            <details key={s.id}>
              <summary className="cursor-pointer text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-3">{s.rotulo} ({lista.length})</summary>
              <div className="mt-3">{cartoes}</div>
            </details>
          ) : (
            <section key={s.id}>
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-3">{s.rotulo} ({lista.length})</h2>
              {cartoes}
            </section>
          );
        })}
        {semStatus.length > 0 && (
          <section>
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-3">Sem situação definida ({semStatus.length})</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {semStatus.map((n) => <CartaoNota key={n.id} n={n} onAbrir={() => setAberta(n.id)} />)}
            </div>
          </section>
        )}
      </div>
    );
  })();

  // ── nota aberta ──
  const notaView = (
    <div ref={topoNota} className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-none">
        <button type="button" onClick={() => setAberta(null)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] cursor-pointer bg-transparent border-0 p-0">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight m-0">{meta?.titulo || meta?.nome || "Nota"}</h1>
        {meta && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[13px] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5"><Pontinho p={meta.pasta} />{infoPasta(meta.pasta).rotulo}</span>
            {meta.status && <span>{rotuloStatus(meta.status)}</span>}
            {meta.area && <span>Área: {meta.area}</span>}
            <span>Atualizado {quando(meta.atualizado)}</span>
          </div>
        )}
        {meta && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">{meta.tags.map((t) => <Chip key={t} t={t} />)}</div>
        )}
        <div className="mt-4 border-t border-[var(--border)] pt-2">
          {erroNota ? (
            <p className="text-sm text-[var(--text-secondary)]">Não consegui abrir esta nota agora.</p>
          ) : !conteudo ? (
            <p className="text-sm text-[var(--text-secondary)] animate-pulse">Abrindo…</p>
          ) : (
            <div className="text-[15px]"><MarkdownLeve texto={conteudo.corpo} aoLigacao={abrirPorNome} /></div>
          )}
        </div>
        {conteudo && (
          <section className="mt-6 border-t border-[var(--border)] pt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-2">Citada em</h2>
            {citadaEm.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma outra nota cita esta.</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
                {citadaEm.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => setAberta(n.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm cursor-pointer text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                      <Pontinho p={n.pasta} />{n.titulo || n.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );

  const principal = aberta ? notaView : painel === "grafo" ? (
    <GrafoNotas notas={filtrando ? filtradas : (notas ?? [])} todas={notas ?? []} aoAbrir={setAberta} />
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto">{inicio}</div>
  );

  // ── montagem ──
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* barra de cima: título, busca e abas. No celular some quando há nota aberta. */}
      <div className={`${aberta ? "max-md:hidden" : ""} shrink-0 bg-[var(--bg-secondary)]/90 border-b border-[var(--border)] px-3 md:px-5 py-2 flex flex-wrap items-center gap-2 md:gap-4`}>
        <h1 className="text-base md:text-lg font-semibold whitespace-nowrap m-0">🧠 Cérebro</h1>
        <input
          type="search" value={busca} placeholder="Buscar por título, descrição ou etiqueta"
          onChange={(e) => { setBusca(e.target.value); if (e.target.value && !aberta) setPainel((p) => (p === "grafo" ? p : "lista")); }}
          className="order-last md:order-none w-full md:w-96 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-[16px] md:text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <div className="flex gap-1 ml-auto">
          {abas.map((a) => (
            <button key={a.id} type="button" onClick={() => { setPainel(a.id); setAberta(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer border ${painel === a.id && !aberta ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border)]"} ${a.id === "lista" ? "md:hidden" : ""}`}>
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-[var(--text-secondary)]">Não consegui carregar o Cérebro agora.</p>
          <button type="button" onClick={carregar} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold cursor-pointer bg-[var(--bg-secondary)]">Tentar de novo</button>
        </div>
      ) : !notas ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)] animate-pulse">carregando o Cérebro…</div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* lista: sempre no computador; no celular só na aba Notas e sem nota aberta */}
          <aside className={`${painel === "lista" && !aberta ? "flex" : "hidden"} md:flex w-full md:w-80 xl:w-96 shrink-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] min-h-0 flex-col`}>
            {lateral}
          </aside>
          <main className={`${painel === "lista" && !aberta ? "hidden md:flex" : "flex"} flex-1 min-w-0 min-h-0 flex-col`}>
            {principal}
          </main>
        </div>
      )}
    </div>
  );
}

function CartaoNota({ n, onAbrir }: { n: Nota; onAbrir: () => void }) {
  return (
    <button type="button" onClick={onAbrir}
      className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 cursor-pointer hover:border-[var(--accent)] transition-colors min-w-0">
      <div className="text-[15px] font-bold text-[var(--text-primary)] leading-snug">{n.titulo || n.nome}</div>
      {n.descricao && <div className="text-[13px] text-[var(--text-secondary)] mt-1 line-clamp-2">{n.descricao}</div>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-[var(--text-muted)]">
        {n.area && <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 font-semibold text-[var(--text-secondary)]">{n.area}</span>}
        <span>{quando(n.atualizado)}</span>
      </div>
    </button>
  );
}

// ── Grafo: bolinhas ligadas pelas [[ligações]], força simples em SVG ──
interface P { id: string; x: number; y: number; r: number; cor: string; n: Nota; grau: number }

function GrafoNotas({ notas, todas, aoAbrir }: { notas: Nota[]; todas: Nota[]; aoAbrir: (id: string) => void }) {
  const W = 1000, H = 700;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sel, setSel] = useState<string | null>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number; moveu: boolean } | null>(null);
  const caixa = useRef<SVGSVGElement>(null);
  const moveuUltimo = useRef(false);

  const { nos, arestas } = useMemo(() => {
    const ids = new Set(notas.map((n) => n.id));
    const porNome = new Map(todas.map((n) => [norm(n.nome), n]));
    const set = new Set<string>();
    const arestas: [string, string][] = [];
    for (const n of notas) {
      for (const l of n.ligacoes) {
        const alvo = porNome.get(norm(l.split("|")[0].trim()));
        if (!alvo || alvo.id === n.id || !ids.has(alvo.id)) continue;
        const k = [n.id, alvo.id].sort().join("|");
        if (set.has(k)) continue;
        set.add(k); arestas.push([n.id, alvo.id]);
      }
    }
    const grau = new Map<string, number>();
    arestas.forEach(([a, b]) => { grau.set(a, (grau.get(a) ?? 0) + 1); grau.set(b, (grau.get(b) ?? 0) + 1); });
    const nos: P[] = notas.map((n, i) => {
      const ang = (i / Math.max(1, notas.length)) * Math.PI * 2;
      const raio = 120 + (i % 7) * 40;
      const g = grau.get(n.id) ?? 0;
      return { id: n.id, n, grau: g, cor: infoPasta(n.pasta).cor,
        r: (n.pasta === "projetos" ? 11 : 6) + Math.min(5, g * 0.6),
        x: W / 2 + Math.cos(ang) * raio, y: H / 2 + Math.sin(ang) * raio };
    });
    // força simples: repulsão entre todos, mola nas ligações, puxão leve ao centro
    const idx = new Map(nos.map((p, i) => [p.id, i]));
    const vx = new Float64Array(nos.length), vy = new Float64Array(nos.length);
    const passos = nos.length > 300 ? 120 : 220;
    for (let it = 0; it < passos; it++) {
      const frio = 1 - it / passos;
      for (let i = 0; i < nos.length; i++) {
        for (let j = i + 1; j < nos.length; j++) {
          let dx = nos[i].x - nos[j].x, dy = nos[i].y - nos[j].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          if (d2 > 90000) continue;
          const f = 2200 / d2, d = Math.sqrt(d2);
          vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; vx[j] -= (dx / d) * f; vy[j] -= (dy / d) * f;
        }
      }
      for (const [a, b] of arestas) {
        const i = idx.get(a)!, j = idx.get(b)!;
        const dx = nos[j].x - nos[i].x, dy = nos[j].y - nos[i].y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 70) * 0.02;
        vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; vx[j] -= (dx / d) * f; vy[j] -= (dy / d) * f;
      }
      for (let i = 0; i < nos.length; i++) {
        vx[i] += (W / 2 - nos[i].x) * 0.004; vy[i] += (H / 2 - nos[i].y) * 0.004;
        nos[i].x += Math.max(-12, Math.min(12, vx[i])) * frio; nos[i].y += Math.max(-12, Math.min(12, vy[i])) * frio;
        vx[i] *= 0.6; vy[i] *= 0.6;
      }
    }
    return { nos, arestas };
  }, [notas, todas]);

  const posPorId = useMemo(() => new Map(nos.map((p) => [p.id, p])), [nos]);
  const vizinhos = useMemo(() => {
    const s = new Set<string>();
    if (sel) arestas.forEach(([a, b]) => { if (a === sel) s.add(b); if (b === sel) s.add(a); });
    return s;
  }, [sel, arestas]);

  // reposiciona/zoom ao arrastar com dedo ou mouse
  const aoPressionar = (e: React.PointerEvent) => {
    arrasto.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moveu: false };
    moveuUltimo.current = false;
  };
  const aoMover = (e: React.PointerEvent) => {
    const a = arrasto.current; const el = caixa.current;
    if (!a || !el) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) a.moveu = true;
    if (!a.moveu) return;
    moveuUltimo.current = true;
    const esc = (W / el.clientWidth) / zoom;
    setPan({ x: a.px - dx * esc, y: a.py - dy * esc });
  };
  const aoSoltar = () => { arrasto.current = null; };
  const aoRolar = (e: React.WheelEvent) => {
    setZoom((z) => Math.max(0.5, Math.min(5, z * (e.deltaY < 0 ? 1.12 : 0.89))));
  };

  const vw = W / zoom, vh = H / zoom;
  const vbx = W / 2 + pan.x - vw / 2, vby = H / 2 + pan.y - vh / 2;
  const mostrarTodosRotulos = zoom >= 1.8;
  const selNo = sel ? posPorId.get(sel) : undefined;

  if (nos.length === 0) return <Vazio icone="🕸️" titulo="Nada para mostrar no grafo" descricao="Ajuste a busca ou os filtros." />;

  return (
    <div className="flex-1 min-h-0 relative bg-[var(--bg-primary)]">
      <svg ref={caixa} viewBox={`${vbx} ${vby} ${vw} ${vh}`} className="w-full h-full touch-none select-none cursor-grab"
        onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onPointerLeave={aoSoltar} onWheel={aoRolar}
        onClick={() => { if (!moveuUltimo.current) setSel(null); }}>
        {arestas.map(([a, b]) => {
          const p = posPorId.get(a)!, q = posPorId.get(b)!;
          const destaque = sel && (a === sel || b === sel);
          return <line key={a + b} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            stroke={destaque ? "var(--accent)" : "var(--text-muted)"} strokeWidth={destaque ? 2 : 1} opacity={sel && !destaque ? 0.08 : 0.4} />;
        })}
        {nos.map((p) => {
          const apagado = sel && p.id !== sel && !vizinhos.has(p.id);
          const rotulo = p.n.pasta === "projetos" || mostrarTodosRotulos || p.id === sel || vizinhos.has(p.id);
          return (
            <g key={p.id} opacity={apagado ? 0.2 : 1} className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); if (!moveuUltimo.current) setSel(p.id); }}>
              <circle cx={p.x} cy={p.y} r={Math.max(p.r, 12 / zoom)} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={p.r} fill={p.cor} stroke={p.id === sel ? "var(--text-primary)" : "var(--bg-primary)"} strokeWidth={p.id === sel ? 2.5 : 1.5} />
              {rotulo && (
                <text x={p.x} y={p.y + p.r + 11} textAnchor="middle" fontSize={10} fill="var(--text-primary)"
                  stroke="var(--bg-primary)" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: "none" }}>
                  {(p.n.titulo || p.n.nome).slice(0, 28)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[{ t: "+", f: () => setZoom((z) => Math.min(5, z * 1.3)) }, { t: "−", f: () => setZoom((z) => Math.max(0.5, z / 1.3)) }, { t: "⟲", f: () => { setZoom(1); setPan({ x: 0, y: 0 }); } }].map((b) => (
          <button key={b.t} type="button" onClick={b.f} aria-label={b.t === "+" ? "Aproximar" : b.t === "−" ? "Afastar" : "Centralizar"}
            className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-lg font-bold cursor-pointer text-[var(--text-primary)]">{b.t}</button>
        ))}
      </div>

      <div className="absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-[var(--bg-secondary)]/90 border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] max-w-[70%]">
        {Object.entries(PASTAS).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: v.cor }} />{v.rotulo}</span>
        ))}
      </div>

      {selNo ? (
        <div className="absolute left-3 right-3 bottom-3 md:right-auto md:max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-lg">
          <div className="text-[15px] font-bold text-[var(--text-primary)]">{selNo.n.titulo || selNo.n.nome}</div>
          {selNo.n.descricao && <div className="text-[13px] text-[var(--text-secondary)] mt-1 line-clamp-2">{selNo.n.descricao}</div>}
          <div className="text-xs text-[var(--text-muted)] mt-1">{infoPasta(selNo.n.pasta).rotulo} · {selNo.grau} ligação(ões)</div>
          <button type="button" onClick={() => aoAbrir(selNo.id)}
            className="mt-3 rounded-full bg-[var(--accent)] text-white px-4 py-2 text-sm font-bold cursor-pointer border-0">Abrir nota</button>
        </div>
      ) : (
        <p className="absolute left-3 bottom-3 m-0 text-xs text-[var(--text-muted)]">Toque numa bolinha para ver. Arraste para mover e use + e − para aproximar.</p>
      )}
    </div>
  );
}
