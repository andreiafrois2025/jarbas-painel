"use client";

// Mapa do painel v2: as 5 portas do menu, as abas de cada uma e o que a busca
// do topo sabe encontrar nas páginas. Um lugar só: mudar um nome aqui muda no
// menu, nas abas e na busca.

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface Porta {
  id: string;
  path: string;
  icone: string;
  rotulo: string;
  title: string;
}

export const PORTAS: Porta[] = [
  { id: "conversa", path: "/conversa", icone: "💬", rotulo: "Conversa", title: "Conversa: fale com o Jarbas e veja o que espera por você" },
  { id: "areas", path: "/areas", icone: "🗂️", rotulo: "Áreas", title: "Áreas: Igam, conteúdo e casa" },
  { id: "maquina", path: "/maquina", icone: "⚙️", rotulo: "Máquina", title: "Máquina: mapa do que roda, squads e saúde" },
  { id: "equipe", path: "/equipe", icone: "🤖", rotulo: "Equipe", title: "Equipe: agentes, habilidades e escritório" },
  { id: "numeros", path: "/numeros", icone: "📈", rotulo: "Números", title: "Números: métricas e diário de bordo" },
];

export const PORTA_CONFIG: Porta = {
  id: "config", path: "/config", icone: "🔧", rotulo: "Ajustes", title: "Ajustes: sua conta e as integrações",
};

/** A rota atual pertence a esta porta? */
export function portaAtiva(pathname: string | null, p: Porta): boolean {
  return !!pathname && (pathname === p.path || pathname.startsWith(p.path + "/"));
}

export interface EntradaBusca {
  tipo: "página" | "fluxo" | "agente" | "habilidade";
  titulo: string;
  detalhe?: string;
  ir: string;
  /** texto extra que a busca também olha (sem aparecer) */
  chave?: string;
  pessoal?: boolean;
}

// Páginas e abas que já existem. "pessoal" some no modo Só Igam.
export const PAGINAS_BUSCA: EntradaBusca[] = [
  { tipo: "página", titulo: "Conversa", detalhe: "falar com o Jarbas", ir: "/conversa", chave: "chat mensagem hoje agenda" },
  { tipo: "página", titulo: "Áreas › Igam", detalhe: "licitação", ir: "/areas?aba=igam", chave: "licitacao processo etp tr contrato" },
  { tipo: "página", titulo: "Áreas › Conteúdo", detalhe: "notícias e radar", ir: "/areas?aba=conteudo&sub=noticias", chave: "noticias radar uau instagram aprovacao" },
  { tipo: "página", titulo: "Áreas › Conteúdo › Estúdio de reels", detalhe: "revisar a edição", ir: "/areas?aba=conteudo&sub=estudio", chave: "reels video corte legenda carrossel" },
  { tipo: "página", titulo: "Áreas › Casa", detalhe: "Luiz e finanças", ir: "/areas?aba=casa", chave: "luiz escola financas gastos cartao", pessoal: true },
  { tipo: "página", titulo: "Máquina › Mapa", detalhe: "o que roda sozinho", ir: "/maquina?aba=mapa", chave: "fluxos automacoes cron" },
  { tipo: "página", titulo: "Máquina › Squads", detalhe: "equipes de agentes", ir: "/maquina?aba=squads", chave: "squad opensquad" },
  { tipo: "página", titulo: "Máquina › Saúde", detalhe: "tudo funcionando?", ir: "/maquina?aba=saude", chave: "status semaforo vps integracoes" },
  { tipo: "página", titulo: "Equipe › Agentes", detalhe: "quem trabalha por você", ir: "/equipe?aba=agentes", chave: "colaboradores personas fichas" },
  { tipo: "página", titulo: "Equipe › Habilidades", detalhe: "skills, prompts e plugins", ir: "/equipe?aba=habilidades", chave: "biblioteca skills prompts plugins habilidades" },
  { tipo: "página", titulo: "Números", detalhe: "métricas e diário", ir: "/numeros", chave: "metricas diario de bordo produtividade" },
  { tipo: "página", titulo: "Ajustes", detalhe: "conta e atalhos", ir: "/config", chave: "config conta senha integracoes criacoes links notion drive" },
  { tipo: "página", titulo: "Ajustes › Organização da equipe", detalhe: "setores e atalhos rápidos (avançado)", ir: "/config", chave: "setores atalhos rapidos rh" },
  { tipo: "página", titulo: "Ajustes › Grafo", detalhe: "grafo de conhecimento (avançado)", ir: "/config", chave: "grafo conhecimento" },
];

/**
 * Aba atual lida do endereço (?aba=...). Trocar de aba troca só o ?aba, assim o
 * F5 e o "voltar" do navegador mantêm a aba. Precisa de <Suspense> em volta.
 */
export function useAbaUrl<T extends string>(validas: readonly T[], padrao: T, chave = "aba") {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const atual = sp.get(chave) as T | null;
  const aba: T = atual && validas.includes(atual) ? atual : padrao;
  const mudar = useCallback((v: T, extra?: Record<string, string>) => {
    const q = new URLSearchParams();
    q.set(chave, v);
    if (extra) for (const [k, val] of Object.entries(extra)) q.set(k, val);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [router, pathname, chave]);
  return [aba, mudar, sp] as const;
}
