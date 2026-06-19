"use client";

import { useState, useRef, useEffect } from "react";
import { Squad, SquadDocument } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface StartSquadModalProps {
  squad: Squad | null;
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractSquadCode(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    const code = url.searchParams.get("squad");
    if (code) return code;
    const match = url.pathname.match(/(?:runner|office)\/([\w-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default function StartSquadModal({ squad, open, onClose }: StartSquadModalProps) {
  const [topic, setTopic] = useState("");
  const [documents, setDocuments] = useState<SquadDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ jobId: string; squadCode: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resetar estado ao reabrir
  useEffect(() => {
    if (open) {
      setTopic("");
      setDocuments([]);
      setUploadError(null);
      setError(null);
      setSuccess(null);
    }
  }, [open, squad?.id]);

  if (!open || !squad) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logada para subir arquivos.");
      const jobFolder = `run-${Date.now()}`;
      const uploaded: SquadDocument[] = [];
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${squad.id}/jobs/${jobFolder}/${timestamp}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("squad-documents")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw new Error(`Erro ao subir ${file.name}: ${upErr.message}`);
        const { data: pub } = supabase.storage.from("squad-documents").getPublicUrl(path);
        uploaded.push({
          name: file.name,
          url: pub.publicUrl,
          path,
          size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
        });
      }
      setDocuments(d => [...d, ...uploaded]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro desconhecido no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = async (doc: SquadDocument) => {
    if (!confirm(`Remover "${doc.name}"?`)) return;
    try {
      await supabase.storage.from("squad-documents").remove([doc.path]);
    } catch (err) {
      console.warn("Erro ao deletar do storage:", err);
    }
    setDocuments(d => d.filter(x => x.path !== doc.path));
  };

  const handleRun = async () => {
    if (!topic.trim()) return;
    const code = extractSquadCode(squad.link);
    if (!code) {
      setError("Não consegui descobrir o código da squad pelo link cadastrado. Edite o squad e adicione um link no formato https://squad.srv1536795.hstgr.cloud/office?squad=NOMEDOCODIGO");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("https://squad.srv1536795.hstgr.cloud/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          squad: code,
          topic: topic.trim(),
          documents,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Servidor respondeu ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setSuccess({ jobId: data.jobId || "?", squadCode: code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao iniciar a squad.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="font-semibold flex items-center gap-2">
            <span>{squad.icon || "▶️"}</span>
            <span>Iniciar {squad.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none cursor-pointer"
          >×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!success ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Tópico / instrução inicial
                </label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ex.: contratar ArcGIS por inexigibilidade. SEI 2240.01.0004530/2025-12. Modalidade: inexigibilidade. Valor estimado R$ 377 mil. Empresa: Imagem Geosistemas."
                  className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  autoFocus
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Os agentes recebem esse texto como contexto inicial. Quanto mais detalhe, melhor.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[var(--text-primary)]">
                    📎 Documentos desta execução ({documents.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? "Enviando..." : "+ Anexar arquivo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.zip"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-tight">
                  Arquivos específicos deste processo: proposta da empresa, carta de exclusividade, ETP de processo similar, notas fiscais comparativas. Os agentes leem esses arquivos antes de começar.
                </p>
                {uploadError && (
                  <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded mb-2 whitespace-pre-wrap">
                    {uploadError}
                  </div>
                )}
                {documents.length > 0 && (
                  <ul className="space-y-1 max-h-32 overflow-auto bg-[var(--bg-tertiary)] rounded-lg p-2">
                    {documents.map((doc) => (
                      <li key={doc.path} className="flex items-center gap-2 text-[11px] group">
                        <span className="text-base shrink-0">
                          {doc.mime_type?.startsWith("image/") ? "🖼️"
                            : doc.mime_type === "application/pdf" ? "📕"
                            : doc.mime_type?.includes("word") ? "📘"
                            : doc.mime_type?.includes("sheet") || doc.mime_type?.includes("excel") ? "📗"
                            : doc.mime_type === "application/zip" ? "🗜️"
                            : "📄"}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-[var(--text-primary)] hover:text-[var(--accent)] no-underline"
                          title={doc.name}
                        >
                          {doc.name}
                        </a>
                        <span className="text-[var(--text-muted)] shrink-0 text-[10px]">{formatBytes(doc.size)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc)}
                          className="text-[var(--text-muted)] hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {squad.description && (
                <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <strong className="text-[var(--text-primary)]">Sobre essa squad:</strong> {squad.description}
                </div>
              )}

              {(squad.documents && squad.documents.length > 0) && (
                <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <strong className="text-[var(--text-primary)]">📚 Modelos fixos desta squad:</strong> {squad.documents.length} arquivo(s) — serão lidos junto com os desta execução.
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-lg whitespace-pre-wrap">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-emerald-400 text-2xl text-center">✅</div>
              <p className="text-sm text-center font-medium">
                Squad iniciada com sucesso!
              </p>
              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-lg space-y-1">
                <div><strong>Job ID:</strong> <code className="text-[var(--accent)]">{success.jobId}</code></div>
                <div><strong>Squad:</strong> <code className="text-[var(--accent)]">{success.squadCode}</code></div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] text-center">
                Abra o Escritório Virtual para acompanhar a execução em tempo real.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5 border-t border-[var(--border)] pt-4">
          {!success ? (
            <>
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={starting}
              >Cancelar</button>
              <button
                onClick={handleRun}
                disabled={starting || !topic.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {starting ? "Iniciando..." : "▶️ Iniciar agora"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
              >Fechar</button>
              <a
                href={squad.link || `https://squad.srv1536795.hstgr.cloud/office?squad=${success.squadCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 text-center no-underline"
              >🏢 Abrir Escritório</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
