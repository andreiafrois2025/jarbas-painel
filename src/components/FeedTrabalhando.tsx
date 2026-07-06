"use client";

import { useState, useEffect } from "react";

// Feed "quem está trabalhando" — mesma fonte do StatusSemaforo (status.json na VPS).
// Mostra as últimas atividades reais (Mike preparou notícia, Donna enviou ao grupo, etc)
// tiradas de logs. Zero IA, zero tokens.
const STATUS_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/status.json";

interface Atividade {
  quando: string;
  quem: string;
  icone: string;
  texto: string;
}

function tempoRelativo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function FeedTrabalhando() {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${STATUS_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!alive) return;
        setAtividades(Array.isArray(data.atividades) ? data.atividades : []);
        setErro(false);
      } catch {
        if (alive) setErro(true);
      }
    };
    load();
    const id = setInterval(load, 90000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium mb-2">
        Quem está trabalhando (últimas 24h)
      </h2>
      {atividades === null && !erro && (
        <p className="text-xs text-[var(--text-muted)] italic py-2">Carregando…</p>
      )}
      {erro && (
        <p className="text-xs text-[var(--text-muted)] italic py-2">
          Não conseguiu ler o status da VPS.
        </p>
      )}
      {atividades && atividades.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] italic py-2">
          Nada rolando nas últimas 24h.
        </p>
      )}
      {atividades && atividades.length > 0 && (
        <ul className="space-y-1.5 max-h-56 overflow-auto pr-1">
          {atividades.slice(0, 8).map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-2"
            >
              <span className="text-base leading-none pt-0.5">{a.icone}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[var(--text-primary)]">
                  <strong className="font-semibold">{a.quem}</strong> {a.texto}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {tempoRelativo(a.quando)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
