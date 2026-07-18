"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Semáforo de saúde do ecossistema. Lê o status.json que a VPS publica no
// Supabase Storage a cada 5 min (gerado por /root/status-saude.py).
const STATUS_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/status.json";

interface StatusSaude {
  gerado_em: string;
  nivel: "verde" | "amarelo" | "vermelho";
  problemas: string[];
  disco_pct: number;
}

const NIVEL_UI = {
  verde: { dot: "🟢", label: "Tudo funcionando" },
  amarelo: { dot: "🟡", label: "Atenção" },
  vermelho: { dot: "🔴", label: "Algo caiu" },
} as const;

export default function StatusSemaforo() {
  const [status, setStatus] = useState<StatusSaude | null>(null);
  const [stale, setStale] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${STATUS_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: StatusSaude = await res.json();
        if (!alive) return;
        setStatus(data);
        // Se a VPS parou de publicar há mais de 20 min, o próprio silêncio é alerta
        const ageMin = (Date.now() - new Date(data.gerado_em).getTime()) / 60000;
        setStale(ageMin > 20);
      } catch {
        if (alive) setStale(true);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!status && !stale) return null;

  const nivel = stale ? "vermelho" : status!.nivel;
  const ui = NIVEL_UI[nivel];
  const problemas = stale
    ? ["A VPS parou de publicar o status (pode estar fora do ar)"]
    : status!.problemas;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs md:text-sm hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        title={ui.label}
      >
        <span>{ui.dot}</span>
        <span className="hidden md:inline text-[var(--text-secondary)]">{ui.label}</span>
      </button>
      {open && createPortal(
        // PORTAL no <body> (18/07): o header tem backdrop-blur, que no CSS faz
        // até um "fixed" ficar preso (e cortado) dentro dele. Renderizando fora
        // da barra, o popup flutua por cima de tudo de verdade.
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setOpen(false)} />
          <div className="fixed right-3 top-16 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl p-4 z-[100] text-sm">
          <div className="font-semibold mb-2 flex items-center gap-2">
            {ui.dot} Saúde do ecossistema
          </div>
          {problemas.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              Donna, crons, fila e disco: tudo em ordem.
            </p>
          ) : (
            <ul className="space-y-1.5 text-[var(--text-secondary)]">
              {problemas.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          )}
          {status && (
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              Atualizado {new Date(status.gerado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · disco {status.disco_pct}%
            </p>
          )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
