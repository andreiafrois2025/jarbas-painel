"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Collaborator, Assignment, Category, QuickLink, SubLink } from "@/lib/types";
import { CONTEXTS } from "@/lib/types";
import {
  getCollaborators, addCollaborator, updateCollaborator, deleteCollaborator,
  getAssignments, addAssignment, updateAssignment, deleteAssignment,
  getCategories, addCategory, updateCategory, deleteCategory,
  getQuickLinks, addQuickLink, updateQuickLink, deleteQuickLink,
} from "@/lib/storage";

// =============================================
// Appearance constants (shared with ContratarModal)
// =============================================
const SKIN_COLORS = ["#FDDCB5","#F5D0A9","#EDCAA8","#DBA97B","#C68642","#A0724A"];
const SKIN_NAMES = ["Claro","Claro médio","Médio","Moreno","Moreno escuro","Negro"];
const HAIR_COLORS = ["#2C1810","#1a1a2e","#5C3317","#8B6914","#A0522D","#4A2800","#6B2D5B","#D4A03C","#C0392B","#E08040"];
const HAIR_NAMES = ["Preto","Preto azulado","Castanho escuro","Castanho claro","Marrom","Marrom escuro","Roxo","Loiro","Ruivo","Ruivo claro"];
const SHIRT_COLORS = ["#E74C3C","#4A90D9","#2ECC71","#9B59B6","#F39C12","#1ABC9C","#E67E22","#5DADE2","#FF6B9D","#48C9B0"];
const ICONS = [
  "🤖","🧠","💎","🎨","🖼️","🔍","👨‍💻","⚡","📝","🎬","🎵","📊",
  "🍳","🥗","🏋️","🌍","💰","✈️","📚","💼","🎓","❤️","🧘","🛠️",
  "📐","🔬","⚖️","🎯","💬","📣","🏠","🌱","🎤","📱","🖥️","🔒",
];
const QL_ICONS = [
  "⚡","🔗","📓","📅","📌","💡","🎯","📊","🔔","💬","🌐","🏠",
  "💰","🎓","✈️","❤️","🧘","🛠️","📚","🍳","🏋️","🌍","💼","📣",
  "🎬","🎵","📱","🖥️","🌱","⚖️","🔬","📐","🔒","🎤","📝","🎨",
];

interface HRPageProps {
  onNavigate: (page: string) => void;
  onDataChanged: () => void;
}

