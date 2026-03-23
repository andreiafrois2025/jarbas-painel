"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Agent } from "@/lib/types";
import {
  getAgents,
  addAgent,
  updateAgent,
  deleteAgent,
  getExecutions,
  getTodayExecutionCount,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  signOut,
  seedDefaultData,
} from "@/lib/storage";
import type { Execution, Category as CategoryType } from "@/lib/types";
import DeskCard from "./DeskCard";
import AgentModal from "./AgentModal";
import CategoryModal from "./CategoryModal";
import FlowsPage from "./FlowsPage";
import MetricsPage from "./MetricsPage";
import type { Session } from "@supabase/supabase-js";

// =============================================
// Dashboard Principal — Layout Híbrido
// Interface moderna (sidebar, header, controles)
// + Janela Win98 embutida (área dos agentes/escritório)
// =============================================

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [activeTab, setActiveTab] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryObj, setEditingCategoryObj] = useState<CategoryType | null>(null);
  const [currentPage, setCurrentPage] = useState<"office" | "flows" | "metrics">("office");

  // Carregar dados do Supabase
  const loadData = useCallback(async () => {
    try {
      if (session.user?.id) {
        await seedDefaultData(session.user.id);
      }
      const [agentsData, categoriesData, executionsData, todayData] =
        await Promise.all([
          getAgents(),
          getCategories(),
          getExecutions(),
          getTodayExecutionCount(),
        ]);
      setAgents(agentsData);
      setCategories(categoriesData);
      setExecutions(executionsData);
      setTodayCount(todayData);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [session.user?.id]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Filtrar agentes por aba e busca
  const filteredAgents = useMemo(() => {
    let result = agents;
    if (activeTab !== "Todos") {
      result = result.filter((a) => a.category === activeTab);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [agents, activeTab, search]);

  // Nomes de categorias únicos (para o AgentModal)
  const availableCategories = useMemo(() => {
    const catNames = categories.map((c) => c.name);
    const agentCats = [...new Set(agents.map((a) => a.category))];
    return [...new Set([...catNames, ...agentCats])];
  }, [categories, agents]);

  // Categorias únicas para as abas (deduplificado por nome)
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [categories]);

  const handleSave = async (data: {
    agent_name: string;
    name: string;
    link: string;
    category: string;
    type: "manual" | "automatic";
    icon: string;
    description: string;
    gender: "male" | "female";
  }) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, data);
      } else {
        await addAgent(data);
      }
      await loadData();
      setShowModal(false);
      setEditingAgent(null);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este agente?")) {
      try {
        await deleteAgent(id);
        await loadData();
      } catch (err) {
        console.error("Erro ao excluir:", err);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  // ---- Handlers do CategoryModal ----
  const handleAddCategory = async (name: string) => {
    await addCategory(name);
    await loadData();
  };

  const handleRenameCategory = async (id: string, newName: string, oldName: string) => {
    await updateCategory(id, newName);
    const agentsToUpdate = agents.filter((a) => a.category === oldName);
    await Promise.all(agentsToUpdate.map((a) => updateAgent(a.id, { category: newName })));
    if (activeTab === oldName) setActiveTab(newName);
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const agentsInCat = agents.filter((a) => a.category === cat.name);
    if (agentsInCat.length > 0) {
      const fallback = categories.find((c) => c.id !== id)?.name || "Trabalho";
      await Promise.all(agentsInCat.map((a) => updateAgent(a.id, { category: fallback })));
    }
    await deleteCategory(id);
    if (activeTab === cat.name) setActiveTab("Todos");
    await loadData();
  };

  const handleMoveAgent = async (agentId: string, newCategory: string) => {
    await updateAgent(agentId, { category: newCategory });
    await loadData();
  };

  const timeStr = currentTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const weekday = currentTime.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">⚡</span>
          <span className="text-[var(--text-secondary)]">Carregando escritório...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* ===== SIDEBAR MODERNA ===== */}
      <aside className="w-16 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center py-4 gap-2 shrink-0">
        <div className="text-2xl mb-4 cursor-default" title="Jarbas">⚡</div>

        <button
          onClick={() => setCurrentPage("office")}
          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
            currentPage === "office"
              ? "bg-[var(--accent-soft)]"
              : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
          }`}
          title="Escritório"
        >🏢</button>
        <button
          onClick={() => setCurrentPage("flows")}
          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
            currentPage === "flows"
              ? "bg-[var(--accent-soft)]"
              : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
          }`}
          title="Fluxos"
        >🔄</button>
        <button
          onClick={() => setCurrentPage("metrics")}
          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
            currentPage === "metrics"
              ? "bg-[var(--accent-soft)]"
              : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
          }`}
          title="Métricas"
        >📊</button>

        <div className="flex-1" />

        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
          title="Sair"
        >🚪</button>
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentPage === "flows" ? (
          <FlowsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics")} />
        ) : currentPage === "metrics" ? (
          <MetricsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics")} />
        ) : (
        <>
        {/* Header */}
        <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0">
          <h1 className="text-lg font-semibold">Escritório</h1>

          <div className="flex gap-4 ml-4 text-sm">
            <span className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium">{agents.length}</span> agentes
            </span>
            <span className="text-[var(--text-secondary)]">
              <span className="text-[var(--success)] font-medium">{todayCount}</span> execuções hoje
            </span>
            <span className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium">{executions.length}</span> total
            </span>
          </div>

          <div className="flex-1" />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar agente..."
              className="input-modern pl-9 !w-52 !py-2 text-sm"
            />
          </div>

          {/* Botão Gerenciar Setores */}
          <button
            onClick={() => { setEditingCategoryObj(null); setShowCategoryModal(true); }}
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            ⚙️ Setores
          </button>

          <button
            onClick={() => { setEditingAgent(null); setShowModal(true); }}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            + Novo Agente
          </button>
        </header>

        {/* Category tabs (deduplificado) */}
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-5 flex gap-1 items-center overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("Todos")}
            className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-all border-b-2 ${
              activeTab === "Todos"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Todos ({agents.length})
          </button>

          {uniqueCategories.map((cat) => {
            const count = agents.filter((a) => a.category === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.name)}
                className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-all border-b-2 whitespace-nowrap ${
                  activeTab === cat.name
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* ===== JANELA WIN98 DO ESCRITÓRIO ===== */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="win-border-outset flex flex-col h-full" style={{ background: "var(--win-surface)" }}>
            <div className="win-titlebar">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏢</span>
                <span>Jarbas — Visualizador de Escritório v1.0</span>
              </div>
              <div className="flex gap-0.5">
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>_</button>
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>□</button>
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>✕</button>
              </div>
            </div>

            <div className="win-menubar">
              <button>Arquivo</button>
              <button>Editar</button>
              <button>Exibir</button>
              <button>Ferramentas</button>
              <button>Ajuda</button>
            </div>

            <div className="flex-1 overflow-auto office-floor p-4">
              {/* Parede do escritório */}
              <div
                className="w-full h-14 mb-2 relative"
                style={{
                  background: "linear-gradient(180deg, #b0b0b0 0%, #c0c0c0 60%, #cacaca 100%)",
                  borderBottom: "3px solid #555",
                }}
              >
                <div
                  className="absolute top-2 left-4 px-3 py-1 text-white font-bold"
                  style={{ background: "#2a2a5a", border: "2px solid #FFD700", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                >
                  JARBAS
                </div>
                <div className="absolute top-1 right-4" style={{ width: 45, height: 35, background: "#1a3a1a", border: "2px solid #8B7355" }}>
                  <svg viewBox="0 0 45 35" width="45" height="35">
                    <text x="4" y="8" fill="#FFD700" fontSize="4.5" fontWeight="bold">SUCCESS</text>
                    <polyline points="5,30 12,24 22,26 32,15 40,8" fill="none" stroke="#33ff33" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {filteredAgents.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center py-3">
                  {filteredAgents.map((agent) => (
                    <DeskCard
                      key={agent.id}
                      agent={agent}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16" style={{ color: "#ddd", fontFamily: "'Segoe UI', Tahoma" }}>
                  <p className="text-3xl mb-3">🏢</p>
                  <p className="text-base mb-1">Escritório vazio</p>
                  <p className="text-xs">
                    {search ? "Nenhum funcionário encontrado" : "Contrate agentes clicando em '+ Novo Agente'"}
                  </p>
                </div>
              )}
            </div>

            <div className="win-statusbar">
              <div className="win-statusbar-section flex-1">
                {agents.length} Funcionários Ativos
              </div>
              <div className="win-statusbar-section">
                Execuções hoje: {todayCount}
              </div>
              <div className="win-statusbar-section">
                Horário: {timeStr}
              </div>
              <div className="win-statusbar-section">
                {capitalizedWeekday}
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* ===== MODAL AGENTE ===== */}
      {showModal && (
        <AgentModal
          agent={editingAgent}
          categories={availableCategories}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingAgent(null);
          }}
        />
      )}

      {/* ===== MODAL CATEGORIAS ===== */}
      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          agents={agents}
          editCategory={editingCategoryObj}
          onAddCategory={handleAddCategory}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
          onMoveAgent={handleMoveAgent}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategoryObj(null);
          }}
        />
      )}
    </div>
  );
}
