"use client";

// Camadas leves de animação por cima do prédio: planetas, telinhas, luzes, câmera,
// telas do laboratório, servidor, relógio, café. Sem vídeo e sem IA: só CSS/SVG.
// Só transform e opacity são animados; com "reduzir movimento" tudo fica parado.

import { memo, useEffect, useState } from "react";
import { AMBIENTE } from "@/lib/escritorio-ambiente";

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const cq = (v: number) => `${(v * 100).toFixed(3)}cqw`;
const TZ = "America/Sao_Paulo";

function horaBrasilia(): { h: number; m: number; s: number } {
  const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: TZ }).formatToParts(new Date());
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { h: n("hour"), m: n("minute"), s: n("second") };
}

function Relogio({ x, y, r }: { x: number; y: number; r: number }) {
  const [t, setT] = useState<{ h: number; m: number } | null>(null);
  useEffect(() => {
    const f = () => { const { h, m } = horaBrasilia(); setT({ h, m }); };
    f(); const id = setInterval(f, 15_000);
    return () => clearInterval(id);
  }, []);
  if (!t) return null;
  const ah = ((t.h % 12) + t.m / 60) * 30, am = t.m * 6;
  return (
    <svg className="esc-relogio" viewBox="-50 -50 100 100" style={{ left: pct(x), top: pct(y), width: cq(r * 2) }} aria-hidden>
      <circle r="47" fill="#FFF8EA" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-41" x2="0" y2={i % 3 === 0 ? -34 : -37} stroke="#5A3A1E" strokeWidth={i % 3 === 0 ? 3 : 1.6} transform={`rotate(${i * 30})`} />)}
      <line x1="0" y1="4" x2="0" y2="-24" stroke="#2B1A0C" strokeWidth="5" strokeLinecap="round" transform={`rotate(${ah})`} />
      <line x1="0" y1="6" x2="0" y2="-35" stroke="#2B1A0C" strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${am})`} />
      <circle r="3.4" fill="#A0583C" />
    </svg>
  );
}

function Ambiente({ cafe }: { cafe: { x: number; y: number }[] }) {
  const A = AMBIENTE;
  const [flash, setFlash] = useState(false);
  const [lupa, setLupa] = useState(false);
  const [vapor, setVapor] = useState(false);

  // flash da câmera a cada 20–40 s, brilho da lupa e vapor da máquina de vez em quando
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const agenda = (set: (v: boolean) => void, min: number, max: number, dur: number) => {
      const volta = () => {
        timers.push(setTimeout(() => {
          if (!document.hidden) { set(true); timers.push(setTimeout(() => set(false), dur)); }
          volta();
        }, min + Math.random() * (max - min)));
      };
      volta();
    };
    agenda(setFlash, 20_000, 40_000, 380);
    agenda(setLupa, 9_000, 18_000, 1400);
    agenda(setVapor, 12_000, 25_000, 5200);
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="esc-amb" aria-hidden>
      {A.orbitas.map((o, i) => (
        <div key={"o" + i} className="esc-orb" style={{ left: pct(o.x), top: pct(o.y), width: cq(o.rx * 2), height: cq(o.rx * 2), ["--ry" as string]: String(o.ry / o.rx) }}>
          <div className="esc-orb-giro">
            {o.planetas.map((p, j) => (
              <i key={j} style={{ width: cq(p.r * 2), height: cq(p.r * 2), background: p.cor, animationDuration: `${p.dur}s`, animationDelay: `-${p.fase * p.dur}s` }} className="esc-planeta" />
            ))}
          </div>
        </div>
      ))}
      {A.telinhas.map((t, i) => <i key={"t" + i} className="esc-telinha" style={{ left: pct(t.x), top: pct(t.y), width: cq(t.w), height: cq(t.h), animationDelay: `${t.delay ?? 0}s` }} />)}
      {A.brilhos.map((b, i) => (
        <i key={"b" + i} className={`esc-brilho ${b.liga ? "liga" : ""}`} style={{ left: pct(b.x), top: pct(b.y), width: cq(b.r * 2), height: cq(b.r * 2), animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ["--cor" as string]: b.cor ?? "255,210,120" }} />
      ))}
      {A.ring && <i className="esc-ring" style={{ left: pct(A.ring.x), top: pct(A.ring.y), width: cq(A.ring.r * 2), height: cq(A.ring.r * 2) }} />}
      {A.flash && <i className={`esc-flash ${flash ? "on" : ""}`} style={{ left: pct(A.flash.x), top: pct(A.flash.y), width: cq(A.flash.r * 2), height: cq(A.flash.r * 2) }} />}
      {A.telasLab.map((t, i) => (
        <div key={"l" + i} className="esc-tela" style={{ left: pct(t.x), top: pct(t.y), width: cq(t.w), height: cq(t.h), ["--d" as string]: `${(t.delay ?? 0) + i * 1.7}s` }}>
          <div className="esc-tela-c esc-tela-g">{[0, 1, 2, 3, 4].map((k) => <b key={k} style={{ animationDelay: `${k * 0.35}s` }} />)}</div>
          <div className="esc-tela-c esc-tela-k"><div /></div>
          <div className="esc-tela-c esc-tela-n"><svg viewBox="0 0 40 20" preserveAspectRatio="none"><polyline points="0,16 8,12 14,14 22,6 30,9 40,2" fill="none" stroke="#6FF3FF" strokeWidth="1.6" /></svg></div>
        </div>
      ))}
      {A.leds.map((l, i) => (
        <div key={"d" + i} className="esc-leds" style={{ left: pct(l.x), top: pct(l.y), width: cq(l.w) }}>
          {Array.from({ length: l.n }, (_, k) => <i key={k} style={{ top: cq(k * l.dy), animationDelay: `${((i * 7 + k * 5) % 11) * 0.23}s`, animationDuration: `${1.1 + ((k * 3 + i) % 5) * 0.37}s` }} />)}
        </div>
      ))}
      {A.lupa && <i className={`esc-lupa ${lupa ? "on" : ""}`} style={{ left: pct(A.lupa.x), top: pct(A.lupa.y), width: cq(A.lupa.r * 2), height: cq(A.lupa.r * 2) }} />}
      {A.relogio && <Relogio {...A.relogio} />}
      {A.espresso && <Fumaca x={A.espresso.x} y={A.espresso.y} ligada={vapor} />}
      {cafe.map((c, i) => <Fumaca key={"c" + i} x={c.x + A.xicara.dx} y={c.y + A.xicara.dy} ligada />)}
      {A.poeira && (
        <div className="esc-poeira" style={{ left: pct(A.poeira.x), top: pct(A.poeira.y), width: cq(A.poeira.w), height: cq(A.poeira.h) }}>
          {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `-${(i * 1.3) % 9}s`, animationDuration: `${8 + (i % 4) * 2}s` }} />)}
        </div>
      )}
    </div>
  );
}

function Fumaca({ x, y, ligada }: { x: number; y: number; ligada: boolean }) {
  if (!ligada) return null;
  return (
    <div className="esc-fumaca" style={{ left: pct(x), top: pct(y) }}>
      {[0, 1, 2].map((k) => <i key={k} style={{ animationDelay: `${k * 1.1}s` }} />)}
    </div>
  );
}

export default memo(Ambiente);
