"use client";

import { useState, useEffect, useMemo } from "react";
import { Collaborator, Assignment, Category, SubLink, CONTEXTS } from "@/lib/types";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

interface ContratarModalProps {
  collaborators: Collaborator[];
  categories: Category[];
  defaultContext?: string;
  /** Se preenchido, estamos editando uma atribuição existente */
  editingAssignment?: Assignment | null;
  /** Se preenchido junto com editingAssignment, dados do colaborador */
  editingCollaborator?: Collaborator | null;
  /** Se preenchido, pre-seleciona a sala */
  defaultCategoryId?: string;
  onSaveCollaborator: (data: Omit<Collaborator, "id" | "user_id" | "created_at">) => Promise<Collaborator>;
  onUpdateCollaborator: (id: string, updates: Partial<Collaborator>) => Promise<void>;
  onSaveAssignment: (data: Omit<Assignment, "id" | "user_id" | "created_at" | "collaborator" | "category">) => Promise<void>;
  onUpdateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  onClose: () => void;
}

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

export default function ContratarModal({
  collaborators,
  categories,
  defaultContext,
  editingAssignment,
  editingCollaborator,
  defaultCategoryId,
  onSaveCollaborator,
  onUpdateCollaborator,
  onSaveAssignment,
  onUpdateAssignment,
  onClose,
}: ContratarModalProps) {
  // Etapa: "select" = escolher/criar colaborador, "assign" = definir função
  const [step, setStep] = useState<"select" | "create" | "assign">(
    editingAssignment ? "assign" : "select"
  );

  // --- Colaborador selecionado ---
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(
    editingCollaborator || null
  );

  // --- Campos do colaborador (criação/edição) ---
  const [collabName, setCollabName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [skinTone, setSkinTone] = useState(0);
  const [hairColor, setHairColor] = useState(0);
  const [shirtColor, setShirtColor] = useState(1);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [icon, setIcon] = useState("⚡");
  const [editingCollab, setEditingCollab] = useState(false);

  // --- Campos da atribuição ---
  const [selectedContext, setSelectedContext] = useState(defaultContext || "IGAM");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [toolName, setToolName] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"manual" | "automatic">("manual");
  const [subLinks, setSubLinks] = useState<SubLink[]>([]);

  // Categorias filtradas por contexto
  const filteredCategories = useMemo(() => {
    return categories.filter(c => (c.context || "IGAM") === selectedContext);
  }, [categories, selectedContext]);

  // Auto-selecionar primeira categoria ao mudar contexto (ou resetar se inválida)
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const isValid = filteredCategories.some(c => c.id === categoryId);
      if (!isValid) {
        setCategoryId(filteredCategories[0].id);
      }
    }
  }, [selectedContext, filteredCategories, categoryId]);

  // Preencher campos ao editar
  useEffect(() => {
    if (editingAssignment) {
      setToolName(editingAssignment.tool_name);
      setLink(editingAssignment.link);
      setDescription(editingAssignment.description || "");
      setType(editingAssignment.type);
      setSubLinks(editingAssignment.sub_links || []);
      setCategoryId(editingAssignment.category_id);
      // Detectar contexto da categoria
      const cat = categories.find(c => c.id === editingAssignment.category_id);
      if (cat) setSelectedContext(cat.context || "IGAM");
    }
    if (editingCollaborator) {
      setCollabName(editingCollaborator.name);
      setGender(editingCollaborator.gender);
      setSkinTone(editingCollaborator.skin_tone);
      setHairColor(editingCollaborator.hair_color);
      setShirtColor(editingCollaborator.shirt_color);
      setHasGlasses(editingCollaborator.has_glasses);
      setIcon(editingCollaborator.icon);
    }
  }, [editingAssignment, editingCollaborator, categories]);

  // Selecionar colaborador existente → ir para atribuição
  const handleSelectCollab = (c: Collaborator) => {
    setSelectedCollab(c);
    setCollabName(c.name);
    setGender(c.gender);
    setSkinTone(c.skin_tone);
    setHairColor(c.hair_color);
    setShirtColor(c.shirt_color);
    setHasGlasses(c.has_glasses);
    setIcon(c.icon);
    setStep("assign");
  };

  // Criar novo colaborador
  const handleCreateCollab = async () => {
    if (!collabName.trim()) return;
    const collab = await onSaveCollaborator({
      name: collabName.trim(),
      gender, skin_tone: skinTone, hair_color: hairColor,
      shirt_color: shirtColor, has_glasses: hasGlasses, icon,
    });
    setSelectedCollab(collab);
    setStep("assign");
  };

  // Salvar atribuição
  const handleSaveAssignment = async () => {
    if (!selectedCollab || !toolName || !link || !categoryId) return;

    // Se estava editando aparência do colaborador, salvar
    if (editingCollab && selectedCollab) {
      await onUpdateCollaborator(selectedCollab.id, {
        name: collabName.trim(),
        gender, skin_tone: skinTone, hair_color: hairColor,
        shirt_color: shirtColor, has_glasses: hasGlasses, icon,
      });
    }

    if (editingAssignment) {
      await onUpdateAssignment(editingAssignment.id, {
        collaborator_id: selectedCollab.id,
        category_id: categoryId,
        tool_name: toolName,
        link,
        description,
        type,
        sub_links: subLinks.filter(sl => sl.label && sl.url),
      });
    } else {
      await onSaveAssignment({
        collaborator_id: selectedCollab.id,
        category_id: categoryId,
        tool_name: toolName,
        link,
        description,
        type,
        sub_links: subLinks.filter(sl => sl.label && sl.url),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {editingAssignment ? "Editar Atribuição" : step === "select" ? "Selecionar Colaborador" : step === "create" ? "Novo Colaborador" : "Definir Função"}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]">×</button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* ========== ETAPA 1: Selecionar colaborador ========== */}
          {step === "select" && (
            <div className="space-y-4">
              {collaborators.length > 0 && (
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Colaboradores existentes</label>
                  <div className="grid grid-cols-3 gap-2">
                    {collaborators.map(c => (
                      <button key={c.id} type="button" onClick={() => handleSelectCollab(c)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer transition-all bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                        <span className="text-2xl">{c.icon}</span>
                        <span className="text-xs font-medium truncate w-full text-center">{c.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{c.gender === "female" ? "👩" : "👨"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" onClick={() => setStep("create")}
                className="btn-primary w-full">
                + Criar Novo Colaborador
              </button>
            </div>
          )}

          {/* ========== ETAPA 1B: Criar colaborador ========== */}
          {step === "create" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome do colaborador</label>
                <input type="text" value={collabName} onChange={e => setCollabName(e.target.value)}
                  className="input-modern" placeholder="Ex: Bia, Ana, Técio..." />
              </div>

              {/* Gênero */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Gênero</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setGender("male")}
                    className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${gender === "male" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"}`}>
                    👨 Masculino
                  </button>
                  <button type="button" onClick={() => setGender("female")}
                    className={`flex-1 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${gender === "female" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"}`}>
                    👩 Feminino
                  </button>
                </div>
              </div>

              {/* Tom de pele */}
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

              {/* Cabelo */}
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

              {/* Camisa */}
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

              {/* Óculos */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHasGlasses(!hasGlasses)}
                  className={`w-10 h-6 rounded-full cursor-pointer transition-all relative ${hasGlasses ? "bg-[var(--accent)]" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${hasGlasses ? "left-4" : "left-0.5"}`} />
                </button>
                <span className="text-xs text-[var(--text-muted)]">Usa óculos</span>
              </div>

              {/* Ícone */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Ícone</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ICONS.map(i => (
                    <button key={i} type="button" onClick={() => setIcon(i)}
                      className={`text-lg w-9 h-9 rounded-lg cursor-pointer transition-all flex items-center justify-center ${icon === i ? "bg-[var(--accent-soft)] border-2 border-[var(--accent)] scale-110" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep("select")} className="btn-secondary flex-1">Voltar</button>
                <button type="button" onClick={handleCreateCollab} disabled={!collabName.trim()} className="btn-primary flex-1">Criar e Continuar</button>
              </div>
            </div>
          )}

          {/* ========== ETAPA 2: Definir função na sala ========== */}
          {step === "assign" && selectedCollab && (
            <div className="space-y-4">
              {/* Colaborador selecionado */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <span className="text-2xl">{selectedCollab.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{selectedCollab.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{selectedCollab.gender === "female" ? "👩 Feminino" : "👨 Masculino"}</div>
                </div>
                {!editingAssignment && (
                  <button type="button" onClick={() => { setSelectedCollab(null); setStep("select"); }}
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Trocar</button>
                )}
                <button type="button" onClick={() => setEditingCollab(!editingCollab)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  {editingCollab ? "Fechar" : "Editar visual"}
                </button>
              </div>

              {/* Edição inline da aparência */}
              {editingCollab && (
                <div className="space-y-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Nome</label>
                    <input type="text" value={collabName} onChange={e => setCollabName(e.target.value)} className="input-modern" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGender("male")}
                      className={`flex-1 py-1.5 rounded text-xs cursor-pointer ${gender === "male" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>👨 Masc</button>
                    <button type="button" onClick={() => setGender("female")}
                      className={`flex-1 py-1.5 rounded text-xs cursor-pointer ${gender === "female" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>👩 Fem</button>
                  </div>
                  <div className="flex gap-1">
                    {SKIN_COLORS.map((c, i) => (
                      <button key={i} type="button" onClick={() => setSkinTone(i)}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 ${skinTone === i ? "border-[var(--accent)]" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {HAIR_COLORS.map((c, i) => (
                      <button key={i} type="button" onClick={() => setHairColor(i)}
                        className={`w-5 h-5 rounded-full cursor-pointer border-2 ${hairColor === i ? "border-[var(--accent)]" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {SHIRT_COLORS.map((c, i) => (
                      <button key={i} type="button" onClick={() => setShirtColor(i)}
                        className={`w-5 h-5 rounded-full cursor-pointer border-2 ${shirtColor === i ? "border-[var(--accent)]" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                    <input type="checkbox" checked={hasGlasses} onChange={e => setHasGlasses(e.target.checked)} />
                    Óculos
                  </label>
                </div>
              )}

              {/* Aba (contexto) */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Aba *</label>
                <div className="flex gap-1.5">
                  {CONTEXTS.map(ctx => (
                    <button key={ctx} type="button" onClick={() => setSelectedContext(ctx)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${selectedContext === ctx ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]"}`}>
                      {ctx}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sala */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Sala em {selectedContext} *</label>
                {filteredCategories.length > 0 ? (
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input-modern cursor-pointer">
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] py-3 text-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                    Nenhuma sala em {selectedContext}.
                  </p>
                )}
              </div>

              {/* Ferramenta */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">IA / Ferramenta * <span className="text-[var(--text-muted)]">(plaquinha da mesa)</span></label>
                <input type="text" value={toolName} onChange={e => setToolName(e.target.value)}
                  className="input-modern" placeholder="Ex: Claude, ChatGPT, Midjourney..." required />
              </div>

              {/* Função */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Função <span className="text-[var(--text-muted)]">(botão principal)</span></label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  className="input-modern" placeholder="Ex: Melhorador de E-mails, Assistente..." />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Link *</label>
                <input type="url" value={link} onChange={e => setLink(e.target.value)}
                  className="input-modern" placeholder="https://..." required />
              </div>

              {/* Sub-links */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Funções extras</label>
                <DndContext collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const oldIdx = subLinks.findIndex((_, i) => `sl-${i}` === active.id);
                  const newIdx = subLinks.findIndex((_, i) => `sl-${i}` === over.id);
                  if (oldIdx < 0 || newIdx < 0) return;
                  const reordered = [...subLinks];
                  const [moved] = reordered.splice(oldIdx, 1);
                  reordered.splice(newIdx, 0, moved);
                  setSubLinks(reordered);
                }}>
                <SortableContext items={subLinks.map((_, i) => `sl-${i}`)} strategy={verticalListSortingStrategy}>
                {subLinks.map((sl, idx) => (
                  <SortableItem key={`sl-${idx}`} id={`sl-${idx}`} className="space-y-1 mb-3 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                    <div className="flex gap-2">
                      <span className="text-[var(--text-muted)] cursor-grab text-sm self-center">⠿</span>
                      <input type="text" value={sl.tool_name || ""} onChange={e => { const u = [...subLinks]; u[idx] = { ...u[idx], tool_name: e.target.value }; setSubLinks(u); }}
                        className="input-modern w-24" placeholder="IA/Ferramenta" />
                      <input type="text" value={sl.label} onChange={e => { const u = [...subLinks]; u[idx] = { ...u[idx], label: e.target.value }; setSubLinks(u); }}
                        className="input-modern flex-1" placeholder="Nome da função" />
                      <button type="button" onClick={() => setSubLinks(subLinks.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 px-2 cursor-pointer">✕</button>
                    </div>
                    <input type="url" value={sl.url} onChange={e => { const u = [...subLinks]; u[idx] = { ...u[idx], url: e.target.value }; setSubLinks(u); }}
                      className="input-modern w-full" placeholder="https://..." />
                  </SortableItem>
                ))}
                </SortableContext>
                </DndContext>
                <button type="button" onClick={() => setSubLinks([...subLinks, { label: "", url: "" }])}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer">+ Adicionar função extra</button>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType("manual")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer ${type === "manual" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>Manual</button>
                  <button type="button" onClick={() => setType("automatic")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer ${type === "automatic" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>Auto</button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {!editingAssignment && (
                  <button type="button" onClick={() => { setSelectedCollab(null); setStep("select"); }} className="btn-secondary flex-1">Voltar</button>
                )}
                <button type="button" onClick={onClose} className={`btn-secondary ${editingAssignment ? "flex-1" : ""}`}>Cancelar</button>
                <button type="button" onClick={handleSaveAssignment} disabled={!toolName || !link || !categoryId}
                  className="btn-primary flex-1">{editingAssignment ? "Salvar" : "Contratar"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
