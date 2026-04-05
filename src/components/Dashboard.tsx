"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Agent, CONTEXTS, Collaborator, Assignment, QuickLink, DeskOccupant, occupantToAgent } from "@/lib/types";
import {
  getAgents,
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
  getCollaborators,
  addCollaborator,
  updateCollaborator,
  getAssignments,
  addAssignment,
  updateAssignment,
  deleteAssignment,
  buildOccupants,
  getQuickLinks,
  addQuickLink,
  migrateFromAgents,
} from "@/lib/storage";
import type { Execution, Category as CategoryType } from "@/lib/types";
import OfficeScene from "./OfficeScene";
import ContratarModal from "./ContratarModal";
import HRPage from "./HRPage";
import FlowsPage from "./FlowsPage";
import MetricsPage from "./MetricsPage";
import type { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  // Estado legado (mantido para retrocompatibilidade)
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  // Novo modelo
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [occupants, setOccupants] = useState<DeskOccupant[]>([]);

  // UI State
  const [selectedContext, setSelectedContext] = useState("IGAM");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showContratarModal, setShowContratarModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState<"office" | "flows" | "metrics" | "hr">("office");

  const loadData = useCallback(async () => {
    try {
      if (session.user?.id) {
        await seedDefaultData(session.user.id);
        await migrateFromAgents(session.user.id);
      }
      const [agentsData, categoriesData, executionsData, todayData, collabData, assignData, qlData] =
        await Promise.all([
          getAgents(),
          getCategories(),
          getExecutions(),
          getTodayExecutionCount(),
          getCollaborators(),
          getAssignments(),
          getQuickLinks(),
        ]);
      setAgents(agentsData);
      setCategories(categoriesData);
      setExecutions(executionsData);
      setTodayCount(todayData);
      setCollaborators(collabData);
      setAssignments(assignData);
      setQuickLinks(qlData);
      setOccupants(buildOccupants(assignData));

      // Auto-migrar JARBAS para quick_links se não existir
      if (qlData.length === 0 || !qlData.some(ql => ql.label === "JARBAS")) {
        await addQuickLink({ label: "JARBAS", url: "https://t.me/jarbas_af_bot", icon: "⚡", order: 0 });
        const updatedQL = await getQuickLinks();
        setQuickLinks(updatedQL);
      }
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

  // Usar novo modelo
  const useNewModel = occupants.length > 0 || collaborators.length > 0;

  // Salas do contexto selecionado (com busca global)
  const roomsInContext = useMemo(() => {
    const seen = new Set<string>();
    let rooms = categories.filter((c) => {
      const ctx = c.context || "IGAM";
      if (ctx !== selectedContext) return false;
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });

    // Busca global: filtrar salas que contêm colaboradores que casam
    if (search && !selectedRoom) {
      const q = search.toLowerCase();
      rooms = rooms.filter(room => {
        if (room.name.toLowerCase().includes(q)) return true;
        return occupants.some(o =>
          o.assignment.category_id === room.id && (
            o.collaborator.name.toLowerCase().includes(q) ||
            o.assignment.tool_name.toLowerCase().includes(q) ||
            o.assignment.description?.toLowerCase().includes(q)
          )
        );
      });
    }

    return rooms;
  }, [categories, selectedContext, search, selectedRoom, occupants]);

  // Ocupantes na sala expandida
  const occupantsInRoom = useMemo(() => {
    if (!selectedRoomId) return [];
    let result = occupants.filter(o => o.assignment.category_id === selectedRoomId);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.collaborator.name.toLowerCase().includes(q) ||
        o.assignment.tool_name.toLowerCase().includes(q) ||
        o.assignment.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [occupants, selectedRoomId, search]);

  // Fallback: agentes antigos
  const agentsInRoom = useMemo(() => {
    if (!selectedRoom || useNewModel) return [];
    let result = agents.filter(a => a.category === selectedRoom);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    return result;
  }, [agents, selectedRoom, search, useNewModel]);

  // Converter para Agents (adapter para OfficeScene)
  const agentsForScene = useMemo(() => {
    if (useNewModel) return occupantsInRoom.map(o => occupantToAgent(o));
    return agentsInRoom;
  }, [useNewModel, occupantsInRoom, agentsInRoom]);

  // Contar ocupantes por sala
  const countInRoom = useCallback((catId: string, catName: string) => {
    if (useNewModel) return occupants.filter(o => o.assignment.category_id === catId).length;
    return agents.filter(a => a.category === catName).length;
  }, [useNewModel, occupants, agents]);

  const previewInRoom = useCallback((catId: string, catName: string) => {
    if (useNewModel) {
      return occupants
        .filter(o => o.assignment.category_id === catId)
        .slice(0, 6)
        .map(o => ({ id: o.assignment.id, icon: o.collaborator.icon, name: o.collaborator.name }));
    }
    return agents
      .filter(a => a.category === catName)
      .slice(0, 6)
      .map(a => ({ id: a.id, icon: a.icon || "⚡", name: a.agent_name || a.name }));
  }, [useNewModel, occupants, agents]);

  // Handlers para editar/excluir no OfficeScene
  const handleEdit = (agent: Agent) => {
    if (useNewModel) {
      const asgn = assignments.find(a => a.id === agent.id);
      if (asgn) {
        const collab = collaborators.find(c => c.id === asgn.collaborator_id);
        setEditingAssignment(asgn);
        setEditingCollaborator(collab || null);
        setShowContratarModal(true);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta atribuição?")) {
      try {
        if (useNewModel) {
          await deleteAssignment(id);
        } else {
          await deleteAgent(id);
        }
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

  const timeStr = currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const weekday = currentTime.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const totalCount = useNewModel ? occupants.length : agents.length;

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
      {/* ===== SIDEBAR ===== */}
      <aside className="order-2 md:order-none w-full md:w-16 bg-[var(--bg-secondary)] border-t md:border-t-0 md:border-r border-[var(--border)] flex md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-2 shrink-0">
        <div className="hidden md:block text-2xl mb-4 cursor-default" title="Jarbas">⚡</div>
        <button onClick={() => setCurrentPage("office")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "office" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Escritório">🏢</button>
        <button onClick={() => setCurrentPage("hr")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "hr" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Gestão de RH">👥</button>
        <button onClick={() => setCurrentPage("flows")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "flows" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Fluxos">🔄</button>
        <button onClick={() => setCurrentPage("metrics")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "metrics" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Métricas">📊</button>
        <div className="hidden md:block flex-1" />
        <button onClick={handleLogout} className="w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100" title="Sair">🚪</button>
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 flex flex-col overflow-hidden order-1 md:order-none min-h-0">
        {currentPage === "hr" ? (
          <HRPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics" | "hr")} onDataChanged={loadData} />
        ) : currentPage === "flows" ? (
          <FlowsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics" | "hr")} />
        ) : currentPage === "metrics" ? (
          <MetricsPage onNavigate={(p) => setCurrentPage(p as "office" | "flows" | "metrics" | "hr")} />
        ) : (
        <>
        {/* Header */}
        <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex flex-wrap items-center px-3 md:px-5 gap-2 md:gap-4 shrink-0 py-2 md:py-0 md:h-14">
          <h1 className="text-base md:text-lg font-semibold">Escritório</h1>
          <div className="hidden md:flex gap-4 ml-4 text-sm">
            <span className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium">{totalCount}</span> colaboradores
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
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador..." className="input-modern !pl-10 !w-52 !py-2 text-sm" />
          </div>
          <button onClick={() => setCurrentPage("hr")} className="btn-secondary !py-2 !px-3 md:!px-4 text-xs md:text-sm">
            👥 <span className="hidden sm:inline">Gestão de RH</span>
          </button>
          <button onClick={() => { setEditingAssignment(null); setEditingCollaborator(null); setShowContratarModal(true); }} className="btn-primary !py-2 !px-3 md:!px-4 text-xs md:text-sm">
            + <span className="hidden sm:inline">Contratar </span>Colaborador
          </button>
        </header>

        {/* ===== JANELA WIN98 ===== */}
        <div className="flex-1 p-2 md:p-4 overflow-hidden">
          <div className="win-border-outset flex flex-col h-full" style={{ background: "var(--win-surface)" }}>
            <div className="win-titlebar">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏢</span>
                <span className="text-xs md:text-sm">
                  Jarbas{selectedContext ? ` › ${selectedContext}` : ""}{selectedRoom ? ` › ${selectedRoom}` : ""} v{process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0"}
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
                <button key={ctx} className={`context-tab${selectedContext === ctx ? " active" : ""}`}
                  onClick={() => { setSelectedContext(ctx); setSelectedRoom(null); setSelectedRoomId(null); }}>
                  {ctx}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto office-floor p-2 md:p-4">
              {/* Parede do escritório com Quick-links UNIFICADOS */}
              <div className="w-full h-10 mb-3 relative" style={{ background: "linear-gradient(180deg, #E8E2DA 0%, #DDD6CC 60%, #D5CEC4 100%)", borderBottom: "2px solid #B0A898" }}>
                {selectedRoom ? (
                  <>
                    <button onClick={() => { setSelectedRoom(null); setSelectedRoomId(null); }}
                      className="absolute top-1.5 left-4 px-3 py-0.5 font-bold cursor-pointer hover:brightness-90 transition-all"
                      style={{ background: "#EDE8E1", border: "1px solid #B0A898", fontSize: 9, fontFamily: "'Segoe UI', Tahoma", color: "#000" }}>
                      ← Voltar
                    </button>
                    <div className="absolute top-1.5 right-4 flex gap-2 items-center">
                      {quickLinks.map(ql => (
                        <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                          style={{ background: "#2D6B6B", border: "2px solid #C4A460", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                          title={ql.label}>
                          {ql.icon} {ql.label}
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-1.5 left-4 flex gap-2 items-center">
                      {quickLinks.map(ql => (
                        <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                          style={{ background: "#2D6B6B", border: "2px solid #C4A460", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                          title={ql.label}>
                          {ql.icon} {ql.label}
                        </a>
                      ))}
                      <button onClick={() => setCurrentPage("hr")}
                        className="px-2 py-0.5 cursor-pointer hover:brightness-90 transition-all"
                        style={{ background: "#EDE8E1", border: "1px solid #B0A898", fontSize: 9, fontFamily: "'Segoe UI', Tahoma", color: "#000" }}
                        title="Gerenciar atalhos no RH">
                        + ✏️
                      </button>
                    </div>
                    <div className="absolute top-1 right-4" style={{ width: 45, height: 30, background: "#1F4F4F", border: "2px solid #C4A460" }}>
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
                    const count = countInRoom(cat.id, cat.name);
                    const preview = previewInRoom(cat.id, cat.name);
                    const extra = count - preview.length;
                    return (
                      <div key={cat.id} className="room-card" onClick={() => { setSelectedRoom(cat.name); setSelectedRoomId(cat.id); }} title={`Abrir ${cat.name}`}>
                        <div className="room-card-header">{cat.name}</div>
                        <div className="room-card-body">
                          {count === 0 ? (
                            <span className="room-empty">Sala vazia</span>
                          ) : (
                            preview.map(a => (
                              <span key={a.id} className="room-agent-chip">{a.icon} {a.name}</span>
                            ))
                          )}
                        </div>
                        {extra > 0 && <span className="room-count-badge">+{extra} mais</span>}
                        {count > 0 && (
                          <span className="room-count-badge" style={{ left: 6, right: "auto" }}>
                            {count} colaborador{count !== 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16 w-full" style={{ color: "#888", fontFamily: "'Segoe UI', Tahoma" }}>
                      <p className="text-2xl mb-2">🏢</p>
                      <p className="text-sm">{search ? "Nenhuma sala encontrada" : `Nenhuma sala em ${selectedContext}`}</p>
                      <p className="text-xs mt-1">Clique em 👥 Gestão de RH para criar setores</p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== VISTA EXPANDIDA DA SALA ===== */}
              {selectedRoom && (
                agentsForScene.length > 0 ? (
                  <OfficeScene
                    agents={agentsForScene}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="text-center py-16" style={{ color: "#888", fontFamily: "'Segoe UI', Tahoma" }}>
                    <p className="text-2xl mb-2">🪑</p>
                    <p className="text-sm">{search ? "Nenhum colaborador encontrado" : "Sala vazia"}</p>
                    <p className="text-xs mt-1">Clique em + Contratar Colaborador para adicionar</p>
                  </div>
                )
              )}
            </div>

            <div className="win-statusbar text-[8px] md:text-xs">
              <div className="win-statusbar-section flex-1">
                {selectedRoom
                  ? `${agentsForScene.length} colaborador(es) em ${selectedRoom}`
                  : `${totalCount} Colaboradores`}
              </div>
              <div className="win-statusbar-section hidden sm:block">Exec: {todayCount}</div>
              <div className="win-statusbar-section">{timeStr}</div>
              <div className="win-statusbar-section hidden sm:block">{capitalizedWeekday}</div>
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* ===== MODAL CONTRATAR COLABORADOR ===== */}
      {showContratarModal && (
        <ContratarModal
          collaborators={collaborators}
          categories={categories}
          defaultContext={selectedContext}
          defaultCategoryId={selectedRoomId || undefined}
          editingAssignment={editingAssignment}
          editingCollaborator={editingCollaborator}
          onSaveCollaborator={async (data) => {
            const c = await addCollaborator(data);
            await loadData();
            return c;
          }}
          onUpdateCollaborator={async (id, updates) => {
            await updateCollaborator(id, updates);
            await loadData();
          }}
          onSaveAssignment={async (data) => {
            await addAssignment(data);
            await loadData();
          }}
          onUpdateAssignment={async (id, updates) => {
            await updateAssignment(id, updates);
            await loadData();
          }}
          onClose={() => {
            setShowContratarModal(false);
            setEditingAssignment(null);
            setEditingCollaborator(null);
          }}
        />
      )}
    </div>
  );
}
