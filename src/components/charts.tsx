"use client";

import { useState } from "react";

// Gráficos SVG de série única, paleta AF (Petróleo pra marca, Terracota pra
// destaque). Sem dependências. Cada gráfico tem tooltip no hover e uma visão
// em tabela (acessibilidade).

const TEAL = "#2D6B6B";
const TERRACOTTA = "#A0583C";
const GRID = "#E5DED4";
const INK_MUTED = "#6B7A7A";

export interface Ponto {
  label: string;
  valor: number; // já na unidade final (ex.: 0-100 pra %)
  detalhe?: string;
}

function TabelaToggle({ aberto, onToggle }: { aberto: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="text-xs underline decoration-dotted"
      style={{ color: INK_MUTED }}
    >
      {aberto ? "ver gráfico" : "ver tabela"}
    </button>
  );
}

function Tabela({ pontos, unidade }: { pontos: Ponto[]; unidade: string }) {
  return (
    <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
      <thead>
        <tr className="text-left" style={{ color: INK_MUTED }}>
          <th className="py-1 font-medium">Semana</th>
          <th className="py-1 font-medium">Valor{unidade ? ` (${unidade})` : ""}</th>
        </tr>
      </thead>
      <tbody>
        {pontos.map((p) => (
          <tr key={p.label} className="border-t" style={{ borderColor: GRID }}>
            <td className="py-1">{p.label}</td>
            <td className="py-1">{p.valor}{unidade}{p.detalhe ? ` — ${p.detalhe}` : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function GraficoLinha({
  pontos, unidade = "", altura = 220, maxY,
}: { pontos: Ponto[]; unidade?: string; altura?: number; maxY?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  if (!pontos.length) return <p className="text-sm" style={{ color: INK_MUTED }}>Ainda sem dados — o coletor roda toda noite.</p>;
  if (tabela) return (
    <div>
      <Tabela pontos={pontos} unidade={unidade} />
      <TabelaToggle aberto onToggle={() => setTabela(false)} />
    </div>
  );

  const W = 560, H = altura, PAD = { t: 16, r: 44, b: 28, l: 40 };
  const top = maxY ?? (Math.max(...pontos.map((p) => p.valor)) * 1.15 || 1);
  const x = (i: number) =>
    PAD.l + (pontos.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (pontos.length - 1));
  const y = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b);
  const path = pontos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valor)}`).join(" ");
  const ultimo = pontos[pontos.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full" style={{ maxHeight: 260 }}
        role="img"
        aria-label={`Gráfico de linha, último valor ${ultimo.valor}${unidade}`}
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(top * f)} y2={y(top * f)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="11" fill={INK_MUTED}>
              {Math.round(top * f)}{unidade}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" />
        {pontos.map((p, i) => (
          <g key={p.label}>
            {/* alvo de hover maior que a marca */}
            <rect
              x={x(i) - 18} y={PAD.t} width="36" height={H - PAD.t - PAD.b}
              fill="transparent" onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={x(i)} cy={y(p.valor)} r={hover === i ? 6 : 4}
              fill={i === pontos.length - 1 ? TERRACOTTA : TEAL}
              stroke="#FFFFFF" strokeWidth="2"
            />
            <text x={x(i)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill={INK_MUTED}>
              {p.label}
            </text>
          </g>
        ))}
        {/* rótulo direto só no último ponto */}
        <text x={x(pontos.length - 1) + 10} y={y(ultimo.valor) + 4} fontSize="13" fontWeight="600" fill={TERRACOTTA}>
          {ultimo.valor}{unidade}
        </text>
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke={INK_MUTED} strokeWidth="1" strokeDasharray="3 3" />
            <TooltipSvg x={x(hover)} y={y(pontos[hover].valor)} W={W}
              linhas={[pontos[hover].label, `${pontos[hover].valor}${unidade}${pontos[hover].detalhe ? ` · ${pontos[hover].detalhe}` : ""}`]} />
          </g>
        )}
      </svg>
      <TabelaToggle aberto={false} onToggle={() => setTabela(true)} />
    </div>
  );
}

export function GraficoBarras({
  pontos, unidade = "", altura = 220,
}: { pontos: Ponto[]; unidade?: string; altura?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  if (!pontos.length) return <p className="text-sm" style={{ color: INK_MUTED }}>Ainda sem dados — o coletor roda toda noite.</p>;
  if (tabela) return (
    <div>
      <Tabela pontos={pontos} unidade={unidade} />
      <TabelaToggle aberto onToggle={() => setTabela(false)} />
    </div>
  );

  const W = 560, H = altura, PAD = { t: 24, r: 16, b: 28, l: 40 };
  const top = Math.max(...pontos.map((p) => p.valor)) * 1.15 || 1;
  const areaW = W - PAD.l - PAD.r;
  const passo = areaW / pontos.length;
  const barW = Math.min(48, passo - 2); // gap mínimo de 2px entre barras
  const y = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full" style={{ maxHeight: 260 }}
        role="img"
        aria-label="Gráfico de barras"
        onMouseLeave={() => setHover(null)}
      >
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(top * f)} y2={y(top * f)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="11" fill={INK_MUTED}>
              {Math.round(top * f)}{unidade}
            </text>
          </g>
        ))}
        {pontos.map((p, i) => {
          const bx = PAD.l + i * passo + (passo - barW) / 2;
          const by = y(p.valor);
          const bh = Math.max(H - PAD.b - by, 2);
          return (
            <g key={p.label} onMouseEnter={() => setHover(i)}>
              <rect x={PAD.l + i * passo} y={PAD.t} width={passo} height={H - PAD.t - PAD.b} fill="transparent" />
              {/* topo arredondado 4px, base reta ancorada no eixo */}
              <path
                d={`M${bx},${H - PAD.b} L${bx},${by + 4} Q${bx},${by} ${bx + 4},${by} L${bx + barW - 4},${by} Q${bx + barW},${by} ${bx + barW},${by + 4} L${bx + barW},${H - PAD.b} Z`}
                fill={hover === i ? TERRACOTTA : TEAL}
              />
              <text x={bx + barW / 2} y={by - 6} textAnchor="middle" fontSize="12" fontWeight="600"
                fill="var(--text-primary)">
                {p.valor}
              </text>
              <text x={bx + barW / 2} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill={INK_MUTED}>
                {p.label}
              </text>
            </g>
          );
        })}
        {hover !== null && (
          <TooltipSvg x={PAD.l + hover * passo + passo / 2} y={y(pontos[hover].valor)} W={W}
            linhas={[pontos[hover].label, `${pontos[hover].valor}${unidade}${pontos[hover].detalhe ? ` · ${pontos[hover].detalhe}` : ""}`]} />
        )}
      </svg>
      <TabelaToggle aberto={false} onToggle={() => setTabela(true)} />
    </div>
  );
}

function TooltipSvg({ x, y, W, linhas }: { x: number; y: number; W: number; linhas: string[] }) {
  const larg = Math.max(...linhas.map((l) => l.length)) * 7 + 16;
  const tx = Math.min(Math.max(x - larg / 2, 4), W - larg - 4);
  const ty = Math.max(y - 52, 4);
  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={larg} height="40" rx="6" fill="#2D3B3B" opacity="0.92" />
      {linhas.map((l, i) => (
        <text key={i} x={tx + 8} y={ty + 16 + i * 16} fontSize="12" fill="#F5F0EA">{l}</text>
      ))}
    </g>
  );
}

// ── Pizza ───────────────────────────────────────────────────────────────
// Criado em 25/07/2026 a pedido dela, pra mostrar proporção: automações por
// categoria e quantas gastam IA. Pizza serve pra "quanto de cada" — não para
// evolução no tempo, que continua sendo linha ou barra.
const CORES_PIZZA = ["#2D6B6B", "#A0583C", "#5A8F8F", "#C08457", "#7FA8A8", "#8C6B4F", "#456B74", "#B08968"];

export function GraficoPizza({ fatias, altura = 200 }: {
  fatias: { rotulo: string; valor: number }[];
  altura?: number;
}) {
  const total = fatias.reduce((a, f) => a + f.valor, 0);
  if (!total) {
    return <p className="text-sm text-[var(--text-muted)] py-6 text-center">sem dados ainda</p>;
  }
  const R = 80, CX = 100, CY = 100;
  let angulo = -Math.PI / 2; // começa no topo
  const setores = fatias.map((f, i) => {
    const fatia = (f.valor / total) * Math.PI * 2;
    const x1 = CX + R * Math.cos(angulo), y1 = CY + R * Math.sin(angulo);
    angulo += fatia;
    const x2 = CX + R * Math.cos(angulo), y2 = CY + R * Math.sin(angulo);
    const grande = fatia > Math.PI ? 1 : 0;
    // uma fatia de 100% não fecha com arco: vira círculo inteiro
    const d = fatias.length === 1
      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
      : `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${grande} 1 ${x2} ${y2} Z`;
    return { d, cor: CORES_PIZZA[i % CORES_PIZZA.length], ...f };
  });

  return (
    <div className="flex flex-wrap items-center gap-4 justify-center">
      <svg viewBox="0 0 200 200" style={{ height: altura, maxWidth: "100%" }} role="img"
        aria-label={fatias.map((f) => `${f.rotulo}: ${f.valor}`).join(", ")}>
        {setores.map((s) => (
          <path key={s.rotulo} d={s.d} fill={s.cor} stroke="var(--bg-secondary)" strokeWidth="1.5" />
        ))}
      </svg>
      <ul className="text-sm space-y-1 min-w-[140px]">
        {setores.map((s) => (
          <li key={s.rotulo} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.cor }} />
            <span className="text-[var(--text-primary)] flex-1">{s.rotulo}</span>
            <span className="text-[var(--text-secondary)] tabular-nums">
              {s.valor} <span className="text-[var(--text-muted)]">({Math.round((s.valor / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
