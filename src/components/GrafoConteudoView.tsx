"use client";

// 🧠 Grafo de Conhecimento — o "novelo" das notas dela, conectadas por temas
// e hashtags (estilo Obsidian). Lê o grafo_conteudo.json publicado pelo coletor
// no Supabase. Clique num nó abre a página no Notion.

import { useEffect, useMemo, useRef, useState } from "react";
import { SQUAD_API_BASE } from "@/lib/config";

const GRAFO_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/grafo_conteudo.json";

type Tipo = "topico" | "nota" | "tag";
interface No { id: string; rotulo: string; tipo: Tipo; url?: string; area?: string; subtipo?: string }
interface Grafo { gerado_em: string; nos: No[]; arestas: [string, string][]; stats: Record<string, number> }

const COR: Record<Tipo, string> = {
  topico: "#5B3E85", // roxo — temas do banco Tópicos
  nota: "#A0583C",   // terracota — notas/reuniões
  tag: "#2D6B6B",    // petróleo — hashtags (o tecido que conecta)
};
const ICONE_SUB: Record<string, string> = {
  reuniao: "👥", aula: "🎓", seminario: "🎤", oficina: "🛠️",
  evento: "📅", curso: "🎓", nota: "📄",
};

interface Pos { x: number; y: number; vx: number; vy: number }

