"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Agent, CONTEXTS, Collaborator, Assignment, QuickLink, DeskOccupant, occupantToAgent } from "@/lib/types";
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
  getCollaborators,
  addCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getAssignments,
  addAssignment,
  updateAssignment,
  deleteAssignment,
  buildOccupants,
  getQuickLinks,
  addQuickLink,
  updateQuickLink,
  deleteQuickLink,
  migrateFromAgents,
} from "@/lib/storage";
import type { Execution, Category as CategoryType } from "@/lib/types";
import OfficeScene from "./OfficeScene";
import ContratarModal from "./ContratarModal";
import CategoryModal from "./CategoryModal";
import FlowsPage from "./FlowsPage";
import MetricsPage from "./MetricsPage";
import type { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  // Estado legado (mantido para CategoryModal durante transição)
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryObj, setEditingCategoryObj] = useState<CategoryType | null>(null);
  const [currentPage, setCurrentPage] = useState<"office" | "flows" | "metrics">("office");

  // Quick-link edit
  const [showQLForm, setShowQLForm] = useState(false);
  const [qlLabel, setQlLabel] = useState("");
  const [qlUrl, setQlUrl] = useState("");
  const [qlIcon, setQlIcon] = useState("🔗");
  const [editingQL, setEditingQL] = useState<QuickLink | null>(null);

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

  // Usar novo modelo: ocupantes na sala (por category_id)
  const useNewModel = occupants.length > 0 || collaborators.length > 0;

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

  // Fallback: agentes antigos na sala (para retrocompatibilidade)
  const agentsInRoom = useMemo(() => {
    if (!selectedRoom || useNewModel) return [];
    let result = agents.filter(a => a.category === selectedRoom);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    return result;
  }, [agents, selectedRoom, search, useNewModel]);

  // Converter ocupantes para Agents (adapter para OfficeScene)
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

  // Handlers para editar/excluir no OfficeScene (converte de Agent para Assignment)
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

  // ---- Category handlers ----
  const handleAddCategory = async (name: string, context?: string) => {
    await addCategory(name, context || selectedContext);
    await loadData();
  };

  const handleRenameCategory = async (id: string, newName: string, oldName: string) => {
    await updateCategory(id, newName);
    // Atualizar agentes legados
    const agentsToUpdate = agents.filter(a => a.category === oldName);
    await Promise.all(agentsToUpdate.map(a => updateAgent(a.id, { category: newName })));
    if (selectedRoom === oldName) setSelectedRoom(newName);
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    // Mover agentes legados
    const agentsInCat = agents.filter(a => a.category === cat.name);
    if (agentsInCat.length > 0) {
      const fallback = categories.find(c => c.id !== id)?.name || "Geotecnologias";
      await Promise.all(agentsInCat.map(a => updateAgent(a.id, { category: fallback })));
    }
    // Assignments serão deletados em cascata
    await deleteCategory(id);
    if (selectedRoom === cat.name) { setSelectedRoom(null); setSelectedRoomId(null); }
    await loadData();
  };

  const handleMoveAgent = async (agentId: string, newCategory: string) => {
    await updateAgent(agentId, { category: newCategory });
    await loadData();
  };

  // ---- Quick-link handlers ----
  const handleSaveQL = async () => {
    if (!qlLabel || !qlUrl) return;
    if (editingQL) {
      await updateQuickLink(editingQL.id, { label: qlLabel, url: qlUrl, icon: qlIcon });
    } else {
      await addQuickLink({ label: qlLabel, url: qlUrl, icon: qlIcon, order: quickLinks.length });
    }
    setShowQLForm(false);
    setQlLabel("");
    setQlUrl("");
    setQlIcon("🔗");
    setEditingQL(null);
    await loadData();
  };

  const handleDeleteQL = async (id: string) => {
    await deleteQuickLink(id);
    await loadData();
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
        <button onClick={() => setCurrentPage("flows")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "flows" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Fluxos">🔄</button>
        <button onClick={() => setCurrentPage("metrics")} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${currentPage === "metrics" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100"}`} title="Métricas">📊</button>
        <div className="hidden md:block flex-1" />
        <button onClick={handleLogout} className="w-10 h-10 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100" title="Sair">🚪</button>
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
          <button onClick={() => { setEditingCategoryObj(null); setShowCategoryModal(true); }} className="btn-secondary !py-2 !px-3 md:!px-4 text-xs md:text-sm">
            ⚙️ <span className="hidden sm:inline">Setores e Agentes</span>
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
              {/* Parede do escritório com Quick-links */}
              <div className="w-full h-10 mb-3 relative" style={{ background: "linear-gradient(180deg, #E8E2DA 0%, #DDD6CC 60%, #D5CEC4 100%)", borderBottom: "2px solid #B0A898" }}>
                {selectedRoom ? (
                  <>
                    <button onClick={() => { setSelectedRoom(null); setSelectedRoomId(null); }}
                      className="absolute top-1.5 left-4 px-3 py-0.5 font-bold cursor-pointer hover:brightness-90 transition-all"
                      style={{ background: "#EDE8E1", border: "1px solid #B0A898", fontSize: 9, fontFamily: "'Segoe UI', Tahoma", color: "#000" }}>
                      ← Voltar
                    </button>
                    <div className="absolute top-1.5 right-4 flex gap-1 items-center">
                      {quickLinks.map(ql => (
                        <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                          style={{ background: "#A0583C", border: "1px solid #C4A460", fontSize: 8, fontFamily: "'Segoe UI', Tahoma" }}
                          title={ql.label}>
                          {ql.icon} {ql.label}
                        </a>
                      ))}
                      <a href="https://t.me/jarbas_af_bot" target="_blank" rel="noopener noreferrer"
                        className="px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                        style={{ background: "#2D6B6B", border: "2px solid #C4A460", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                        title="Abrir Jarbas no Telegram">
                        JARBAS
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-1.5 left-4 flex gap-1 items-center">
                      <a href="https://t.me/jarbas_af_bot" target="_blank" rel="noopener noreferrer"
                        className="px-3 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                        style={{ background: "#2D6B6B", border: "2px solid #C4A460", fontSize: 9, fontFamily: "'Segoe UI', Tahoma" }}
                        title="Abrir Jarbas no Telegram">
                        JARBAS
                      </a>
                      {quickLinks.map(ql => (
                        <a key={ql.id} href={ql.url} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-0.5 text-white font-bold no-underline hover:brightness-125 transition-all cursor-pointer"
                          style={{ background: "#A0583C", border: "1px solid #C4A460", fontSize: 8, fontFamily: "'Segoe UI', Tahoma" }}
                          title={ql.label}>
                          {ql.icon} {ql.label}
                        </a>
                      ))}
                      <button onClick={() => { setEditingQL(null); setQlLabel(""); setQlUrl(""); setQlIcon("🔗"); setShowQLForm(true); }}
                        className="px-1.5 py-0.5 cursor-pointer hover:brightness-90 transition-all"
                        style={{ background: "#EDE8E1", border: "1px solid #B0A898", fontSize: 8, fontFamily: "'Segoe UI', Tahoma", color: "#000" }}
                        title="Adicionar atalho">
                        +
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
                      <p className="text-sm">Nenhuma sala em {selectedContext}</p>
                      <p className="text-xs mt-1">Clique em ⚙️ Setores e Agentes para criar uma</p>
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
          onEditAgent={async (agent, updates) => {
            await updateAgent(agent.id, updates);
            await loadData();
          }}
          onDeleteAgent={async (id) => {
            await deleteAgent(id);
            await loadData();
          }}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategoryObj(null);
          }}
        />
      )}

      {/* ===== MODAL QUICK-LINK ===== */}
      {showQLForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQLForm(false)}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-xs p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editingQL ? "Editar Atalho" : "Novo Atalho"}</h3>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Ícone</label>
              <div className="flex gap-1 flex-wrap">
                {["🔗","📓","📅","📌","💡","🎯","📊","🔔","💬","🌐"].map(i => (
                  <button key={i} type="button" onClick={() => setQlIcon(i)}
                    className={`text-lg w-8 h-8 rounded cursor-pointer ${qlIcon === i ? "bg-[var(--accent-soft)] border border-[var(--accent)]" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Nome</label>
              <input type="text" value={qlLabel} onChange={e => setQlLabel(e.target.value)} className="input-modern" placeholder="Ex: 2° Cérebro" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">URL</label>
              <input type="url" value={qlUrl} onChange={e => setQlUrl(e.target.value)} className="input-modern" placeholder="https://..." />
            </div>
            <div className="flex gap-2">
              {editingQL && (
                <button type="button" onClick={async () => { await handleDeleteQL(editingQL.id); setShowQLForm(false); setEditingQL(null); }}
                  className="btn-secondary !text-red-400 flex-1">Excluir</button>
              )}
              <button type="button" onClick={() => setShowQLForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="button" onClick={handleSaveQL} disabled={!qlLabel || !qlUrl} className="btn-primary flex-1">Salvar</button>
            </div>

            {/* Lista de quick-links existentes para editar */}
            {quickLinks.length > 0 && !editingQL && (
              <div className="border-t border-[var(--border)] pt-3 mt-3">
                <label className="block text-xs text-[var(--text-muted)] mb-2">Atalhos existentes (clique para editar)</label>
                {quickLinks.map(ql => (
                  <button key={ql.id} type="button"
                    onClick={() => { setEditingQL(ql); setQlLabel(ql.label); setQlUrl(ql.url); setQlIcon(ql.icon); }}
                    className="w-full text-left text-sm p-2 rounded hover:bg-[var(--bg-tertiary)] cursor-pointer flex items-center gap-2">
                    <span>{ql.icon}</span>
                    <span className="flex-1">{ql.label}</span>
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[120px]">{ql.url}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
