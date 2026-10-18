"use client";

import { useEffect, useRef, useState } from "react";
import type { Desenho, Peca, Seta } from "@/lib/radiografia";
import { quebraTexto } from "@/lib/radiografia";
import { FILL_BY_TYPE, STROKE_BY_TYPE } from "./RoughNode";

// =============================================
// Diagrama da radiografia: SVG próprio com rough.js (o mesmo "traço" à mão
// e as mesmas cores dos nós do editor). Formas e texto são do React; só o
// rabisco é desenhado por rough.js em duas camadas por trás.
// Tudo é clicável: peças e setas.
// =============================================

export type Selecao = { tipo: "peca" | "seta"; id: string } | null;

interface Props {
  desenho: Desenho;
  selecao: Selecao;
  onSelect: (s: Selecao) => void;
  /** id da peça onde o fluxo começa (ganha a plaquinha "começa aqui") */
  inicioId?: string;
}

function semente(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/** Caminho da seta entre duas peças + posição do rótulo + ponta. */
function geometria(a: Peca, b: Peca, retorno: boolean) {
  if (!retorno) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const dx = Math.max(24, (x2 - x1) / 2);
    return {
      d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
      lx: (x1 + x2) / 2,
      ly: (y1 + y2) / 2 - 8,
      ponta: [[x2 - 11, y2 - 6], [x2, y2], [x2 - 11, y2 + 6]] as [number, number][],
    };
  }
  // retorno: sai por baixo da origem e entra por baixo do destino
  const sx = a.x + a.w / 2;
  const sy = a.y + a.h;
  const tx = b.x + b.w / 2;
  const ty = b.y + b.h;
  const fundo = Math.max(sy, ty) + 52;
  return {
    d: `M ${sx} ${sy} C ${sx} ${fundo}, ${tx} ${fundo}, ${tx} ${ty}`,
    lx: (sx + tx) / 2,
    ly: fundo - 6,
    ponta: [[tx - 6, ty + 11], [tx, ty], [tx + 6, ty + 11]] as [number, number][],
  };
}

