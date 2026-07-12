"use client";

// 🕸️ Grafo do ecossistema (estilo Obsidian) — força-dirigida em SVG puro,
// sem dependências. Clique num nó pra ver as conexões dele.

import { useEffect, useRef, useState } from "react";
import { NOS, ARESTAS, type No, type TipoNo } from "@/lib/grafo";

const COR: Record<TipoNo, string> = {
  agente: "#2D6B6B",     // Petróleo
  automacao: "#A0583C",  // Terracota
  lugar: "#C4A460",      // Dourado
  canal: "#5A7A85",      // Azul-petróleo
};

interface Pos { x: number; y: number; vx: number; vy: number }

export default function GrafoView() {
  const W = 720, H = 560;
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const [sel, setSel] = useState<No | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    // posições iniciais: círculo por tipo (agrupamento visual)
    const p: Record<string, Pos> = {};
    NOS.forEach((n, i) => {
      const ang = (i / NOS.length) * Math.PI * 2;
      const raio = n.tipo === "canal" ? 90 : n.tipo === "agente" ? 170 : n.tipo === "automacao" ? 230 : 200;
      p[n.id] = { x: W / 2 + Math.cos(ang) * raio, y: H / 2 + Math.sin(ang) * raio, vx: 0, vy: 0 };
    });

    const vizinhos = new Set(ARESTAS.map(([a, b]) => `${a}|${b}`));
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
  }, []);

  const conexoes = sel
    ? ARESTAS.filter(([a, b]) => a === sel.id || b === sel.id)
        .map(([a, b]) => (a === sel.id ? b : a))
        .map((id) => NOS.find((n) => n.id === id))
        .filter(Boolean) as No[]
    : [];

  const pronto = Object.keys(pos).length > 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
        {(["canal", "agente", "automacao", "lugar"] as TipoNo[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: COR[t] }} />
            {{ canal: "canais", agente: "agentes", automacao: "automações", lugar: "lugares" }[t]}
          </span>
        ))}
        <span className="ml-auto">clique num nó 👇</span>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 320 }}>
          {pronto && ARESTAS.map(([a, b], i) => {
            const A = pos[a], B = pos[b];
            if (!A || !B) return null;
            const ativo = sel && (a === sel.id || b === sel.id);
            return (
              <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={ativo ? "#A0583C" : "#D8CFC2"} strokeWidth={ativo ? 2 : 1}
                opacity={sel && !ativo ? 0.25 : 0.9} />
            );
          })}
          {pronto && NOS.map((n) => {
            const P = pos[n.id];
            if (!P) return null;
            const apagado = sel && sel.id !== n.id && !conexoes.some((c) => c.id === n.id);
            return (
              <g key={n.id} transform={`translate(${P.x},${P.y})`}
                className="cursor-pointer" opacity={apagado ? 0.25 : 1}
                onClick={() => setSel(sel?.id === n.id ? null : n)}>
                <circle r={sel?.id === n.id ? 17 : 13} fill={COR[n.tipo]} stroke="#FFFFFF" strokeWidth="2" />
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
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Fase 2 (roadmap): as conexões reais entre suas páginas e bancos do Notion entram aqui.
        </p>
      )}
    </div>
  );
}
