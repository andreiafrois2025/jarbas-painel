"use client";

import { useState, useEffect, useMemo } from "react";
import { Squad, CONTEXTS } from "@/lib/types";
import { getSquads, addSquad, updateSquad, deleteSquad } from "@/lib/storage";

interface SquadsPageProps {
  onNavigate: (page: string) => void;
}

const CONTEXT_ICONS: Record<string, string> = {
  "IGAM": "🏛️",
  "AndréIA": "🤖",
  "Pessoal": "👤",
  "Família": "🏠",
};

export default function SquadsPage({ onNavigate }: SquadsPageProps) {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContext, setSelectedContext] = useState<string>(CONTEXTS[1]); // AndréIA padrão
  const [showForm, setShowForm] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "📸",
    link: "",
    contexts: [] as string[],
    status: "active" as "active" | "inactive",
  });

  const loadSquads = async () => {
    try {
      const data = await getSquads();
      setSquads(data);
    } catch (err) {
      console.error("Erro ao carregar squads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSquads();
  }, []);

  const squadsInContext = useMemo(() =>
    squads.filter(s =>
      (s.status || "active") === "active" &&
      (s.contexts || []).includes(selectedContext)
    ),
  [squads, selectedContext]);

  const openAdd = () => {
    setEditingSquad(null);
    setForm({ name: "", description: "", icon: "📸", link: "", contexts: [selectedContext], status: "active" });
    setShowForm(true);
  };

  const openEdit = (squad: Squad) => {
    setEditingSquad(squad);
    setForm({
      name: squad.name,
      description: squad.description || "",
      icon: squad.icon || "📸",
      link: squad.link || "",
      contexts: squad.contexts || [],
      status: squad.status || "active",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingSquad) {
        await updateSquad(editingSquad.id, form);
      } else {
        await addSquad(form);
      }
      await loadSquads();
      setShowForm(false);
    } catch (err) {
      console.error("Erro ao salvar squad:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este squad?")) return;
    try {
      await deleteSquad(id);
      await loadSquads();
    } catch (err) {
      console.error("Erro ao excluir squad:", err);
    }
  };

  const toggleContext = (ctx: string) => {
    setForm(f => ({
      ...f,
      contexts: f.contexts.includes(ctx)
        ? f.contexts.filter(c => c !== ctx)
        : [...f.contexts, ctx],
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[var(--text-secondary)] animate-pulse">Carregando squads...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0 h-14">
        <button onClick={() => onNavigate("office")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
          ← Escritório
        </button>
        <h1 className="text-lg font-semibold">Squads</h1>
        <span className="text-[var(--text-secondary)] text-sm">
          <span className="text-[var(--text-primary)] font-medium">{squads.filter(s => s.status !== "inactive").length}</span> ativos
        </span>
        <div className="flex-1" />
        <button onClick={openAdd} className="btn-primary !py-2 !px-4 text-sm">
          + Novo Squad
        </button>
      </header>

      {/* Body: split layout */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="win-border-outset flex h-full" style={{ background: "var(--win-surface)" }}>

          {/* Left — Context list */}
          <div className="shrink-0 border-r border-[var(--border)] flex flex-col" style={{ width: 180, background: "var(--bg-secondary)" }}>
            <div className="win-titlebar" style={{ fontSize: 10 }}>Setores</div>
            <div className="flex-1 overflow-auto py-1">
              {CONTEXTS.map(ctx => {
                const count = squads.filter(s => s.status !== "inactive" && (s.contexts || []).includes(ctx)).length;
                return (
                  <button
                    key={ctx}
                    onClick={() => setSelectedContext(ctx)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all text-sm cursor-pointer ${
                      selectedContext === ctx
                        ? "bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{CONTEXT_ICONS[ctx] || "📁"}</span>
                    <span className="flex-1 truncate">{ctx}</span>
                    {count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: selectedContext === ctx ? "var(--accent)" : "var(--bg-tertiary)", color: selectedContext === ctx ? "#fff" : "var(--text-muted)" }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Squads list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="win-titlebar" style={{ fontSize: 10 }}>
              {CONTEXT_ICONS[selectedContext]} {selectedContext} — Squads
            </div>
            <div className="flex-1 overflow-auto p-4">
              {squadsInContext.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <span className="text-4xl opacity-30">🤖</span>
                  <p className="text-sm text-[var(--text-secondary)]">Nenhum squad em {selectedContext}</p>
                  <button onClick={openAdd} className="btn-secondary !py-1.5 !px-3 text-xs">
                    + Criar primeiro squad
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {squadsInContext.map(squad => (
                    <div key={squad.id} className="room-card group relative" style={{ cursor: "default" }}>
                      <div className="room-card-header flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span>{squad.icon || "📸"}</span>
                          <span className="truncate">{squad.name}</span>
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(squad)} className="text-white/70 hover:text-white px-1.5 py-0.5 rounded text-xs cursor-pointer" title="Editar">✏️</button>
                          <button onClick={() => handleDelete(squad.id)} className="text-white/70 hover:text-white px-1.5 py-0.5 rounded text-xs cursor-pointer" title="Excluir">🗑️</button>
                        </div>
                      </div>
                      <div className="room-card-body flex-col !items-start gap-2">
                        {squad.description && (
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{squad.description}</p>
                        )}
                        {/* Badge dos contextos */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(squad.contexts || []).map(ctx => (
                            <span key={ctx} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: ctx === selectedContext ? "var(--af-teal)" : "var(--bg-tertiary)", color: ctx === selectedContext ? "#fff" : "var(--text-muted)" }}>
                              {CONTEXT_ICONS[ctx]} {ctx}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Botão abrir */}
                      {squad.link && (
                        <div className="px-3 pb-2">
                          <a href={squad.link} target="_blank" rel="noopener noreferrer"
                            className="block text-center text-[10px] font-bold py-1 rounded transition-all hover:brightness-110 no-underline"
                            style={{ background: "var(--af-teal)", color: "#fff", border: "1px solid var(--af-gold)" }}>
                            ▶ Abrir Squad
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal — Criar/Editar Squad */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
              <h2 className="font-semibold">{editingSquad ? "Editar Squad" : "Novo Squad"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Nome + Ícone */}
              <div className="flex gap-3">
                <div className="shrink-0">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Ícone</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    className="input-modern !w-14 text-center text-xl" maxLength={2} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Nome do Squad *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-modern" placeholder="Fábrica de Carrosséis" />
                </div>
              </div>
              {/* Descrição */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-modern resize-none" rows={2}
                  placeholder="Pipeline: Mike pesquisa → Izzy escreve → Felipe design" />
              </div>
              {/* Link */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Link (opcional)</label>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  className="input-modern" placeholder="https://..." />
              </div>
              {/* Setores */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-2">Setores onde este squad atua</label>
                <div className="flex flex-wrap gap-2">
                  {CONTEXTS.map(ctx => (
                    <button key={ctx} type="button" onClick={() => toggleContext(ctx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        form.contexts.includes(ctx)
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                      }`}>
                      {CONTEXT_ICONS[ctx]} {ctx}
                      {form.contexts.includes(ctx) && <span className="text-green-400">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || form.contexts.length === 0}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? "Salvando..." : editingSquad ? "Salvar" : "Criar Squad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