export default function HRPage({ onNavigate, onDataChanged }: HRPageProps) {
  // Data
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [activeTab, setActiveTab] = useState<"collaborators" | "sectors" | "quicklinks">("collaborators");
  const [filterContext, setFilterContext] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCollab, setExpandedCollab] = useState<string | null>(null);
  const [editingCollab, setEditingCollab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Collaborator form
  const [collabName, setCollabName] = useState("");
  const [collabBio, setCollabBio] = useState("");
  const [collabStatus, setCollabStatus] = useState<"active" | "dismissed">("active");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [skinTone, setSkinTone] = useState(0);
  const [hairColor, setHairColor] = useState(0);
  const [shirtColor, setShirtColor] = useState(1);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [icon, setIcon] = useState("⚡");
  const [showNewCollab, setShowNewCollab] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Sector form
  const [sectorFilterCtx, setSectorFilterCtx] = useState("IGAM");
  const [newSectorName, setNewSectorName] = useState("");
  const [editingSector, setEditingSector] = useState<Category | null>(null);
  const [sectorName, setSectorName] = useState("");

  // Assignment form
  const [showNewAssignment, setShowNewAssignment] = useState<string | null>(null); // collaborator_id
  const [asgCtx, setAsgCtx] = useState("IGAM");
  const [asgCatId, setAsgCatId] = useState("");
  const [asgTool, setAsgTool] = useState("");
  const [asgLink, setAsgLink] = useState("");
  const [asgDesc, setAsgDesc] = useState("");
  const [asgType, setAsgType] = useState<"manual" | "automatic">("manual");
  const [asgTimeSaved, setAsgTimeSaved] = useState(2);
  const [asgSubLinks, setAsgSubLinks] = useState<SubLink[]>([]);
  const [editingAsg, setEditingAsg] = useState<Assignment | null>(null);

  // Quick-link form
  const [showNewQL, setShowNewQL] = useState(false);
  const [editingQL, setEditingQL] = useState<QuickLink | null>(null);
  const [qlLabel, setQlLabel] = useState("");
  const [qlUrl, setQlUrl] = useState("");
  const [qlIcon, setQlIcon] = useState("🔗");

  // ---- Load data ----
  const loadData = useCallback(async () => {
    try {
      const [c, a, cat, ql] = await Promise.all([
        getCollaborators(), getAssignments(), getCategories(), getQuickLinks()
      ]);
      setCollaborators(c);
      setAssignments(a);
      setCategories(cat);
      setQuickLinks(ql);
    } catch (err) {
      console.error("Erro ao carregar dados HR:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Derived data ----
  const filteredCollaborators = useMemo(() => {
    let result = collaborators;

    // Status filter
    if (!showDismissed) {
      result = result.filter(c => (c.status || "active") === "active");
    }

    const q = searchQuery.toLowerCase();

    if (q) {
      result = result.filter(c => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.bio?.toLowerCase().includes(q)) return true;
        // Search in assignments too
        return assignments.some(a =>
          a.collaborator_id === c.id && (
            a.tool_name.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q)
          )
        );
      });
    }

    if (filterContext !== "all") {
      const catIds = new Set(categories.filter(cat => (cat.context || "IGAM") === filterContext).map(cat => cat.id));
      if (filterSector !== "all") catIds.clear(); // will use filterSector instead
      const sectorCatIds = filterSector !== "all"
        ? new Set([filterSector])
        : catIds;

      const collabIdsInContext = new Set(
        assignments.filter(a => sectorCatIds.has(a.category_id)).map(a => a.collaborator_id)
      );
      result = result.filter(c => collabIdsInContext.has(c.id));
    }

    return result;
  }, [collaborators, assignments, categories, searchQuery, filterContext, filterSector, showDismissed]);

  const getCollabAssignments = useCallback((collabId: string) => {
    return assignments.filter(a => a.collaborator_id === collabId);
  }, [assignments]);

  const getCollabContexts = useCallback((collabId: string) => {
    const ctxs = new Set<string>();
    assignments.filter(a => a.collaborator_id === collabId).forEach(a => {
      if (a.category) ctxs.add(a.category.context || "IGAM");
    });
    return Array.from(ctxs);
  }, [assignments]);

  const sectorsInFilter = useMemo(() => {
    return categories.filter(c => (c.context || "IGAM") === (filterContext === "all" ? "IGAM" : filterContext));
  }, [categories, filterContext]);

  const sectorsForTab = useMemo(() => {
    return categories.filter(c => (c.context || "IGAM") === sectorFilterCtx);
  }, [categories, sectorFilterCtx]);

  const catsForAssignment = useMemo(() => {
    return categories.filter(c => (c.context || "IGAM") === asgCtx);
  }, [categories, asgCtx]);

  // ---- Handlers ----
  const reload = async () => {
    await loadData();
    onDataChanged();
  };

  // Collaborator CRUD
  const handleCreateCollab = async () => {
    if (!collabName.trim() || saving) return;
    setSaving(true);
    try {
      await addCollaborator({
        name: collabName.trim(), gender, skin_tone: skinTone,
        hair_color: hairColor, shirt_color: shirtColor,
        has_glasses: hasGlasses, icon, bio: collabBio, status: collabStatus,
      });
      setShowNewCollab(false);
      resetCollabForm();
      await reload();
    } finally { setSaving(false); }
  };

  const handleUpdateCollab = async (id: string) => {
    if (!collabName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCollaborator(id, {
        name: collabName.trim(), gender, skin_tone: skinTone,
        hair_color: hairColor, shirt_color: shirtColor,
        has_glasses: hasGlasses, icon, bio: collabBio, status: collabStatus,
      });
      setEditingCollab(null);
      await reload();
    } finally { setSaving(false); }
  };

  const handleDeleteCollab = async (id: string, name: string) => {
    const asgCount = getCollabAssignments(id).length;
    const msg = asgCount > 0
      ? `Excluir "${name}"? Isso removerá ${asgCount} atribuição(ões) também.`
      : `Excluir "${name}"?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await deleteCollaborator(id);
      if (expandedCollab === id) setExpandedCollab(null);
      await reload();
    } finally { setSaving(false); }
  };

  const openEditCollab = (c: Collaborator) => {
    setCollabName(c.name);
    setCollabBio(c.bio || "");
    setCollabStatus(c.status || "active");
    setGender(c.gender);
    setSkinTone(c.skin_tone);
    setHairColor(c.hair_color);
    setShirtColor(c.shirt_color);
    setHasGlasses(c.has_glasses);
    setIcon(c.icon);
    setEditingCollab(c.id);
  };

  const resetCollabForm = () => {
    setCollabName(""); setCollabBio(""); setCollabStatus("active");
    setGender("female"); setSkinTone(0);
    setHairColor(0); setShirtColor(1); setHasGlasses(false); setIcon("⚡");
  };

  // Assignment CRUD
  const openNewAssignment = (collabId: string) => {
    setShowNewAssignment(collabId);
    setEditingAsg(null);
    setAsgCtx("IGAM"); setAsgCatId(""); setAsgTool(""); setAsgLink("");
    setAsgDesc(""); setAsgType("manual"); setAsgTimeSaved(2); setAsgSubLinks([]);
  };

  const openEditAssignment = (a: Assignment) => {
    setEditingAsg(a);
    setShowNewAssignment(a.collaborator_id);
    setAsgTool(a.tool_name);
    setAsgLink(a.link);
    setAsgDesc(a.description || "");
    setAsgType(a.type);
    setAsgTimeSaved(a.time_saved_minutes ?? 2);
    setAsgSubLinks(a.sub_links || []);
    setAsgCatId(a.category_id);
    const cat = categories.find(c => c.id === a.category_id);
    if (cat) setAsgCtx(cat.context || "IGAM");
  };

  const handleSaveAssignment = async () => {
    if (!showNewAssignment || !asgTool || !asgLink || !asgCatId || saving) return;
    setSaving(true);
    try {
      if (editingAsg) {
        await updateAssignment(editingAsg.id, {
          collaborator_id: showNewAssignment,
          category_id: asgCatId, tool_name: asgTool, link: asgLink,
          description: asgDesc, type: asgType, time_saved_minutes: asgTimeSaved,
          sub_links: asgSubLinks.filter(sl => sl.label && sl.url),
        });
      } else {
        await addAssignment({
          collaborator_id: showNewAssignment,
          category_id: asgCatId, tool_name: asgTool, link: asgLink,
          description: asgDesc, type: asgType, time_saved_minutes: asgTimeSaved,
          sub_links: asgSubLinks.filter(sl => sl.label && sl.url),
        });
      }
      setShowNewAssignment(null);
      setEditingAsg(null);
      await reload();
    } finally { setSaving(false); }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Excluir esta atribuição?")) return;
    setSaving(true);
    try {
      await deleteAssignment(id);
      await reload();
    } finally { setSaving(false); }
  };

  // Sector CRUD
  const handleCreateSector = async () => {
    if (!newSectorName.trim() || saving) return;
    setSaving(true);
    try {
      await addCategory(newSectorName.trim(), sectorFilterCtx);
      setNewSectorName("");
      await reload();
    } finally { setSaving(false); }
  };

  const handleRenameSector = async () => {
    if (!editingSector || !sectorName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCategory(editingSector.id, sectorName.trim());
      setEditingSector(null);
      setSectorName("");
      await reload();
    } finally { setSaving(false); }
  };

  const handleDeleteSector = async (cat: Category) => {
    const count = assignments.filter(a => a.category_id === cat.id).length;
    const msg = count > 0
      ? `Excluir setor "${cat.name}"? ${count} atribuição(ões) serão excluídas.`
      : `Excluir setor "${cat.name}"?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await deleteCategory(cat.id);
      await reload();
    } finally { setSaving(false); }
  };

  // Quick-link CRUD
  const handleSaveQL = async () => {
    if (!qlLabel || !qlUrl || saving) return;
    setSaving(true);
    try {
      if (editingQL) {
        await updateQuickLink(editingQL.id, { label: qlLabel, url: qlUrl, icon: qlIcon });
      } else {
        await addQuickLink({ label: qlLabel, url: qlUrl, icon: qlIcon, order: quickLinks.length });
      }
      setShowNewQL(false);
      setEditingQL(null);
      setQlLabel(""); setQlUrl(""); setQlIcon("🔗");
      await reload();
    } finally { setSaving(false); }
  };

  const handleDeleteQL = async (id: string) => {
    if (!confirm("Excluir este atalho?")) return;
    setSaving(true);
    try {
      await deleteQuickLink(id);
      await reload();
    } finally { setSaving(false); }
  };

  const openEditQL = (ql: QuickLink) => {
    setEditingQL(ql);
    setQlLabel(ql.label);
    setQlUrl(ql.url);
    setQlIcon(ql.icon);
    setShowNewQL(true);
  };

  // Reordenar quick-links (mover ↑ ou ↓)
  const handleMoveQL = async (id: string, direction: "up" | "down") => {
    const idx = quickLinks.findIndex(ql => ql.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= quickLinks.length) return;
    setSaving(true);
    try {
      const current = quickLinks[idx];
      const target = quickLinks[targetIdx];
      await updateQuickLink(current.id, { order: target.order });
      await updateQuickLink(target.id, { order: current.order });
      await reload();
    } finally { setSaving(false); }
  };

  // Reordenar setores (mover ↑ ou ↓)
  const handleMoveSector = async (catId: string, direction: "up" | "down") => {
    const list = sectorsForTab;
    const idx = list.findIndex(c => c.id === catId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    setSaving(true);
    try {
      const current = list[idx];
      const target = list[targetIdx];
      await updateCategory(current.id, { order: current.order !== target.order ? target.order : targetIdx });
      await updateCategory(target.id, { order: target.order !== current.order ? current.order : idx });
      await reload();
    } finally { setSaving(false); }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">👥</span>
          <span className="text-[var(--text-secondary)]">Carregando RH...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* ===== HEADER ===== */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-6 py-3 gap-4 shrink-0">
        <button
          onClick={() => onNavigate("office")}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
        >
          ← Escritório
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Gestão de RH</h1>
        <div className="flex-1" />
        <span className="text-xs text-[var(--text-muted)]">
          {collaborators.length} colaboradores · {assignments.length} atribuições · {categories.length} setores
        </span>
      </div>

      {/* ===== TABS ===== */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex px-6 gap-1 shrink-0">
        {([
          { key: "collaborators", label: "👤 Colaboradores", count: collaborators.length },
          { key: "sectors", label: "🏢 Setores", count: categories.length },
          { key: "quicklinks", label: "🔗 Atalhos Rápidos", count: quickLinks.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium cursor-pointer transition-all border-b-2 ${
              activeTab === tab.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]"
            }`}
          >
            {tab.label} <span className="text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== TAB: COLABORADORES ===== */}
        {activeTab === "collaborators" && (
          <>
            {/* Left filter panel */}
            <aside className="w-60 bg-[var(--bg-secondary)] border-r border-[var(--border)] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 hidden lg:flex">
              {/* Search */}
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="input-modern !pl-9 !py-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Context filter */}
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Contexto</label>
                <div className="space-y-1">
                  <button
                    onClick={() => { setFilterContext("all"); setFilterSector("all"); }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      filterContext === "all" ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span>Todos</span>
                    <span className="opacity-60">{collaborators.length}</span>
                  </button>
                  {CONTEXTS.map(ctx => {
                    const catIds = new Set(categories.filter(c => (c.context || "IGAM") === ctx).map(c => c.id));
                    const count = new Set(assignments.filter(a => catIds.has(a.category_id)).map(a => a.collaborator_id)).size;
                    return (
                      <button
                        key={ctx}
                        onClick={() => { setFilterContext(ctx); setFilterSector("all"); }}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                          filterContext === ctx ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <span>{ctx}</span>
                        <span className="opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sector filter */}
              {filterContext !== "all" && (
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Setor</label>
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilterSector("all")}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-all ${
                        filterSector === "all" ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      Todos os setores
                    </button>
                    {sectorsInFilter.map(cat => {
                      const count = assignments.filter(a => a.category_id === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFilterSector(cat.id)}
                          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                            filterSector === cat.id ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          <span className="opacity-60 text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status filter */}
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Status</label>
                <button
                  onClick={() => setShowDismissed(!showDismissed)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                    showDismissed ? "bg-[var(--warning)]/10 text-[var(--warning)] font-medium" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  }`}
                >
                  <span>Incluir desligados</span>
                  <span className="text-[10px]">{showDismissed ? "✓" : ""}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="mt-auto space-y-2">
                <button
                  onClick={() => { setShowNewCollab(true); resetCollabForm(); }}
                  className="btn-primary w-full !text-xs !py-2"
                >
                  + Novo Colaborador
                </button>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Mobile search + filter */}
              <div className="lg:hidden mb-4 space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">🔍</span>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar colaborador..." className="input-modern !pl-9 !py-2 text-sm w-full" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => { setFilterContext("all"); setFilterSector("all"); }}
                    className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer ${filterContext === "all" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-secondary)] border border-[var(--border)]"}`}>
                    Todos
                  </button>
                  {CONTEXTS.map(ctx => (
                    <button key={ctx} onClick={() => { setFilterContext(ctx); setFilterSector("all"); }}
                      className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer ${filterContext === ctx ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-secondary)] border border-[var(--border)]"}`}>
                      {ctx}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setShowNewCollab(true); resetCollabForm(); }}
                  className="btn-primary !text-xs !py-2 w-full">+ Novo Colaborador</button>
              </div>

              {/* Collaborator grid */}
              {filteredCollaborators.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-2">👤</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {searchQuery ? "Nenhum colaborador encontrado" : "Nenhum colaborador cadastrado"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCollaborators.map(collab => {
                    const collabAsgs = getCollabAssignments(collab.id);
                    const ctxs = getCollabContexts(collab.id);
                    const isExpanded = expandedCollab === collab.id;
                    const isEditing = editingCollab === collab.id;

                    return (
                      <div key={collab.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden transition-all hover:shadow-md">
                        {/* Card header */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer"
                          onClick={() => setExpandedCollab(isExpanded ? null : collab.id)}
                        >
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                            style={{ backgroundColor: SKIN_COLORS[collab.skin_tone] + "30" }}>
                            {collab.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${collab.status === "dismissed" ? "opacity-60" : ""}`}>{collab.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{collab.gender === "female" ? "👩" : "👨"}</span>
                              {collab.status === "dismissed" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] font-medium">Desligado</span>
                              )}
                            </div>
                            {collab.bio && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{collab.bio}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-[var(--text-muted)]">
                                {collabAsgs.length} atribuição{collabAsgs.length !== 1 ? "ões" : ""}
                              </span>
                              {ctxs.map(ctx => (
                                <span key={ctx} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-medium">
                                  {ctx}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => isEditing ? setEditingCollab(null) : openEditCollab(collab)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                              title="Editar"
                            >✏️</button>
                            <button
                              onClick={() => handleDeleteCollab(collab.id, collab.name)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--danger)]/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                              title="Excluir"
                            >🗑️</button>
                          </div>

                          {/* Expand icon */}
                          <span className={`text-[var(--text-muted)] text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                        </div>

                        {/* Edit collaborator inline */}
                        {isEditing && (
                          <div className="border-t border-[var(--border)] p-4 bg-[var(--bg-tertiary)]" onClick={e => e.stopPropagation()}>
                            {renderCollabForm(() => handleUpdateCollab(collab.id), "Salvar", () => setEditingCollab(null))}
                          </div>
                        )}

                        {/* Expanded: assignments */}
                        {isExpanded && !isEditing && (
                          <div className="border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                            {collabAsgs.length === 0 ? (
                              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                                Nenhuma atribuição. <button onClick={() => openNewAssignment(collab.id)} className="text-[var(--accent)] hover:underline cursor-pointer">Criar uma</button>
                              </div>
                            ) : (
                              <div className="divide-y divide-[var(--border)]">
                                {collabAsgs.map(asg => (
                                  <div key={asg.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-all group">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                                          {asg.category?.context || "?"}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                          {asg.category?.name || "?"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm font-medium">{asg.tool_name}</span>
                                        {asg.description && <span className="text-xs text-[var(--text-muted)]">· {asg.description}</span>}
                                        {asg.time_saved_minutes && asg.time_saved_minutes !== 2 && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)]">
                                            {asg.time_saved_minutes}min/exec
                                          </span>
                                        )}
                                        {asg.sub_links && asg.sub_links.length > 0 && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)]">
                                            +{asg.sub_links.length} funções
                                          </span>
                                        )}
                                      </div>
                                      <a href={asg.link} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] text-[var(--accent)] hover:underline truncate block mt-0.5">
                                        {asg.link}
                                      </a>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => openEditAssignment(asg)}
                                        className="w-7 h-7 rounded flex items-center justify-center text-[10px] cursor-pointer hover:bg-[var(--bg-primary)] text-[var(--text-muted)]"
                                        title="Editar">✏️</button>
                                      <button onClick={() => handleDeleteAssignment(asg.id)}
                                        className="w-7 h-7 rounded flex items-center justify-center text-[10px] cursor-pointer hover:bg-[var(--danger)]/10 text-[var(--text-muted)]"
                                        title="Excluir">🗑️</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="px-4 py-3 border-t border-[var(--border)]">
                              <button onClick={() => openNewAssignment(collab.id)}
                                className="text-xs text-[var(--accent)] hover:underline cursor-pointer">
                                + Nova atribuição para {collab.name}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== TAB: SETORES ===== */}
        {activeTab === "sectors" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Context tabs */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {CONTEXTS.map(ctx => {
                const count = categories.filter(c => (c.context || "IGAM") === ctx).length;
                return (
                  <button key={ctx} onClick={() => setSectorFilterCtx(ctx)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      sectorFilterCtx === ctx ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                    }`}>
                    {ctx} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Sector grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectorsForTab.map(cat => {
                const catAsgs = assignments.filter(a => a.category_id === cat.id);
                const isEditingThis = editingSector?.id === cat.id;

                return (
                  <div key={cat.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-[var(--accent)] text-white px-4 py-2.5 flex items-center justify-between">
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="text" value={sectorName} onChange={e => setSectorName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleRenameSector(); }}
                            className="bg-white/20 text-white placeholder:text-white/50 rounded px-2 py-1 text-xs flex-1 outline-none"
                            autoFocus />
                          <button onClick={handleRenameSector} className="text-xs bg-white/20 px-2 py-1 rounded cursor-pointer hover:bg-white/30">✓</button>
                          <button onClick={() => setEditingSector(null)} className="text-xs bg-white/20 px-2 py-1 rounded cursor-pointer hover:bg-white/30">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold">{cat.name}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleMoveSector(cat.id, "up")}
                              className="text-white/70 hover:text-white cursor-pointer text-xs px-1" title="Mover para cima">▲</button>
                            <button onClick={() => handleMoveSector(cat.id, "down")}
                              className="text-white/70 hover:text-white cursor-pointer text-xs px-1" title="Mover para baixo">▼</button>
                            <button onClick={() => { setEditingSector(cat); setSectorName(cat.name); }}
                              className="text-white/70 hover:text-white cursor-pointer text-xs px-1">✏️</button>
                            <button onClick={() => handleDeleteSector(cat)}
                              className="text-white/70 hover:text-white cursor-pointer text-xs px-1">🗑️</button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Collaborators in sector */}
                    <div className="p-3 space-y-2">
                      {catAsgs.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] text-center py-4">Setor vazio</p>
                      ) : (
                        catAsgs.map(asg => (
                          <div key={asg.id} className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all group">
                            <span className="text-lg">{asg.collaborator?.icon || "⚡"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{asg.collaborator?.name || "?"}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {asg.tool_name}{asg.description ? ` · ${asg.description}` : ""}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openEditAssignment(asg)}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer">✏️</button>
                              <button onClick={() => handleDeleteAssignment(asg.id)}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer">🗑️</button>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="text-[10px] text-[var(--text-muted)] text-right pt-1">
                        {catAsgs.length} colaborador{catAsgs.length !== 1 ? "es" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* New sector card */}
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center gap-3 min-h-[160px]">
                <input type="text" value={newSectorName} onChange={e => setNewSectorName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreateSector(); }}
                  className="input-modern text-center !py-2 text-sm w-full"
                  placeholder={`Novo setor em ${sectorFilterCtx}...`} />
                <button onClick={handleCreateSector} disabled={!newSectorName.trim() || saving}
                  className="btn-primary !text-xs !py-2 w-full disabled:opacity-50">
                  + Criar Setor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: ATALHOS RÁPIDOS ===== */}
        {activeTab === "quicklinks" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Atalhos aparecem na parede do escritório. Todos com o mesmo visual.
              </p>

              {/* Preview */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--bg-tertiary)]">
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-3">Preview da Parede</label>
                <div className="flex gap-2 flex-wrap">
                  {quickLinks.map(ql => (
                    <span key={ql.id} className="px-3 py-1 text-white font-bold text-xs rounded cursor-default"
                      style={{ background: "#2D6B6B", border: "2px solid #C4A460" }}>
                      {ql.icon} {ql.label}
                    </span>
                  ))}
                  {quickLinks.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)]">Nenhum atalho ainda</span>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {quickLinks.map((ql, idx) => (
                  <div key={ql.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3 group hover:shadow-sm transition-all">
                    <span className="text-2xl">{ql.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{ql.label}</div>
                      <a href={ql.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline truncate block">{ql.url}</a>
                    </div>
                    {/* Botões mover ↑↓ */}
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMoveQL(ql.id, "up")} disabled={idx === 0 || saving}
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-default transition-all">▲</button>
                      <button onClick={() => handleMoveQL(ql.id, "down")} disabled={idx === quickLinks.length - 1 || saving}
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-default transition-all">▼</button>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">#{idx + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEditQL(ql)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all">✏️</button>
                      <button onClick={() => handleDeleteQL(ql.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--danger)]/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button onClick={() => { setShowNewQL(true); setEditingQL(null); setQlLabel(""); setQlUrl(""); setQlIcon("🔗"); }}
                className="btn-primary w-full !text-sm">+ Novo Atalho</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL: New/Edit Collaborator ===== */}
      {showNewCollab && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewCollab(false)}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">Novo Colaborador</h2>
              <button onClick={() => setShowNewCollab(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]">×</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {renderCollabForm(handleCreateCollab, "Criar Colaborador", () => setShowNewCollab(false))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: New/Edit Assignment ===== */}
      {showNewAssignment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowNewAssignment(null); setEditingAsg(null); }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">{editingAsg ? "Editar Atribuição" : "Nova Atribuição"}</h2>
              <button onClick={() => { setShowNewAssignment(null); setEditingAsg(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]">×</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Collaborator name */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                <span className="text-xl">{collaborators.find(c => c.id === showNewAssignment)?.icon || "⚡"}</span>
                <span className="text-sm font-medium">{collaborators.find(c => c.id === showNewAssignment)?.name || "?"}</span>
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Contexto</label>
                <div className="flex gap-1.5">
                  {CONTEXTS.map(ctx => (
                    <button key={ctx} onClick={() => { setAsgCtx(ctx); setAsgCatId(""); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        asgCtx === ctx ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}>{ctx}</button>
                  ))}
                </div>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Setor *</label>
                {catsForAssignment.length > 0 ? (
                  <select value={asgCatId} onChange={e => setAsgCatId(e.target.value)} className="input-modern cursor-pointer">
                    <option value="">Selecione...</option>
                    {catsForAssignment.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] py-3 text-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                    Nenhum setor em {asgCtx}
                  </p>
                )}
              </div>

              {/* Tool */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">IA / Ferramenta *</label>
                <input type="text" value={asgTool} onChange={e => setAsgTool(e.target.value)}
                  className="input-modern" placeholder="Ex: Claude, ChatGPT..." />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Função</label>
                <input type="text" value={asgDesc} onChange={e => setAsgDesc(e.target.value)}
                  className="input-modern" placeholder="Ex: Melhorador de E-mails..." />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Link *</label>
                <input type="url" value={asgLink} onChange={e => setAsgLink(e.target.value)}
                  className="input-modern" placeholder="https://..." />
              </div>

              {/* Sub-links */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Funções extras</label>
                {asgSubLinks.map((sl, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" value={sl.label}
                      onChange={e => { const u = [...asgSubLinks]; u[idx] = { ...u[idx], label: e.target.value }; setAsgSubLinks(u); }}
                      className="input-modern flex-1" placeholder="Nome" />
                    <input type="url" value={sl.url}
                      onChange={e => { const u = [...asgSubLinks]; u[idx] = { ...u[idx], url: e.target.value }; setAsgSubLinks(u); }}
                      className="input-modern flex-[2]" placeholder="https://..." />
                    <button onClick={() => setAsgSubLinks(asgSubLinks.filter((_, i) => i !== idx))}
                      className="text-[var(--danger)] px-2 cursor-pointer">✕</button>
                  </div>
                ))}
                <button onClick={() => setAsgSubLinks([...asgSubLinks, { label: "", url: "" }])}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer">+ Adicionar função extra</button>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button onClick={() => setAsgType("manual")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer ${asgType === "manual" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>Manual</button>
                  <button onClick={() => setAsgType("automatic")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer ${asgType === "automatic" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>Auto</button>
                </div>
              </div>

              {/* Time saved */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Tempo economizado por execução (min)</label>
                <input type="number" min={1} max={120} value={asgTimeSaved} onChange={e => setAsgTimeSaved(Number(e.target.value) || 2)}
                  className="input-modern !w-24" />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Estimativa de minutos que cada uso dessa função economiza</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowNewAssignment(null); setEditingAsg(null); }} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSaveAssignment} disabled={!asgTool || !asgLink || !asgCatId || saving}
                  className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? "Salvando..." : editingAsg ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: New/Edit Quick-Link ===== */}
      {showNewQL && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowNewQL(false); setEditingQL(null); }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editingQL ? "Editar Atalho" : "Novo Atalho"}</h3>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Ícone</label>
              <div className="flex gap-1.5 flex-wrap">
                {QL_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setQlIcon(i)}
                    className={`text-lg w-9 h-9 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                      qlIcon === i ? "bg-[var(--accent-soft)] border-2 border-[var(--accent)] scale-110" : "bg-[var(--bg-primary)] border border-[var(--border)]"
                    }`}>{i}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Nome</label>
              <input type="text" value={qlLabel} onChange={e => setQlLabel(e.target.value)} className="input-modern" placeholder="Ex: JARBAS, 2° Cérebro..." />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">URL</label>
              <input type="url" value={qlUrl} onChange={e => setQlUrl(e.target.value)} className="input-modern" placeholder="https://..." />
            </div>
            <div className="flex gap-2">
              {editingQL && (
                <button onClick={() => { handleDeleteQL(editingQL.id); setShowNewQL(false); setEditingQL(null); }}
                  className="btn-secondary !text-[var(--danger)] flex-1">Excluir</button>
              )}
              <button onClick={() => { setShowNewQL(false); setEditingQL(null); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSaveQL} disabled={!qlLabel || !qlUrl || saving}
                className="btn-primary flex-1 disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Collaborator form renderer ----
  function renderCollabForm(onSubmit: () => void, submitLabel: string, onCancel: () => void) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome</label>
          <input type="text" value={collabName} onChange={e => setCollabName(e.target.value)}
            className="input-modern" placeholder="Ex: Donna, Tony, Izzy..." autoFocus />
        </div>

        {/* Bio/Detalhamento */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Detalhamento</label>
          <textarea value={collabBio} onChange={e => setCollabBio(e.target.value)}
            className="input-modern resize-none" rows={3}
            placeholder="Descreva o perfil, habilidades, papel no escritório..." />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Status</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCollabStatus("active")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                collabStatus === "active" ? "bg-[var(--success)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"
              }`}>
              ✅ Ativo
            </button>
            <button type="button" onClick={() => setCollabStatus("dismissed")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                collabStatus === "dismissed" ? "bg-[var(--danger)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"
              }`}>
              Desligado
            </button>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Gênero</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setGender("male")}
              className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${gender === "male" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
              👨 Masculino</button>
            <button type="button" onClick={() => setGender("female")}
              className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${gender === "female" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
              👩 Feminino</button>
          </div>
        </div>

        {/* Skin */}
        <div>
          <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Tom de pele</span>
          <div className="flex gap-1.5">
            {SKIN_COLORS.map((color, i) => (
              <button key={i} type="button" onClick={() => setSkinTone(i)}
                className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 ${skinTone === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }} title={SKIN_NAMES[i]} />
            ))}
          </div>
        </div>

        {/* Hair */}
        <div>
          <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Cor do cabelo</span>
          <div className="flex gap-1.5 flex-wrap">
            {HAIR_COLORS.map((color, i) => (
              <button key={i} type="button" onClick={() => setHairColor(i)}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all border-2 ${hairColor === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }} title={HAIR_NAMES[i]} />
            ))}
          </div>
        </div>

        {/* Shirt */}
        <div>
          <span className="text-xs text-[var(--text-muted)] mb-1.5 block">Cor da camisa</span>
          <div className="flex gap-1.5 flex-wrap">
            {SHIRT_COLORS.map((color, i) => (
              <button key={i} type="button" onClick={() => setShirtColor(i)}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all border-2 ${shirtColor === i ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>

        {/* Glasses */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setHasGlasses(!hasGlasses)}
            className={`w-10 h-6 rounded-full cursor-pointer transition-all relative ${hasGlasses ? "bg-[var(--accent)]" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${hasGlasses ? "left-4" : "left-0.5"}`} />
          </button>
          <span className="text-xs text-[var(--text-muted)]">Usa óculos</span>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Ícone</label>
          <div className="flex gap-1.5 flex-wrap">
            {ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                className={`text-lg w-9 h-9 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                  icon === i ? "bg-[var(--accent-soft)] border-2 border-[var(--accent)] scale-110" : "bg-[var(--bg-primary)] border border-[var(--border)]"
                }`}>{i}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={onSubmit} disabled={!collabName.trim() || saving}
            className="btn-primary flex-1 disabled:opacity-50">
            {saving ? "Salvando..." : submitLabel}
          </button>
        </div>
      </div>
    );
  }
}
