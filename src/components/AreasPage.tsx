"use client";

import dynamic from "next/dynamic";
import { Abas } from "./ui";
import { usePainel } from "@/lib/painel-context";
import { useAbaUrl } from "@/lib/navegacao";
import NoticiasLista from "./NoticiasLista";

// Cada área pesada só é baixada quando a aba é aberta.
const carregando = () => (
  <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">abrindo…</div>
);
const LicitacaoPage = dynamic(() => import("./LicitacaoPage"), { loading: carregando, ssr: false });
const EstudioPage = dynamic(() => import("./EstudioPage"), { loading: carregando, ssr: false });
const PessoalPage = dynamic(() => import("./PessoalPage"), { loading: carregando, ssr: false });

type Aba = "igam" | "conteudo" | "casa";
type Sub = "noticias" | "estudio";

// Áreas: onde o trabalho acontece. Casa (e tudo que é pessoal) some no modo Só Igam.
export default function AreasPage() {
  const { servidora } = usePainel();
  const [abaUrl, mudar, sp] = useAbaUrl<Aba>(["igam", "conteudo", "casa"], "igam");
  const aba: Aba = servidora && abaUrl === "casa" ? "igam" : abaUrl;
  const sub: Sub = sp.get("sub") === "estudio" ? "estudio" : "noticias";

  const opcoes: { id: Aba; rotulo: string }[] = [
    { id: "igam", rotulo: "🏛️ Igam" },
    { id: "conteudo", rotulo: "✨ Conteúdo" },
    ...(servidora ? [] : [{ id: "casa" as Aba, rotulo: "🏠 Casa" }]),
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Abas titulo="Áreas" valor={aba} onMuda={(v) => mudar(v)} opcoes={opcoes} />
      {aba === "conteudo" && (
        <div className="shrink-0 flex gap-2 px-3 md:px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          {([["noticias", "📰 Notícias e radar"], ["estudio", "🎬 Estúdio de reels"]] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => mudar("conteudo", { sub: id })} aria-pressed={sub === id}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
                sub === id ? "bg-[var(--ac)] text-[var(--on-ac)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}>{rotulo}</button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {aba === "igam" && <LicitacaoPage />}
        {aba === "conteudo" && (sub === "estudio" ? <EstudioPage /> : <NoticiasLista />)}
        {aba === "casa" && <PessoalPage />}
      </div>
    </div>
  );
}
