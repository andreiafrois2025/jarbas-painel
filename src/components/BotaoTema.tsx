"use client";

import { useEffect, useState } from "react";

// Tema: "sistema" (padrão, segue o aparelho), "claro" ou "escuro" (noturno).
// A escolha fica no localStorage; o script de app/layout.tsx a aplica antes da
// primeira pintura, aqui só trocamos e gravamos.
type Escolha = "sistema" | "claro" | "escuro";

const OPCOES: { id: Escolha; icone: string; rotulo: string }[] = [
  { id: "sistema", icone: "🖥️", rotulo: "Seguir o sistema" },
  { id: "claro", icone: "☀️", rotulo: "Tema claro" },
  { id: "escuro", icone: "🌙", rotulo: "Tema noturno" },
];

function lerEscolha(): Escolha {
  try {
    const t = window.localStorage.getItem("tema");
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

export default function BotaoTema() {
  const [escolha, setEscolha] = useState<Escolha>("sistema");
  useEffect(() => setEscolha(lerEscolha()), []);

  const escolher = (e: Escolha) => {
    setEscolha(e);
    try {
      if (e === "sistema") window.localStorage.removeItem("tema");
      else window.localStorage.setItem("tema", e);
    } catch { /* navegador bloqueou: vale só nesta aba */ }
    if (e === "sistema") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", e);
  };

  return (
    <div role="group" aria-label="Tema da tela"
      className="inline-flex rounded-full p-0.5 gap-0.5 bg-[var(--bg-tertiary)] shrink-0">
      {OPCOES.map((o) => (
        <button key={o.id} onClick={() => escolher(o.id)} aria-pressed={escolha === o.id}
          title={o.rotulo} aria-label={o.rotulo}
          className={`w-7 h-7 rounded-full text-sm leading-none cursor-pointer grid place-items-center transition-colors ${
            escolha === o.id ? "bg-[var(--bg-secondary)] shadow-sm" : "opacity-60 hover:opacity-100"
          }`}>
          {o.icone}
        </button>
      ))}
    </div>
  );
}