export default function FlowDiagram({ desenho, selecao, onSelect, inicioId }: Props) {
  const camadaSetas = useRef<SVGGElement>(null);
  const camadaFormas = useRef<SVGGElement>(null);
  const [pronto, setPronto] = useState(0);
  // escala: cabe na largura do painel, mas nunca abaixo de 0,8 (texto legível; passando disso, rola de lado)
  const caixa = useRef<HTMLDivElement>(null);
  const [larguraCaixa, setLarguraCaixa] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLarguraCaixa(el.clientWidth));
    ro.observe(el);
    setLarguraCaixa(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const escala = larguraCaixa ? Math.min(1.15, Math.max(0.8, larguraCaixa / desenho.largura)) : 1;
  const porId = new Map(desenho.pecas.map((p) => [p.id, p]));

  // rabisco: refaz quando o desenho ou a seleção mudam
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const mod: { default?: unknown } = await import("roughjs");
      if (cancelado) return;
      const rough = (mod.default ?? mod) as {
        svg: (el: SVGSVGElement) => {
          ellipse: (x: number, y: number, w: number, h: number, o: object) => SVGElement;
          rectangle: (x: number, y: number, w: number, h: number, o: object) => SVGElement;
          polygon: (p: [number, number][], o: object) => SVGElement;
          path: (d: string, o: object) => SVGElement;
          linearPath: (p: [number, number][], o: object) => SVGElement;
        };
      };
      const svg = camadaFormas.current?.ownerSVGElement;
      const gS = camadaSetas.current;
      const gF = camadaFormas.current;
      if (!svg || !gS || !gF) return;
      gS.replaceChildren();
      gF.replaceChildren();
      const rc = rough.svg(svg);

      for (const s of desenho.setas) {
        const a = porId.get(s.source);
        const b = porId.get(s.target);
        if (!a || !b) continue;
        const g = geometria(a, b, !!s.isReturn);
        const ativa = selecao?.tipo === "seta" && selecao.id === s.id;
        const opts = {
          roughness: 0.9,
          strokeWidth: ativa ? 3 : 1.8,
          stroke: s.isReturn ? STROKE_BY_TYPE.end : STROKE_BY_TYPE.action,
          strokeLineDash: s.isReturn ? [7, 6] : undefined,
          seed: semente(s.id),
        };
        gS.appendChild(rc.path(g.d, { ...opts, fill: "none" }));
        gS.appendChild(rc.linearPath(g.ponta, { ...opts, strokeLineDash: undefined, roughness: 0.5 }));
      }

      for (const p of desenho.pecas) {
        const ativa = selecao?.tipo === "peca" && selecao.id === p.id;
        const opts = {
          roughness: 1.6,
          strokeWidth: ativa ? 3 : 1.8,
          fill: FILL_BY_TYPE[p.type],
          fillStyle: "solid" as const,
          stroke: ativa ? "#1F4F4F" : STROKE_BY_TYPE[p.type],
          seed: semente(p.id),
        };
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        if (p.type === "start") {
          gF.appendChild(rc.ellipse(cx, cy, p.w - 8, p.h - 8, opts));
        } else if (p.type === "end") {
          gF.appendChild(rc.ellipse(cx, cy, p.w - 4, p.h - 4, { ...opts, fill: "none" }));
          gF.appendChild(rc.ellipse(cx, cy, p.w - 18, p.h - 18, opts));
        } else if (p.type === "condition") {
          gF.appendChild(
            rc.polygon([[cx, p.y + 2], [p.x + p.w - 2, cy], [cx, p.y + p.h - 2], [p.x + 2, cy]], opts),
          );
        } else {
          gF.appendChild(rc.rectangle(p.x + 3, p.y + 3, p.w - 6, p.h - 6, opts));
        }
      }
      setPronto((n) => n + 1);
    })().catch((e) => console.error("rough falhou:", e));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desenho, selecao]);

  const maxChars = (p: Peca) => (p.type === "condition" ? 14 : p.type === "action" || p.type === "note" ? 22 : 13);

  return (
    <div ref={caixa} className="w-full">
    <svg
      viewBox={`0 0 ${desenho.largura} ${desenho.altura}`}
      width={Math.round(desenho.largura * escala)}
      height={Math.round(desenho.altura * escala)}
      style={{ display: "block", maxWidth: "none" }}
      role="img"
      aria-label="Diagrama do fluxo. Clique numa peça ou numa seta para ler o detalhe."
      data-pronto={pronto}
    >
      <g ref={camadaSetas} />
      <g ref={camadaFormas} />

      {desenho.setas.map((s) => (
        <SetaClicavel key={s.id} seta={s} porId={porId} ativa={selecao?.tipo === "seta" && selecao.id === s.id} onSelect={onSelect} />
      ))}

      {desenho.pecas.map((p) => {
        const linhas = quebraTexto(p.label, maxChars(p), p.type === "condition" ? 3 : 3);
        const alturaLinha = 15;
        const bloco = linhas.length * alturaLinha;
        const topo = p.y + p.h / 2 - bloco / 2 + (p.icon ? 8 : 0);
        const ativa = selecao?.tipo === "peca" && selecao.id === p.id;
        return (
          <g
            key={p.id}
            onClick={() => onSelect({ tipo: "peca", id: p.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect({ tipo: "peca", id: p.id });
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${p.label}. Clique para ler o detalhe.`}
            style={{ cursor: "pointer", outline: "none" }}
          >
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="transparent" />
            {p.icon && (
              <text x={p.x + p.w / 2} y={topo - 4} textAnchor="middle" fontSize="19">
                {p.icon}
              </text>
            )}
            <text
              x={p.x + p.w / 2}
              y={topo + 10}
              textAnchor="middle"
              fontSize="14"
              fontWeight={ativa ? 700 : 600}
              fill="var(--text-primary)"
              style={{ pointerEvents: "none" }}
            >
              {linhas.map((l, i) => (
                <tspan key={i} x={p.x + p.w / 2} dy={i === 0 ? 0 : alturaLinha}>
                  {l}
                </tspan>
              ))}
            </text>
            {p.membros.length > 1 && (
              <text x={p.x + p.w - 10} y={p.y + 16} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                {p.membros.length} etapas
              </text>
            )}
            {p.id === inicioId && (
              <text x={p.x + p.w / 2} y={p.y - 6} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--accent)">
                ▶ começa aqui
              </text>
            )}
          </g>
        );
      })}
    </svg>
    </div>
  );
}

function SetaClicavel({
  seta,
  porId,
  ativa,
  onSelect,
}: {
  seta: Seta;
  porId: Map<string, Peca>;
  ativa: boolean;
  onSelect: (s: Selecao) => void;
}) {
  const a = porId.get(seta.source);
  const b = porId.get(seta.target);
  if (!a || !b) return null;
  const g = geometria(a, b, !!seta.isReturn);
  const texto = seta.label || (seta.isReturn ? "volta" : "");
  return (
    <g
      onClick={() => onSelect({ tipo: "seta", id: seta.id })}
      style={{ cursor: "pointer" }}
      role="button"
      aria-label={`Seta de ${a.label} para ${b.label}${seta.label ? `, ${seta.label}` : ""}`}
    >
      <path d={g.d} fill="none" stroke="transparent" strokeWidth={18} />
      {texto && (
        <text
          x={g.lx}
          y={g.ly}
          textAnchor="middle"
          fontSize="11"
          fontWeight={ativa ? 700 : 500}
          fill={seta.isReturn ? "var(--danger)" : "var(--text-secondary)"}
          stroke="var(--bg-primary)"
          strokeWidth={4}
          paintOrder="stroke"
        >
          {texto}
        </text>
      )}
    </g>
  );
}
