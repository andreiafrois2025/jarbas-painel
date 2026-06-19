"use client";

import { useEffect, useState, useCallback } from "react";

const SQUAD_API_BASE = "https://squad.srv1536795.hstgr.cloud";
const POLL_INTERVAL_MS = 5000;

interface Job {
  jobId: string;
  squad: string;
  topic: string;
  status: "running" | "completed" | "failed" | "cancelled" | "rejected" | "interrupted";
  startedAt: string;
  completedAt?: string;
  cancelReason?: string;
  outputUrl?: string;
}

interface PendingCheckpoint {
  jobId: string;
  stepId: string;
  stepName: string;
  stepPrompt: string;
  producedFiles: Array<{ name: string; size: number }>;
  createdAt: string;
}

interface JobFile {
  name: string;
  size: number;
  mtime: string;
}

export default function JobsMonitor() {
  const [runningJobs, setRunningJobs] = useState<Job[]>([]);
  const [pendings, setPendings] = useState<Record<string, PendingCheckpoint[]>>({});
  const [expanded, setExpanded] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ jobId: string; name: string; content: string } | null>(null);
  const [filesList, setFilesList] = useState<{ jobId: string; files: JobFile[] } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ jobId: string; stepId: string; stepName: string } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const jobsRes = await fetch(`${SQUAD_API_BASE}/api/jobs`);
      if (!jobsRes.ok) return;
      const jobs: Job[] = await jobsRes.json();
      const running = jobs.filter((j) => j.status === "running");
      setRunningJobs(running);

      const pendingMap: Record<string, PendingCheckpoint[]> = {};
      await Promise.all(running.map(async (j) => {
        try {
          const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${j.jobId}/pending`);
          if (r.ok) {
            const data = await r.json();
            if (data.pendings && data.pendings.length > 0) {
              pendingMap[j.jobId] = data.pendings;
            }
          }
        } catch {}
      }));
      setPendings(pendingMap);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const pendingCount = Object.values(pendings).reduce((acc, arr) => acc + arr.length, 0);
  const hasAnything = runningJobs.length > 0 || pendingCount > 0;

  if (!hasAnything) return null;

  async function approveCheckpoint(jobId: string, stepId: string, approved: boolean, comment?: string) {
    const key = `${jobId}:${stepId}`;
    setActionLoading(key);
    try {
      await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, approved, comment: comment || "" }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function stopJob(jobId: string) {
    if (!confirm("Parar este job? O squad vai ser interrompido e o que já foi produzido continua salvo.")) return;
    setActionLoading(jobId);
    try {
      await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/stop`, { method: "POST" });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function openFile(jobId: string, name: string) {
    const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/files/${encodeURIComponent(name)}`);
    const content = await r.text();
    setViewingFile({ jobId, name, content });
  }

  async function listFiles(jobId: string) {
    const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/files`);
    if (!r.ok) return;
    const data = await r.json();
    setFilesList({ jobId, files: data.files || [] });
  }

  return (
    <>
      {/* Banner fixo no topo */}
      <div className="bg-yellow-50 border-b-2 border-yellow-400 shadow-sm">
        <div className="px-3 md:px-5 py-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-bold text-yellow-900 hover:text-yellow-700 cursor-pointer"
          >
            {pendingCount > 0 ? "🔔" : "⚡"}
            {pendingCount > 0
              ? `${pendingCount} aprovação(ões) pendente(s)`
              : `${runningJobs.length} squad(s) em execução`}
            <span className="text-xs">{expanded ? "▲" : "▼"}</span>
          </button>
          <div className="text-xs text-yellow-800">
            {runningJobs.map((j) => j.squad).join(", ")}
          </div>
        </div>

        {expanded && (
          <div className="px-3 md:px-5 pb-3 space-y-3 max-h-[60vh] overflow-y-auto">
            {runningJobs.map((job) => {
              const jobPendings = pendings[job.jobId] || [];
              return (
                <div key={job.jobId} className="bg-white border border-yellow-300 rounded p-3 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">
                        {job.squad} <span className="text-xs text-gray-500">#{job.jobId.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-gray-600 italic line-clamp-2">
                        {job.topic}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        iniciado {new Date(job.startedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => listFiles(job.jobId)}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded border border-blue-300"
                      >
                        📂 Ver arquivos
                      </button>
                      <button
                        onClick={() => stopJob(job.jobId)}
                        disabled={actionLoading === job.jobId}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded border border-red-300 disabled:opacity-50"
                      >
                        {actionLoading === job.jobId ? "..." : "🛑 Parar"}
                      </button>
                    </div>
                  </div>

                  {jobPendings.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {jobPendings.map((p) => (
                        <div key={p.stepId} className="bg-yellow-50 border-l-4 border-yellow-500 p-2 rounded">
                          <div className="font-semibold text-sm text-yellow-900">
                            🔔 {p.stepName}
                          </div>
                          <div className="text-xs text-gray-700 my-1">{p.stepPrompt}</div>
                          {p.producedFiles.length > 0 && (
                            <div className="text-xs text-gray-600 mb-2">
                              <span className="font-semibold">Arquivos produzidos:</span>{" "}
                              {p.producedFiles.map((f) => (
                                <button
                                  key={f.name}
                                  onClick={() => openFile(job.jobId, f.name)}
                                  className="underline text-blue-700 hover:text-blue-900 mr-2"
                                >
                                  {f.name}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => approveCheckpoint(job.jobId, p.stepId, true)}
                              disabled={actionLoading === `${job.jobId}:${p.stepId}`}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-semibold disabled:opacity-50"
                            >
                              ✅ Aprovar
                            </button>
                            <button
                              onClick={() => {
                                setRejectModal({ jobId: job.jobId, stepId: p.stepId, stepName: p.stepName });
                                setRejectComment("");
                              }}
                              disabled={actionLoading === `${job.jobId}:${p.stepId}`}
                              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-semibold disabled:opacity-50"
                            >
                              ✏️ Pedir mudanças
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {jobPendings.length === 0 && (
                    <div className="text-xs text-gray-500 italic">
                      Squad rodando. Quando precisar da sua aprovação, aparece aqui.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: visualizar arquivo */}
      {viewingFile && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingFile(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
              <div className="font-bold text-sm">📄 {viewingFile.name}</div>
              <button
                onClick={() => setViewingFile(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs whitespace-pre-wrap font-mono bg-gray-50">
              {viewingFile.content}
            </pre>
          </div>
        </div>
      )}

      {/* Modal: lista de arquivos do job */}
      {filesList && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFilesList(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
              <div className="font-bold text-sm">📂 Arquivos produzidos — #{filesList.jobId.slice(0, 8)}</div>
              <button
                onClick={() => setFilesList(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-1">
              {filesList.files.length === 0 && (
                <div className="text-sm text-gray-500 italic p-4 text-center">
                  Nenhum arquivo ainda. Aguarde o squad produzir os primeiros outputs.
                </div>
              )}
              {filesList.files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => {
                    openFile(filesList.jobId, f.name);
                    setFilesList(null);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded border border-gray-200 flex justify-between"
                >
                  <span className="font-mono">{f.name}</span>
                  <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: pedir mudanças (reprovar) */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-4 py-3 border-b bg-orange-50">
              <div className="font-bold text-sm">✏️ Pedir mudanças — {rejectModal.stepName}</div>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                O que precisa mudar?
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={5}
                className="w-full border border-gray-300 rounded p-2 text-sm"
                placeholder="Ex: O ETP precisa incluir o levantamento de mercado com 3 alternativas. Faltou citar a Lei 14.133..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectModal(null)}
                  className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!rejectComment.trim()) {
                      alert("Por favor escreva o que precisa mudar.");
                      return;
                    }
                    await approveCheckpoint(rejectModal.jobId, rejectModal.stepId, false, rejectComment);
                    setRejectModal(null);
                  }}
                  disabled={!rejectComment.trim()}
                  className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
                >
                  Enviar pedido de mudança
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
