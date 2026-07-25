"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Collaborator, Assignment, QuickLink } from "@/lib/types";
import {
  getCategories,
  signOut,
  getCollaborators,
  getAssignments,
  getQuickLinks,
  addQuickLink,
} from "@/lib/storage";
import type { Category as CategoryType } from "@/lib/types";
import JobsMonitor from "./JobsMonitor";
import { PainelContext } from "@/lib/painel-context";
import { ProvedorUI } from "./ui";
import type { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
  children: ReactNode;
}

// 25/07/2026 (F4.6): o menu ganhou NOME. Antes eram 7 emojis sem legenda, e o
// nome só aparecia parando o mouse em cima por um segundo — o que no celular,
// onde a barra vai pra baixo, é impossível. Funcionava pra ela porque ela
// construiu; não funcionaria pra mais ninguém, nem pra ela daqui a 3 meses.
const NAV_ITEMS: { path: string; icon: string; nome: string; title: string; match: string }[] = [
  { path: "/inicio", icon: "🏠", nome: "Hoje", title: "Hoje — agenda, tarefas e a caixa de aprovação", match: "/inicio" },
  { path: "/equipe", icon: "👥", nome: "Equipe", title: "Equipe — colaboradores, setores e assistentes", match: "/equipe" },
  { path: "/producao/automacoes", icon: "🚀", nome: "Produção", title: "Produção — squads, automações, fluxos e estúdio", match: "/producao" },
  { path: "/saude", icon: "🩺", nome: "Saúde", title: "Saúde — do sistema e das integrações", match: "/saude" },
  { path: "/pessoal", icon: "🤎", nome: "Pessoal", title: "Pessoal — escola do Luiz e finanças", match: "/pessoal" },
  { path: "/metricas", icon: "📊", nome: "Métricas", title: "Métricas — números e diário de bordo", match: "/metricas" },
  { path: "/biblioteca", icon: "📚", nome: "Biblioteca", title: "Biblioteca — criações, skills, prompts e grafo", match: "/biblioteca" },
  { path: "/config", icon: "⚙️", nome: "Config", title: "Config — sua conta", match: "/config" },
];

// Shell do painel: sidebar + JobsMonitor + dados compartilhados.
// Vive no layout de rota, então navegar entre páginas não recarrega os dados.
export default function Dashboard({ session, children }: DashboardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);

  // Lembra se ela deixou o menu aberto — é preferência, não estado de tela.
  useEffect(() => {
    setAberto(window.localStorage.getItem("menuAberto") === "1");
  }, []);
  useEffect(() => {
    window.localStorage.setItem("menuAberto", aberto ? "1" : "0");
  }, [aberto]);

  const loadData = useCallback(async () => {
    try {
      // 25/07/2026 (F7): saíram daqui duas chamadas que rodavam a CADA abertura
      // do painel — seedDefaultData e migrateFromAgents. Eram a migração de maio
      // (quando "agents" virou "collaborators"), que já terminou: as duas
      // perguntavam ao banco "já migrou?" e ouviam "já", desde então.
      const [categoriesData, collabData, assignData, qlData] = await Promise.all([
        getCategories(),
        getCollaborators(),
        getAssignments(),
        getQuickLinks(),
      ]);
      setCategories(categoriesData);
      setCollaborators(collabData);
      setAssignments(assignData);
      setQuickLinks(qlData);

      // Auto-migrar JARBAS para quick_links se não existir
      try {
        if (qlData.length === 0 || !qlData.some(ql => ql.label === "JARBAS")) {
          await addQuickLink({ label: "JARBAS", url: "https://t.me/jarbas_af_bot", icon: "⚡", order: 0 });
          const updatedQL = await getQuickLinks();
          setQuickLinks(updatedQL);
        }
      } catch (qlErr) {
        console.warn("Aviso: não foi possível criar quick-link JARBAS:", qlErr);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [session.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dashboard-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">⚡</span>
          <span className="text-[var(--text-secondary)]">Carregando escritório...</span>
        </div>
      </div>
    );
  }

  return (
    <PainelContext.Provider value={{ collaborators, assignments, categories, quickLinks, reload: loadData }}>
      <ProvedorUI>
      <div className="h-screen flex flex-col md:flex-row dashboard-bg">
        {/* ===== SIDEBAR ===== */}
        <aside
          className={`order-2 md:order-none w-full ${aberto ? "md:w-52" : "md:w-16"} bg-[var(--bg-secondary)]/95 backdrop-blur-sm border-t md:border-t-0 md:border-r border-[var(--border)] flex md:flex-col items-center md:items-stretch justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-1 shrink-0 transition-[width] duration-150`}
          aria-label="Menu principal"
        >
          <button
            onClick={() => setAberto(!aberto)}
            className="hidden md:flex items-center gap-2 px-3 mb-3 text-2xl cursor-pointer"
            title={aberto ? "Encolher o menu" : "Expandir o menu"}
            aria-label={aberto ? "Encolher o menu" : "Expandir o menu"}
          >
            <span>⚡</span>
            {aberto && <span className="text-sm font-semibold text-[var(--text-primary)]">Jarbas</span>}
          </button>
          {NAV_ITEMS.map((item) => {
            const ativo = pathname?.startsWith(item.match);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex md:w-full flex-col md:flex-row items-center md:gap-2.5 md:px-3 py-1.5 md:py-2 rounded-xl cursor-pointer transition-all ${
                  ativo ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-70 hover:opacity-100"
                }`}
                title={item.title}
                aria-current={ativo ? "page" : undefined}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {/* No celular o nome fica embaixo do ícone, pequeno: lá não
                    existe parar o mouse em cima pra descobrir o que é. */}
                <span className={`text-[10px] md:text-sm md:font-medium ${aberto ? "md:inline" : "md:hidden"} ${ativo ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {item.nome}
                </span>
              </button>
            );
          })}
          <div className="hidden md:block flex-1" />
          <button
            onClick={handleLogout}
            className="flex md:w-full flex-col md:flex-row items-center md:gap-2.5 md:px-3 py-1.5 md:py-2 rounded-xl cursor-pointer opacity-70 hover:opacity-100 hover:bg-[var(--bg-tertiary)]"
            title="Sair da conta"
          >
            <span className="text-lg leading-none">🚪</span>
            <span className={`text-[10px] md:text-sm ${aberto ? "md:inline" : "md:hidden"} text-[var(--text-secondary)]`}>Sair</span>
          </button>
        </aside>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        <main className="flex-1 flex flex-col overflow-hidden order-1 md:order-none min-h-0">
          <JobsMonitor />
          {children}
        </main>
      </div>
      </ProvedorUI>
    </PainelContext.Provider>
  );
}
