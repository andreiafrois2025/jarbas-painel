"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Abas } from "./ui";
import { usePainel } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";
import FazerAgora from "./areas/FazerAgora";
import ConteudoAba, { SUBS_CONTEUDO, type SubConteudo } from "./areas/ConteudoAba";
import CasaAba from "./areas/CasaAba";

// Cada área pesada só é baixada quando a aba é aberta.
const carregando = () => (
  <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">abrindo…</div>
);
const LicitacaoPage = dynamic(() => import("./LicitacaoPage"), { loading: carregando, ssr: false });
const PessoalPage = dynamic(() => import("./PessoalPage"), { loading: carregando, ssr: false });

type Aba = "igam" | "conteudo" | "casa";

// Endereços antigos (?sub=noticias / ?sub=estudio) continuam funcionando.
const SUB_ANTIGO: Record<string, SubConteudo> = { noticias: "radar", estudio: "reels" };

// Áreas: onde o trabalho acontece. Casa (e tudo que é pessoal) some no modo Só Igam.
export default function AreasPage() {
  const { servidora } = usePainel();
  const [abaUrl, mudar, sp] = useAbaUrl<Aba>(["igam", "conteudo", "casa"], "igam");
  const aba: Aba = servidora && abaUrl === "casa" ? "igam" : abaUrl;
  const subBruto = sp.get("sub") || "";
  const subConteudo: SubConteudo = SUBS_CONTEUDO.some((s) => s.id === subBruto) ? (subBruto as SubConteudo) : SUB_ANTIGO[subBruto] || "esteira";
  const financas = aba === "casa" && subBruto === "financas";
  // "Nova licitação" da faixa Fazer agora: cada clique muda o número e a página abre a gaveta
  const [pedidoNovo, setPedidoNovo] = useState(0);

  const opcoes: { id: Aba; rotulo: string }[] = [
    { id: "igam", rotulo: "🏛️ Igam" },
    { id: "conteudo", rotulo: "✨ Conteúdo" },
    ...(servidora ? [] : [{ id: "casa" as Aba, rotulo: "🏠 Casa" }]),
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Áreas" valor={aba} onMuda={(v) => mudar(v)} opcoes={opcoes} />
      {!financas && <FazerAgora area={aba} onNovoProcesso={() => setPedidoNovo((n) => n + 1)} />}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {aba === "igam" && <LicitacaoPage pedidoNovo={pedidoNovo} />}
        {aba === "conteudo" && <ConteudoAba sub={subConteudo} onSub={(s) => mudar("conteudo", { sub: s })} />}
        {aba === "casa" && (financas ? <PessoalPage abaInicial="financas" voltar={() => mudar("casa")} /> : <CasaAba />)}
      </div>
    </div>
  );
}
