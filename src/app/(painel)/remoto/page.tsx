"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "@/lib/squadFetch";
import Mascote from "@/components/Mascote";

// Endereço fixo pro atalho do celular: leva sempre pra sessão permanente do Claude Code
// (o link session_… muda a cada reinício do serviço claude-remoto).
// Não redireciona sozinho: assim dá pra salvar ESTA página na tela inicial (19/10).
export default function RemotoRoute() {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    squadFetch("/api/remoto")
      .then((r) => r.json())
      .then((d) => { if (d.url) setUrl(d.url); else setErro(d.erro || "Não achei a sessão."); })
      .catch(() => setErro("Não consegui falar com a VPS."));
  }, []);
  return (
    <div className="flex-1 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <Mascote nome="jarbas" emoji="⚡" tamanho={96} grande />
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">Conversa avançada</h1>
        <p className="text-sm text-[var(--text-secondary)]">Abre o Jarbas no Claude Code, a sessão que mexe no sistema.</p>
        {erro ? <p className="text-sm">⚠️ {erro}</p> : (
          <a href={url || undefined} target="_blank" rel="noopener" aria-disabled={!url}
            className={`w-full rounded-2xl px-6 py-4 text-base font-extrabold no-underline text-[var(--on-ac)] bg-[var(--ac)] ${url ? "" : "opacity-50 pointer-events-none"}`}>
            {url ? "🧠 Abrir o Jarbas VPS" : "Procurando a sessão…"}
          </a>
        )}
        <p className="text-xs text-[var(--text-muted)]">Para ter um ícone: no Safari, compartilhar → Adicionar à Tela de Início (desligue “Abrir como App Web”).</p>
      </div>
    </div>
  );
}