export default function GrafoConteudoView() {
  const [grafo, setGrafo] = useState<Grafo | null>(null);
  const [erro, setErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const [sel, setSel] = useState<No | null>(null);
  const [filtro, setFiltro] = useState<"tudo" | Tipo>("tudo");
  const frame = useRef(0);

  const carrega = () =>
    fetch(`${GRAFO_URL}?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d: Grafo) => { setGrafo(d); setErro(false); })
      .catch(() => setErro(true));

  useEffect(() => { carrega(); }, []);

  async function atualizarAgora() {
    setAtualizando(true);
    try {
      // o endpoint roda o coletor no servidor e só responde quando publica
      await fetch(`${SQUAD_API_BASE}/api/grafo/atualizar`, { method: "POST" }).catch(() => {});
      await carrega();
    } finally {
      setAtualizando(false);
    }
  }

  // nós/arestas visíveis conforme filtro (tags sempre entram, são o elo)
  const { nos, arestas, adj } = useMemo(() => {
    const W = 900, H = 640;
    if (!grafo) return { nos: [] as No[], arestas: [] as [string, string][], adj: new Set<string>(), W, H };
    const visivel = (n: No) =>
      filtro === "tudo" || n.tipo === filtro || n.tipo === "tag";
    const nos = grafo.nos.filter(visivel);
    const ids = new Set(nos.map((n) => n.id));
    const arestas = grafo.arestas.filter(([a, b]) => ids.has(a) && ids.has(b));
    const adj = new Set(arestas.map(([a, b]) => `${a}|${b}`));
    return { nos, arestas, adj };
  }, [grafo, filtro]);

  const W = 900, H = 640;

  useEffect(() => {
    if (!nos.length) return;
    const p: Record<string, Pos> = {};
    nos.forEach((n, i) => {
      const ang = (i / nos.length) * Math.PI * 2;
      const raio = n.tipo === "tag" ? 120 : n.tipo === "topico" ? 230 : 300;
      p[n.id] = { x: W / 2 + Math.cos(ang) * raio, y: H / 2 + Math.sin(ang) * raio, vx: 0, vy: 0 };
    });
    const liga = (a: string, b: string) => adj.has(`${a}|${b}`) || adj.has(`${b}|${a}`);
    let ticks = 0, vivo = true;
    const passo = () => {
      if (!vivo || ticks++ > 300) return;
      const ids = Object.keys(p);
      for (const a of ids) {
        let fx = 0, fy = 0;
        for (const b of ids) {
          if (a === b) continue;
          const dx = p[a].x - p[b].x, dy = p[a].y - p[b].y;
          const d2 = Math.max(dx * dx + dy * dy, 60);
          const d = Math.sqrt(d2);
          fx += (dx / d) * (3200 / d2);
          fy += (dy / d) * (3200 / d2);
          if (liga(a, b)) {
            fx -= (dx / d) * (d - 90) * 0.015;
            fy -= (dy / d) * (d - 90) * 0.015;
          }
        }
        fx += (W / 2 - p[a].x) * 0.005;
        fy += (H / 2 - p[a].y) * 0.005;
        p[a].vx = (p[a].vx + fx) * 0.58;
        p[a].vy = (p[a].vy + fy) * 0.58;
      }
      for (const a of ids) {
        p[a].x = Math.min(W - 30, Math.max(30, p[a].x + p[a].vx));
        p[a].y = Math.min(H - 24, Math.max(24, p[a].y + p[a].vy));
      }
      setPos({ ...p });
      frame.current = requestAnimationFrame(passo);
    };
    frame.current = requestAnimationFrame(passo);
    return () => { vivo = false; cancelAnimationFrame(frame.current); };
  }, [nos, adj]);

  const conexoes = sel
    ? arestas.filter(([a, b]) => a === sel.id || b === sel.id)
        .map(([a, b]) => (a === sel.id ? b : a))
        .map((id) => nos.find((n) => n.id === id))
        .filter(Boolean) as No[]
    : [];
  const pronto = Object.keys(pos).length > 0;

  if (erro)
    return <div className="p-6 text-sm text-[var(--text-secondary)]">Não consegui carregar o grafo. Rode o coletor e tente de novo.</div>;
  if (!grafo)
    return <div className="p-6 text-sm text-[var(--text-muted)]">Carregando o novelo…</div>;

  const raio = (n: No) => (n.tipo === "topico" ? 12 : n.tipo === "nota" ? 10 : 7);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
          {([["tudo", "Tudo"], ["topico", "🟣 Temas"], ["nota", "🟤 Notas"], ["tag", "🟢 Tags"]] as [typeof filtro, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 transition-colors ${filtro === k ? "bg-[var(--accent,#2D6B6B)] text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:opacity-80"}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={atualizarAgora} disabled={atualizando}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:opacity-80 disabled:opacity-50">
          {atualizando ? "🔄 Atualizando…" : "🔄 Atualizar agora"}
        </button>
        <span className="ml-auto text-xs text-[var(--text-secondary)]">
          {grafo.stats.topicos} temas · {grafo.stats.notas} notas · {grafo.stats.tags} tags
        </span>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 340 }}>
          {pronto && arestas.map(([a, b], i) => {
            const A = pos[a], B = pos[b];
            if (!A || !B) return null;
            const ativo = sel && (a === sel.id || b === sel.id);
            return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke={ativo ? "#A0583C" : "#D8CFC2"} strokeWidth={ativo ? 2 : 1}
              opacity={sel && !ativo ? 0.15 : 0.7} />;
          })}
          {pronto && nos.map((n) => {
            const P = pos[n.id];
            if (!P) return null;
            const apagado = sel && sel.id !== n.id && !conexoes.some((c) => c.id === n.id);
            const r = sel?.id === n.id ? raio(n) + 4 : raio(n);
            return (
              <g key={n.id} transform={`translate(${P.x},${P.y})`}
                className="cursor-pointer" opacity={apagado ? 0.2 : 1}
                onClick={() => setSel(sel?.id === n.id ? null : n)}>
                <circle r={r} fill={COR[n.tipo]} stroke="#FFFFFF" strokeWidth="1.5" />
                {n.tipo !== "tag" && (
                  <text textAnchor="middle" dy={r + 11} fontSize="9" fill="var(--text-secondary)">
                    {(n.tipo === "nota" ? (ICONE_SUB[n.subtipo || "nota"] || "📄") + " " : "") + n.rotulo}
                  </text>
                )}
                {n.tipo === "tag" && (
                  <text textAnchor="middle" dy={r + 9} fontSize="8.5"
                    paintOrder="stroke" stroke="var(--bg-secondary)" strokeWidth="2.5"
                    fill={sel?.id === n.id ? "var(--text-primary)" : "var(--text-secondary)"}>#{n.rotulo}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {sel ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
          <p className="font-semibold text-[var(--text-primary)]">
            {sel.tipo === "tag" ? "#" + sel.rotulo : (ICONE_SUB[sel.subtipo || ""] ? ICONE_SUB[sel.subtipo || ""] + " " : "") + sel.rotulo}
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
              {sel.tipo === "topico" ? "tema" + (sel.area ? " · " + sel.area : "") : sel.tipo === "nota" ? "nota" : "hashtag"}
            </span>
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Conectado a {conexoes.length}: {conexoes.slice(0, 12).map((c) => c.tipo === "tag" ? "#" + c.rotulo : c.rotulo).join(" · ") || "—"}
            {conexoes.length > 12 ? " …" : ""}
          </p>
          {sel.url && (
            <a href={sel.url} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-medium text-[var(--accent,#2D6B6B)] hover:underline">
              Abrir no Notion ↗
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          🟣 temas · 🟤 notas/reuniões · 🟢 hashtags. As notas se conectam pelos temas e tags que compartilham.
          Clique num nó pra ver as conexões e abrir a página. Escreva mais #hashtags no Notion e clique em Atualizar.
        </p>
      )}
    </div>
  );
}
