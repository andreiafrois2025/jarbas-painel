"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Agent, CONTEXTS } from "@/lib/types";
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
import OfficeScene from "./OfficeScene";
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
  const [selectedContext, setSelectedContext] = useState("IGAM");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
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

  // Salas do contexto selecionado
  const roomsInContext = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((c) => {
      const ctx = c.context || "IGAM";
      if (ctx !== selectedContext) return false;
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [categories, selectedContext]);

  // Agentes na sala expandida (com filtro de busca)
  const agentsInRoom = useMemo(() => {
    if (!selectedRoom) return [];
    let result = agents.filter((a) => a.category === selectedRoom);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [agents, selectedRoom, search]);

  // Nomes de categorias para o AgentModal
  const availableCategories = useMemo(() => {
    return [...new Set(categories.map((c) => c.name))];
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
  const handleAddCategory = async (name: string, context?: string) => {
    await addCategory(name, context || selectedContext);
    await loadData();
  };

  const handleRenameCategory = async (id: string, newName: string, oldName: string) => {
    await updateCategory(id, newName);
    const agentsToUpdate = agents.filter((a) => a.category === oldName);
    await Promise.all(agentsToUpdate.map((a) => updateAgent(a.id, { category: newName })));
    if (selectedRoom === oldName) setSelectedRoom(newName);
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const agentsInCat = agents.filter((a) => a.category === cat.name);
    if (agentsInCat.length > 0) {
      const fallback = categories.find((c) => c.id !== id)?.name || "Geotecnologias";
      await Promise.all(agentsInCat.map((a) => updateAgent(a.id, { category: fallback })));
    }
    await deleteCategory(id);
    if (selectedRoom === cat.name) setSelectedRoom(null);
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
    <div className="h-screen flex flex-col md:flex-row bg-[var(--bg-primary)]">
      {/* ===== SIDEBAR (desktop) / BOTTOM BAR (mobile) ===== */}
      <aside className="order-2 md:order-none w-full md:w-16 bg-[var(--bg-secondary)] border-t md:border-t-0 md:border-r border-[var(--border)] flex md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-2 shrink-0">
        <div className="hidden md:block text-2xl mb-4 cursor-default" title="Jarbas">⚡</div>

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

        <div className="hidden md:block flex-1" />

        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"
          title="Sair"
        >🚪</button>
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 flex flex-col overflow-hidden order-1 md:order-none min-h-0">
        {currentPage === "flows" ? (
          <FlowsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics")} />
        ) : currentPage === "metrics" ? (
          <MetricsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics")} />
        ) : (
        <>
        {/* Header */}
        <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex flex-wrap items-center px-3 md:px-5 gap-2 md:gap-4 shrink-0 py-2 md:py-0 md:h-14">
          <h1 className="text-base md:text-lg font-semibold">Escritório</h1>

          <div className="hidden md:flex gap-4 ml-4 text-sm">
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

          <div className="relative hidden lg:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar agente..."
              className="input-modern !pl-10 !w-52 !py-2 text-sm"
            />
          </div>

          {/* Botão Gerenciar Setores */}
          <button
            onClick={() => { setEditingCategoryObj(null); setShowCategoryModal(true); }}
            className="btn-secondary !py-2 !px-3 md:!px-4 text-xs md:text-sm"
          >
            ⚙️ <span className="hidden sm:inline">Setores</span>
          </button>

          <button
            onClick={() => { setEditingAgent(null); setShowModal(true); }}
            className="btn-primary !py-2 !px-3 md:!px-4 text-xs md:text-sm"
          >
            + <span className="hidden sm:inline">Novo </span>Agente
          </button>
        </header>

        {/* ===== JANELA WIN98 DO ESCRITÓRIO ===== */}
        <div className="flex-1 p-2 md:p-4 overflow-hidden">
          <div className="win-border-outset flex flex-col h-full" style={{ background: "var(--win-surface)" }}>
            <div className="win-titlebar">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏢</span>
                <span className="text-xs md:text-sm">
                  Jarbas{selectedContext ? ` › ${selectedContext}` : ""}{selectedRoom ? ` › ${selectedRoom}` : ""} v{process.env.NEXT_PUBLIC_APP_VERSION || "1.9.0"}
                </span>
              </div>
              <div className="flex gap-0.5">
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>_</button>
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>□</button>
                <button className="win-button" style={{ padding: "0 4px", minHeight: 14, fontSize: 9, color: "#000" }}>✕</button>
              </div>
            </div>

            <div className="win-menubar win-menubar-responsive">
              <button>Arquivo</button>
              <button>Editar</button>
              <button>Exibir</button>
              <button>Ferramentas</button>
              <button>Ajuda</button>
            </div>

            {/* Context tabs */}
            <div style={{ background: "var(--win-surface)", padding: "4px 4px 0", borderBottom: "2px solid var(--win-border-dark)", display: "flex", gap: 2, overflowX: "auto" }}>
              {CONTEXTS.map((ctx) => (
                <button
                  key={ctx}
                  className={`context-tab${selectedContext === ctx ? " active" : ""}`}
                  onClick={() => { setSelectedContext(ctx); setSelectedRoom(null); }}
                >
                  {ctx}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto office-floor p-2 md:p-4">
              {/* Parede do escritório */}
              <div
                className="w-full h-10 mb-3 relative"
                style={{
                  background: "linear-gradient(180deg, #b0b0b0 0%, #c0c0c0 60%, #cacaca 100%)",
                  borderBottom: "3px solid #555",
                }}
              >
                {selectedRoom ? (
                  <>
                    {/* Dentro da sala: Voltar na esquerda, JARBAS na direita */}
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="absolute top-1.5 left-4 px-3 py-0.5 font-bold cursor-pointer hover:brightness-90 transition-all"
                      style={{ background: "#c0c0c0", border: "1px solid #888", fontSize: 9, fontFamily: "'Segoe UI', Tahoma", color: "#000" }}
                    >
                      ← Voltar
                    </button>
                    <a
                      href="https://t.me/jarbas_af_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-1.5 right-4 px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                      style={{ background: "#1a3a6a", border: "2px solid #FFD700", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                      title="Abrir Jarbas no Telegram"
                    >
                      JARBAS
                    </a>
                  </>
                ) : (
                  <>
                    {/* Visão geral: JARBAS na esquerda, SUCCESS na direita */}
                    <a
                      href="https://t.me/jarbas_af_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-1.5 left-4 px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                      style={{ background: "#1a3a6a", border: "2px solid #FFD700", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                      title="Abrir Jarbas no Telegram"
                    >
                      JARBAS
                    </a>
                    <div className="absolute top-1 right-4" style={{ width: 45, height: 30, background: "#1a3a1a", border: "2px solid #8B7355" }}>
                      <svg viewBox="0 0 45 35" width="45" height="30">
                        <text x="4" y="8" fill="#FFD700" fontSize="4.5" fontWeight="bold">SUCCESS</text>
                        <polyline points="5,30 12,24 22,26 32,15 40,8" fill="none" stroke="#33ff33" strokeWidth="2" />
                      </svg>
                    </div>
                  </>
                )}
              </div>

              {/* ===== VISTA DE SALAS ===== */}
              {!selectedRoom && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 py-2">
                  {roomsInContext.length > 0 ? roomsInContext.map((cat) => {
                    const roomAgents = agents.filter((a) => a.category === cat.name);
                    const preview = roomAgents.slice(0, 6);
                    const extra = roomAgents.length - preview.length;
                    return (
                      <div
                        key={cat.id}
                        className="room-card"
                        onClick={() => setSelectedRoom(cat.name)}
                        title={`Abrir ${cat.name}`}
                      >
                        <div className="room-card-header">{cat.name}</div>
                        <div className="room-card-body">
                          {roomAgents.length === 0 ? (
                            <span className="room-empty">Sala vazia</span>
                          ) : (
                            preview.map((a) => (
                              <span key={a.id} className="room-agent-chip">
                                {a.icon || "⚡"} {a.agent_name || a.name}
                              </span>
                            ))
                          )}
                        </div>
                        {extra > 0 && (
                          <span className="room-count-badge">+{extra} mais</span>
                        )}
                        {roomAgents.length > 0 && (
                          <span className="room-count-badge" style={{ left: 6, right: "auto" }}>
                            {roomAgents.length} agente{roomAgents.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16 w-full" style={{ color: "#888", fontFamily: "'Segoe UI', Tahoma" }}>
                      <p className="text-2xl mb-2">🏢</p>
                      <p className="text-sm">Nenhuma sala em {selectedContext}</p>
                      <p className="text-xs mt-1">Clique em ⚙️ Setores para criar uma</p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== VISTA EXPANDIDA DA SALA ===== */}
              {selectedRoom && (
                agentsInRoom.length > 0 ? (
                  <OfficeScene
                    agents={agentsInRoom}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="text-center py-16" style={{ color: "#888", fontFamily: "'Segoe UI', Tahoma" }}>
                    <p className="text-2xl mb-2">🪑</p>
                    <p className="text-sm">{search ? "Nenhum agente encontrado" : "Sala vazia"}</p>
                    <p className="text-xs mt-1">Adicione agentes clicando em + Novo Agente</p>
                  </div>
                )
              )}
            </div>

            <div className="win-statusbar text-[8px] md:text-xs">
              <div className="win-statusbar-section flex-1">
                {selectedRoom
                  ? `${agentsInRoom.length} agente(s) em ${selectedRoom}`
                  : `${agents.length} Funcionários`}
              </div>
              <div className="win-statusbar-section hidden sm:block">
                Exec: {todayCount}
              </div>
              <div className="win-statusbar-section">
                {timeStr}
              </div>
              <div className="win-statusbar-section hidden sm:block">
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
          allCategories={categories}
          defaultContext={selectedContext}
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
          defaultContext={selectedContext}
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
