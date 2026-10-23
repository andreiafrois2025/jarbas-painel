"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "@/lib/squadFetch";
import Mascote from "@/components/Mascote";

// Endereço fixo pro atalho do celular: leva sempre pra sessão permanente do Claude Code
// (o link session_… muda a cada reinício do serviço claude-remoto).
// Não redireciona sozinho (dá pra salvar esta página); com ?ir=1, o atalho da tela inicial vai direto (19/10).
export default function RemotoRoute() {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState("");
  // 23/10/2026: ?alvo=geoportal abre o Claude da VPS do Geoportal (Remote Control "Geoportal Igam")
  const [geo, setGeo] = useState(false);
  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get("alvo") === "geoportal";
    setGeo(g);
    squadFetch(`/api/remoto${g ? "?alvo=geoportal" : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.url) { setErro(d.erro || "Não achei a sessão."); return; }
        setUrl(d.url);
        // ?ir=1 (o atalho da tela inicial usa): vai direto, sem precisar tocar no botão
        if (new URLSearchParams(window.location.search).get("ir") === "1") window.location.replace(d.url);
      })
      .catch(() => setErro("Não consegui falar com a VPS."));
  }, []);
  return (
    <div className="flex-1 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <Mascote nome={geo ? "eric" : "jarbas"} emoji={geo ? "🗺️" : "⚡"} tamanho={96} grande />
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">{geo ? "Claude do Geoportal" : "Conversa avançada"}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{geo ? "Abre o Claude Code da VPS do Geoportal, o que conhece e mexe no Geoportal." : "Abre o Jarbas no Claude Code, a sessão que mexe no sistema."}</p>
        {erro ? <p className="text-sm">⚠️ {erro}</p> : (
          <a href={url || undefined} target="_blank" rel="noopener" aria-disabled={!url}
            className={`w-full rounded-2xl px-6 py-4 text-base font-extrabold no-underline text-[var(--on-ac)] bg-[var(--ac)] ${url ? "" : "opacity-50 pointer-events-none"}`}>
            {url ? (geo ? "🗺️ Abrir o Geoportal Igam" : "🧠 Abrir o Jarbas VPS") : "Procurando a sessão…"}
          </a>
        )}
        {geo && <p className="text-xs text-[var(--text-secondary)]">Abriu uma sessão encerrada? A VPS de lá pode ter reiniciado. Abra <a href="https://claude.ai/code" target="_blank" rel="noopener" className="text-[var(--accent)] underline">a lista do claude.ai/code</a> e toque em “Geoportal Igam (permanente)”.</p>}
        <p className="text-xs text-[var(--text-muted)]">Para ter um ícone: no Safari, compartilhar → Adicionar à Tela de Início (desligue “Abrir como App Web”).</p>
      </div>
    </div>
  );
}
