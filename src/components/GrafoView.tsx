"use client";

// 🕸️ Grafo do ecossistema (estilo Obsidian) — força-dirigida em SVG puro,
// sem dependências. Clique num nó pra ver as conexões dele.
// Camadas: 🤖 Ecossistema (agentes/automações) e 🧠 Segundo Cérebro (Notion),
// ligadas por pontes. O toggle filtra o que aparece.

import { useEffect, useMemo, useRef, useState } from "react";
import { NOS, ARESTAS, type No, type TipoNo } from "@/lib/grafo";
import GrafoConteudoView from "./GrafoConteudoView";

const COR: Record<TipoNo, string> = {
  agente: "#2D6B6B",     // Petróleo
  automacao: "#A0583C",  // Terracota
  lugar: "#C4A460",      // Dourado
  canal: "#5A7A85",      // Azul-petróleo
  raiz: "#5B3E85",       // Roxo escuro — Segundo Cérebro
  area: "#9B7BB8",       // Roxo — áreas da vida
};

type Modo = "tudo" | "ecossistema" | "notion" | "conhecimento";

interface Pos { x: number; y: number; vx: number; vy: number }

const camadaDe = (n: No) => n.camada ?? "ecossistema";

export default function GrafoView() {
  const W = 720, H = 560;
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const [sel, setSel] = useState<No | null>(null);
  const [modo, setModo] = useState<Modo>("tudo");
  const frame = useRef(0);

  // Nós e arestas visíveis conforme o modo. No modo "notion" trazemos também
  // os nós do ecossistema que fazem ponte (ex.: Radar), pra mostrar a conexão.
  const { nosVis, arestasVis } = useMemo(() => {
    const cam = (id: string) => {
      const n = NOS.find((x) => x.id === id);
      return n ? camadaDe(n) : "ecossistema";
    };
    const pontes = new Set<string>();
    for (const [a, b] of ARESTAS) {
      if (cam(a) !== cam(b)) { pontes.add(a); pontes.add(b); }
    }
    const visivel = (n: No) => {
      if (modo === "tudo") return true;
      if (modo === "ecossistema") return camadaDe(n) === "ecossistema";
      return n.camada === "notion" || pontes.has(n.id); // modo notion
    };
    const nosVis = NOS.filter(visivel);
    const ids = new Set(nosVis.map((n) => n.id));
    const arestasVis = ARESTAS.filter(([a, b]) => ids.has(a) && ids.has(b));
    return { nosVis, arestasVis };
  }, [modo]);

  // Se o nó selecionado sumiu ao trocar de modo, limpa a seleção.
  useEffect(() => {
    if (sel && !nosVis.some((n) => n.id === sel.id)) setSel(null);
  }, [nosVis, sel]);

  useEffect(() => {
    // posições iniciais: anéis por tipo (agrupamento visual)
    const p: Record<string, Pos> = {};
    nosVis.forEach((n, i) => {
      const ang = (i / nosVis.length) * Math.PI * 2;
      const raio =
        n.tipo === "raiz" ? 8 :
        n.tipo === "area" ? 130 :
        n.tipo === "canal" ? 90 :
        n.tipo === "agente" ? 170 :
        n.tipo === "automacao" ? 230 : 200;
      p[n.id] = { x: W / 2 + Math.cos(ang) * raio, y: H / 2 + Math.sin(ang) * raio, vx: 0, vy: 0 };
    });

    const vizinhos = new Set(arestasVis.map(([a, b]) => `${a}|${b}`));
    const ligado = (a: string, b: string) => vizinhos.has(`${a}|${b}`) || vizinhos.has(`${b}|${a}`);

    let ticks = 0;
    let vivo = true;
    const passo = () => {
      if (!vivo || ticks++ > 260) return;
      const ids = Object.keys(p);
      for (const a of ids) {
        let fx = 0, fy = 0;
        for (const b of ids) {
          if (a === b) continue;
          const dx = p[a].x - p[b].x, dy = p[a].y - p[b].y;
          const d2 = Math.max(dx * dx + dy * dy, 40);
          const d = Math.sqrt(d2);
          // repulsão universal
          fx += (dx / d) * (2600 / d2);
          fy += (dy / d) * (2600 / d2);
          // mola nas arestas
          if (ligado(a, b)) {
            const alvo = 110;
            fx -= (dx / d) * (d - alvo) * 0.02;
            fy -= (dy / d) * (d - alvo) * 0.02;
          }
        }
        // gravidade pro centro
        fx += (W / 2 - p[a].x) * 0.004;
        fy += (H / 2 - p[a].y) * 0.004;
        p[a].vx = (p[a].vx + fx) * 0.6;
        p[a].vy = (p[a].vy + fy) * 0.6;
      }
      for (const a of ids) {
        p[a].x = Math.min(W - 40, Math.max(40, p[a].x + p[a].vx));
        p[a].y = Math.min(H - 32, Math.max(32, p[a].y + p[a].vy));
      }
      setPos({ ...p });
      frame.current = requestAnimationFrame(passo);
    };
    frame.current = requestAnimationFrame(passo);
    return () => { vivo = false; cancelAnimationFrame(frame.current); };
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const conexoes = sel
    ? arestasVis.filter(([a, b]) => a === sel.id || b === sel.id)
        .map(([a, b]) => (a === sel.id ? b : a))
        .map((id) => nosVis.find((n) => n.id === id))
        .filter(Boolean) as No[]
    : [];

  const pronto = Object.keys(pos).length > 0;

  // Legenda adaptada ao modo
  const legendaEco: TipoNo[] = ["canal", "agente", "automacao", "lugar"];
  const legendaNotion: TipoNo[] = ["raiz", "area"];
  const rotuloTipo: Record<TipoNo, string> = {
    canal: "canais", agente: "agentes", automacao: "automações", lugar: "lugares",
    raiz: "Segundo Cérebro", area: "áreas da vida",
  };
  const legenda = [
    ...(modo !== "notion" ? legendaEco : []),
    ...(modo !== "ecossistema" ? legendaNotion : []),
  ];

  const botoes: { k: Modo; label: string }[] = [
    { k: "tudo", label: "Tudo" },
    { k: "ecossistema", label: "🤖 Ecossistema" },
    { k: "notion", label: "🧠 Segundo Cérebro" },
    { k: "conhecimento", label: "🧩 Conhecimento" },
  ];

  const toggle = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
        {botoes.map((b) => (
          <button key={b.k} onClick={() => setModo(b.k)}
            className={`px-3 py-1.5 transition-colors ${
              modo === b.k
                ? "bg-[var(--accent,#2D6B6B)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary,#00000008)]"
            }`}>
            {b.label}
          </button>
        ))}
      </div>
      {modo !== "conhecimento" && (
        <span className="ml-auto text-xs text-[var(--text-secondary)]">clique num nó 👇</span>
      )}
    </div>
  );

  if (modo === "conhecimento") {
    return (
      <div className="space-y-3">
        <div className="p-4 md:p-6 pb-0 max-w-5xl mx-auto">{toggle}</div>
        <GrafoConteudoView />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-3">
      {/* Toggle de camadas */}
      {toggle}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
        {legenda.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: COR[t] }} />
            {rotuloTipo[t]}
          </span>
        ))}
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 320 }}>
          {pronto && arestasVis.map(([a, b], i) => {
            const A = pos[a], B = pos[b];
            if (!A || !B) return null;
            const ativo = sel && (a === sel.id || b === sel.id);
            // ponte entre camadas ganha traço tracejado
            const na = nosVis.find((n) => n.id === a), nb = nosVis.find((n) => n.id === b);
            const ponte = na && nb && camadaDe(na) !== camadaDe(nb);
            return (
              <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={ativo ? "#A0583C" : ponte ? "#B59BD1" : "#D8CFC2"}
                strokeWidth={ativo ? 2 : 1}
                strokeDasharray={ponte ? "4 3" : undefined}
                opacity={sel && !ativo ? 0.25 : 0.9} />
            );
          })}
          {pronto && nosVis.map((n) => {
            const P = pos[n.id];
            if (!P) return null;
            const apagado = sel && sel.id !== n.id && !conexoes.some((c) => c.id === n.id);
            return (
              <g key={n.id} transform={`translate(${P.x},${P.y})`}
                className="cursor-pointer" opacity={apagado ? 0.25 : 1}
                onClick={() => setSel(sel?.id === n.id ? null : n)}>
                <circle r={sel?.id === n.id ? 17 : n.tipo === "raiz" ? 16 : 13}
                  fill={COR[n.tipo]} stroke="#FFFFFF" strokeWidth="2" />
                <text textAnchor="middle" dy="4" fontSize="11">{n.icone}</text>
                <text textAnchor="middle" dy="28" fontSize="9.5" fill="var(--text-secondary)">{n.rotulo}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {sel ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
          <p className="font-semibold text-[var(--text-primary)]">{sel.icone} {sel.rotulo}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Conectado a: {conexoes.map((c) => `${c.icone} ${c.rotulo}`).join(" · ") || "—"}
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
          Dois mundos: 🤖 os agentes que trabalham por você e 🧠 seu Segundo Cérebro no Notion.
          As linhas tracejadas são as pontes entre eles. Clique num nó do Notion pra abrir a página.
        </p>
      )}
    </div>
  );
}
