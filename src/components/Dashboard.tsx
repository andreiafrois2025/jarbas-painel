"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Collaborator, Assignment, QuickLink } from "@/lib/types";
import {
  getCategories,
  signOut,
  seedDefaultData,
  getCollaborators,
  getAssignments,
  getQuickLinks,
  addQuickLink,
  migrateFromAgents,
} from "@/lib/storage";
import type { Category as CategoryType } from "@/lib/types";
import JobsMonitor from "./JobsMonitor";
import { PainelContext } from "@/lib/painel-context";
import type { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
  children: ReactNode;
}

const NAV_ITEMS: { path: string; icon: string; title: string; match: string }[] = [
  { path: "/inicio", icon: "🏠", title: "Início", match: "/inicio" },
  { path: "/equipe", icon: "👥", title: "Equipe", match: "/equipe" },
  { path: "/producao/squads", icon: "🚀", title: "Produção (Squads + Fluxos)", match: "/producao" },
  { path: "/metricas", icon: "📊", title: "Métricas", match: "/metricas" },
  { path: "/config", icon: "⚙️", title: "Config (Integrações)", match: "/config" },
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

  const loadData = useCallback(async () => {
    try {
      if (session.user?.id) {
        await seedDefaultData(session.user.id);
        await migrateFromAgents(session.user.id);
      }
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
      <div className="h-screen flex flex-col md:flex-row dashboard-bg">
        {/* ===== SIDEBAR ===== */}
        <aside className="order-2 md:order-none w-full md:w-16 bg-[var(--bg-secondary)]/95 backdrop-blur-sm border-t md:border-t-0 md:border-r border-[var(--border)] flex md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-2 shrink-0">
          <div className="hidden md:block text-2xl mb-4 cursor-default" title="Jarbas">⚡</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                pathname?.startsWith(item.match)
                  ? "bg-[var(--accent-soft)]"
                  : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
              }`}
              title={item.title}
            >
              {item.icon}
            </button>
          ))}
          <div className="hidden md:block flex-1" />
          <button onClick={handleLogout} className="w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100" title="Sair">🚪</button>
        </aside>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        <main className="flex-1 flex flex-col overflow-hidden order-1 md:order-none min-h-0">
          <JobsMonitor />
          {children}
        </main>
      </div>
    </PainelContext.Provider>
  );
}
