"use client";

import { useEffect, useState } from "react";
import { squadFetch } from "@/lib/squadFetch";

// Endereço fixo pro atalho do celular: leva sempre pra sessão permanente do Claude Code
// (o link session_… muda a cada reinício do serviço claude-remoto).
export default function RemotoRoute() {
  const [erro, setErro] = useState("");
  useEffect(() => {
    squadFetch("/api/remoto")
      .then((r) => r.json())
      .then((d) => { if (d.url) window.location.replace(d.url); else setErro(d.erro || "Não achei a sessão."); })
      .catch(() => setErro("Não consegui falar com a VPS."));
  }, []);
  return (
    <div className="flex-1 grid place-items-center p-6 text-center text-[var(--text-secondary)]">
      {erro ? <p>⚠️ {erro}</p> : <p>Abrindo a conversa com o Jarbas no Claude…</p>}
    </div>
  );
}
