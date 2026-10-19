"use client";

import { useEffect } from "react";
import { usePainel } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";
import HRPage from "./HRPage";
import BibliotecaPage from "./BibliotecaPage";
import { CartaoConta, CartaoAparencia, CartaoAvisos, CartaoModoObra, CartaoAppCelular } from "./ajustes/Cartoes";

// Ajustes (19/10/2026, mock aprovado "ajustes-novo"): largura total, com um menu de
// seções à esquerda (no celular vira uma faixa de abas no topo).
//  - Conta, Aparência, Avisos, Modo obra e App no celular são cartões na mesma tela;
//    clicar no menu leva até o cartão.
//  - Atalhos, Organização da equipe e Grafo são telas inteiras, como já eram.

type Secao = "conta" | "aparencia" | "avisos" | "obra" | "celular" | "atalhos" | "organizacao" | "grafo";

const SECOES: { id: Secao; icone: string; rotulo: string }[] = [
  { id: "conta", icone: "👤", rotulo: "Conta" },
  { id: "aparencia", icone: "🎨", rotulo: "Aparência" },
  { id: "avisos", icone: "🔔", rotulo: "Avisos" },
  { id: "obra", icone: "🔨", rotulo: "Modo obra" },
  { id: "celular", icone: "📱", rotulo: "App no celular" },
  { id: "atalhos", icone: "🔗", rotulo: "Atalhos" },
  { id: "organizacao", icone: "🗂️", rotulo: "Organização da equipe" },
  { id: "grafo", icone: "🕸️", rotulo: "Grafo (avançado)" },
];
const DOS_CARTOES: Secao[] = ["conta", "aparencia", "avisos", "obra", "celular"];

export default function ConfigPage() {
  const { reload } = usePainel();
  const [secao, mudar] = useAbaUrl<Secao>(SECOES.map((s) => s.id), "conta", "s");
  const nosCartoes = DOS_CARTOES.includes(secao);

  // Vindo de outra seção ou de um link (?s=avisos): leva até o cartão certo.
  useEffect(() => {
    if (!nosCartoes) return;
    const el = document.getElementById(`sec-${secao}`);
    if (el && secao !== "conta") el.scrollIntoView({ behavior: "smooth", block: "start" });
    else document.getElementById("ajustes-conteudo")?.scrollTo({ top: 0 });
  }, [secao, nosCartoes]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-5">
        <h1 className="fonte-maquina text-[30px] leading-none text-[var(--text-primary)]">Ajustes</h1>
      </div>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 md:gap-6 p-4 md:p-6">
        <nav aria-label="Seções de Ajustes"
          className="shrink-0 md:w-72 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0">
          {SECOES.map((s) => (
            <button key={s.id} onClick={() => mudar(s.id)} aria-current={secao === s.id ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold text-left whitespace-nowrap cursor-pointer transition-colors ${
                secao === s.id ? "bg-[var(--accent-soft)] text-[var(--ac)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              }`}>
              <span aria-hidden>{s.icone}</span>{s.rotulo}
            </button>
          ))}
        </nav>

        <div id="ajustes-conteudo" className="flex-1 min-w-0 min-h-0 overflow-y-auto flex flex-col">
          {nosCartoes ? (
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 items-start content-start pb-6">
              <CartaoConta id="sec-conta" />
              <CartaoAparencia id="sec-aparencia" />
              <CartaoAvisos id="sec-avisos" />
              <CartaoModoObra id="sec-obra" />
              <CartaoAppCelular id="sec-celular" />
            </div>
          ) : secao === "atalhos" ? (
            <BibliotecaPage modo="atalhos" />
          ) : secao === "organizacao" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <p className="text-xs text-[var(--text-muted)]">
                Setores (as áreas onde cada agente atua) e os atalhos rápidos da tela Hoje. Avançado: antes ficavam dentro de “Gestão de RH”.
              </p>
              <div className="flex-1 min-h-0"><HRPage modo="organizacao" onDataChanged={reload} /></div>
            </div>
          ) : (
            <BibliotecaPage modo="grafo" />
          )}
        </div>
      </div>
    </div>
  );
}
