"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/lib/types";
import { getProductsByCategory, addProduct, updateProduct, deleteProduct } from "@/lib/storage";

// =============================================
// Painel de Produtos — entregas/portfólio por área
// =============================================

interface ProductsPanelProps {
  categoryId: string;
  /** Múltiplos IDs para exibir entregas de área inteira */
  categoryIds?: string[];
  categoryName: string;
  onClose: () => void;
}

export default function ProductsPanel({ categoryId, categoryIds, categoryName, onClose }: ProductsPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creationLink, setCreationLink] = useState("");
  const [finalLink, setFinalLink] = useState("");

  // Which IDs to load from
  const allIds = categoryIds && categoryIds.length > 0 ? categoryIds : [categoryId];

  const loadProducts = useCallback(async () => {
    try {
      const results = await Promise.all(allIds.map(id => getProductsByCategory(id)));
      setProducts(results.flat());
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, categoryIds?.join(",")]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCreationLink(""); setFinalLink("");
    setEditingProduct(null); setShowForm(false);
  };

  const openEdit = (p: Product) => {
    setTitle(p.title);
    setDescription(p.description || "");
    setCreationLink(p.creation_link || "");
    setFinalLink(p.final_link || "");
    setEditingProduct(p);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          title: title.trim(), description, creation_link: creationLink, final_link: finalLink,
        });
      } else {
        await addProduct({
          category_id: categoryId, title: title.trim(),
          description, creation_link: creationLink, final_link: finalLink,
        });
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    setSaving(true);
    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (err) {
      console.error("Erro ao excluir:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold">Produtos & Entregas</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              📁 {categoryName} · {products.length} {products.length !== 1 ? "produtos" : "produto"}
            </p>
          </div>
          <button onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <span className="text-2xl animate-pulse">📁</span>
              <p className="text-sm text-[var(--text-muted)] mt-2">Carregando...</p>
            </div>
          ) : products.length === 0 && !showForm ? (
            <div className="text-center py-10">
              <span className="text-4xl mb-3 block">📁</span>
              <p className="text-sm text-[var(--text-muted)] mb-4">Nenhum produto cadastrado nesta área</p>
              <button onClick={() => setShowForm(true)} className="btn-primary !text-sm">
                + Adicionar Primeiro Produto
              </button>
            </div>
          ) : (
            <>
              {products.map(p => (
                <div key={p.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 group hover:border-[var(--accent)] transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{p.title}</h3>
                      {p.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {p.creation_link && (
                          <a href={p.creation_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-white transition-all no-underline">
                            🎨 Projeto
                          </a>
                        )}
                        {p.final_link && (
                          <a href={p.final_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] font-medium hover:bg-[var(--warning)] hover:text-white transition-all no-underline">
                            🚀 Produto Final
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">✏️</button>
                      <button onClick={() => handleDelete(p.id)}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--danger)]/10 text-[var(--text-muted)]">🗑️</button>
                    </div>
                  </div>
                  {p.created_at && (
                    <p className="text-[9px] text-[var(--text-muted)] mt-2">
                      Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold">{editingProduct ? "Editar Produto" : "Novo Produto"}</h4>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Título *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="input-modern !py-2 text-sm" placeholder="Ex: Dashboard de indicadores..." autoFocus />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="input-modern !py-2 text-sm resize-none" rows={2}
                  placeholder="Breve descrição do produto..." />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Link do Projeto (criação)</label>
                <input type="url" value={creationLink} onChange={e => setCreationLink(e.target.value)}
                  className="input-modern !py-2 text-sm" placeholder="https://canva.com/design/..." />
                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Ex: Canva, Figma, Google Docs...</p>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Link do Produto Final</label>
                <input type="url" value={finalLink} onChange={e => setFinalLink(e.target.value)}
                  className="input-modern !py-2 text-sm" placeholder="https://app.powerbi.com/..." />
                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Ex: Dashboard publicado, site, relatório</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={resetForm} className="btn-secondary flex-1 !py-2 !text-xs">Cancelar</button>
                <button onClick={handleSave} disabled={!title.trim() || saving}
                  className="btn-primary flex-1 !py-2 !text-xs disabled:opacity-50">
                  {saving ? "Salvando..." : editingProduct ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showForm && products.length > 0 && (
          <div className="p-4 border-t border-[var(--border)]">
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="btn-primary w-full !text-sm">
              + Novo Produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
