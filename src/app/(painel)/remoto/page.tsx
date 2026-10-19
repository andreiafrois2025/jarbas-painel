"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "@/lib/squadFetch";
import Mascote from "@/components/Mascote";

// Endereço fixo pro atalho do celular: leva sempre pra sessão permanente do Claude Code
// (o link session_… muda a cada reinício do serviço claude-remoto).
// Não redireciona sozinho (dá pra salvar esta página); com ?ir=1, o atalho da tela inicial vai direto (19/10).
// Dentro do painel instalado como app no iPhone, o link abria numa "página dentro do app" (sem anexar foto).
// x-safari-https:// manda o iPhone abrir no Safari de verdade (iOS 17+); fora do app, o link normal.
function paraSafari(url: string) {
  if (typeof window === "undefined") return url;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const app = (navigator as Navigator & { standalone?: boolean }).standalone || window.matchMedia("(display-mode: standalone)").matches;
  return ios && app && url.startsWith("https://") ? "x-safari-" + url : url;
}

export default function RemotoRoute() {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    squadFetch("/api/remoto")
      .then((r) => r.json())
      .then((d) => {
        if (!d.url) { setErro(d.erro || "Não achei a sessão."); return; }
        setUrl(d.url);
        // ?ir=1 (o atalho da tela inicial usa): vai direto, sem precisar tocar no botão
        if (new URLSearchParams(window.location.search).get("ir") === "1") window.location.href = paraSafari(d.url);
      })
      .catch(() => setErro("Não consegui falar com a VPS."));
  }, []);
  return (
    <div className="flex-1 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <Mascote nome="jarbas" emoji="⚡" tamanho={96} grande />
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">Conversa avançada</h1>
        <p className="text-sm text-[var(--text-secondary)]">Abre o Jarbas no Claude Code, a sessão que mexe no sistema.</p>
        {erro ? <p className="text-sm">⚠️ {erro}</p> : (
          <a href={url ? paraSafari(url) : undefined} target="_blank" rel="noopener" aria-disabled={!url}
            className={`w-full rounded-2xl px-6 py-4 text-base font-extrabold no-underline text-[var(--on-ac)] bg-[var(--ac)] ${url ? "" : "opacity-50 pointer-events-none"}`}>
            {url ? "🧠 Abrir o Jarbas VPS" : "Procurando a sessão…"}
          </a>
        )}
        <p className="text-xs text-[var(--text-muted)]">Para ter um ícone: no Safari, compartilhar → Adicionar à Tela de Início (desligue “Abrir como App Web”).</p>
      </div>
    </div>
  );
}
