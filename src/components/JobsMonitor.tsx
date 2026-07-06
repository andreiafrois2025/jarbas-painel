"use client";

import { useEffect, useState, useCallback } from "react";

import { SQUAD_API_BASE } from "@/lib/config";
const POLL_INTERVAL_MS = 5000;

interface JobError {
  message: string;
  stepId?: number | string;
  stepName?: string;
  agentName?: string;
  exitCode?: number;
  occurredAt?: string;
}

type UserStatus = "done" | "paused" | "archived";

interface Job {
  jobId: string;
  squad: string;
  topic: string;
  status: "running" | "completed" | "failed" | "cancelled" | "rejected" | "interrupted" | "paused";
  startedAt: string;
  completedAt?: string;
  cancelReason?: string;
  outputUrl?: string;
  error?: JobError;
  lastSuccessfulStepId?: number | string;
  userStatus?: UserStatus;
  userStatusAt?: string;
  driveFolder?: string; // "JarbasDrive2:Squads/{squad}/{data}_{slug}" (sync automático ao completar)
  driveSyncedAt?: string;
}

const USER_STATUS_UI: Record<UserStatus, { icon: string; label: string; badge: string }> = {
  done:     { icon: "✅", label: "Concluído", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  paused:   { icon: "⏸️", label: "Pausado",   badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  archived: { icon: "🗄️", label: "Arquivado", badge: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

interface PipelineStep {
  id: number | string;
  name: string;
  type: string;
  agent?: string;
  condition?: string;
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
  const [troubledJobs, setTroubledJobs] = useState<Job[]>([]); // failed, paused, interrupted
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]); // marcados manualmente (done/paused/archived)
  const [showArchived, setShowArchived] = useState(false);
  const [pendings, setPendings] = useState<Record<string, PendingCheckpoint[]>>({});
  const [pipelineSteps, setPipelineSteps] = useState<Record<string, PipelineStep[]>>({});
  const [expanded, setExpanded] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ jobId: string; name: string; content: string } | null>(null);
  const [inlineFiles, setInlineFiles] = useState<Record<string, JobFile[]>>({});
  const [openFilesFor, setOpenFilesFor] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<{ jobId: string; stepId: string; stepName: string } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [resumeModal, setResumeModal] = useState<{ jobId: string; squad: string; suggestedStepId: number | string | null } | null>(null);
  const [resumeStepId, setResumeStepId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem("jobsMonitor.dismissed");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchData = useCallback(async () => {
    try {
      const jobsRes = await fetch(`${SQUAD_API_BASE}/api/jobs`);
      if (!jobsRes.ok) return;
      const jobs: Job[] = await jobsRes.json();
      // Job com userStatus (marcação manual da Andréia) sai das listas ativas e vai pra arquivados
      const running = jobs.filter((j) => j.status === "running" && !j.userStatus);
      const troubled = jobs.filter(
        (j) => (j.status === "failed" || j.status === "paused" || j.status === "interrupted")
          && !dismissed.has(j.jobId)
          && !j.userStatus
      );
      const archived = jobs.filter((j) => !!j.userStatus)
        .sort((a, b) => (b.userStatusAt || "").localeCompare(a.userStatusAt || ""));
      setRunningJobs(running);
      setTroubledJobs(troubled);
      setArchivedJobs(archived);

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
  }, [dismissed]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const pendingCount = Object.values(pendings).reduce((acc, arr) => acc + arr.length, 0);
  const hasAnything = runningJobs.length > 0 || pendingCount > 0 || troubledJobs.length > 0 || archivedJobs.length > 0;

  if (!hasAnything) return null;

  async function loadPipelineSteps(squad: string) {
    if (pipelineSteps[squad]) return;
    try {
      const r = await fetch(`${SQUAD_API_BASE}/api/squads/${squad}/pipeline`);
      if (!r.ok) return;
      const data = await r.json();
      setPipelineSteps((prev) => ({ ...prev, [squad]: data.steps || [] }));
    } catch {}
  }

  async function openResumeModal(job: Job) {
    await loadPipelineSteps(job.squad);
    const suggestion = job.error?.stepId ?? job.lastSuccessfulStepId ?? null;
    setResumeModal({ jobId: job.jobId, squad: job.squad, suggestedStepId: suggestion });
    setResumeStepId(suggestion != null ? String(suggestion) : "");
  }

  async function confirmResume() {
    if (!resumeModal || !resumeStepId.trim()) return;
    setActionLoading(resumeModal.jobId);
    try {
      const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${resumeModal.jobId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStepId: Number(resumeStepId) }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Falha ao retomar: ${err.error || r.statusText}`);
      } else {
        setResumeModal(null);
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  }

  function dismissJob(jobId: string) {
    setDismissed((prev) => {
      const next = new Set(prev).add(jobId);
      try {
        window.localStorage.setItem("jobsMonitor.dismissed", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  async function syncToDrive(jobId: string) {
    setActionLoading(`drive-sync:${jobId}`);
    try {
      const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/sync-drive`, { method: "POST" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Falha ao iniciar sync: ${err.error || r.statusText}`);
      } else {
        // Recarrega jobs em 3 e 15 segundos pra pegar o driveFolder após sync completar
        setTimeout(() => fetchData(), 3000);
        setTimeout(() => fetchData(), 15000);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function markJob(jobId: string, userStatus: UserStatus | null) {
    setActionLoading(`user-status:${jobId}`);
    try {
      const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/user-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userStatus }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Falha ao marcar: ${err.error || r.statusText}`);
      } else {
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  }

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

  async function toggleInlineFiles(jobId: string) {
    setOpenFilesFor((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        return next;
      }
      next.add(jobId);
      return next;
    });
    if (!inlineFiles[jobId]) {
      try {
        const r = await fetch(`${SQUAD_API_BASE}/api/jobs/${jobId}/files`);
        if (!r.ok) return;
        const data = await r.json();
        setInlineFiles((prev) => ({ ...prev, [jobId]: data.files || [] }));
      } catch {}
    }
  }

  function fileIcon(name: string): string {
    if (name.endsWith(".md")) return "📝";
    if (name.endsWith(".yaml") || name.endsWith(".yml")) return "⚙️";
    if (name.endsWith(".json")) return "{}";
    if (/\.(png|jpg|jpeg|gif)$/i.test(name)) return "🖼️";
    if (/\.html?$/i.test(name)) return "🌐";
    return "📄";
  }

  function driveBadge(job: Job) {
    const syncing = actionLoading === `drive-sync:${job.jobId}`;
    if (job.driveFolder) {
      return (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
          <span>☁️</span>
          <span className="font-mono truncate">{job.driveFolder}</span>
          <button
            onClick={() => syncToDrive(job.jobId)}
            disabled={syncing}
            className="text-emerald-600 hover:text-emerald-800 underline disabled:opacity-50 shrink-0"
            title="Re-sincronizar (útil se você atualizou arquivos)"
          >
            {syncing ? "…" : "atualizar"}
          </button>
        </div>
      );
    }
    // Ainda não subiu — botão manual pra disparar sync
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1">
        <span>☁️</span>
        <span className="italic text-slate-500">Não está no Drive</span>
        <button
          onClick={() => syncToDrive(job.jobId)}
          disabled={syncing}
          className="ml-auto text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded px-2 py-0.5 disabled:opacity-50 shrink-0"
        >
          {syncing ? "Enviando…" : "Enviar pro Drive"}
        </button>
      </div>
    );
  }

  function renderInlineFiles(job: Job) {
    const jobId = job.jobId;
    if (!openFilesFor.has(jobId)) return driveBadge(job); // já mostra o badge do Drive mesmo colapsado
    const files = inlineFiles[jobId];
    if (files === undefined) {
      return (
        <>
          {driveBadge(job)}
          <div className="mt-2 text-xs text-gray-500 italic">Carregando arquivos…</div>
        </>
      );
    }
    if (files.length === 0) {
      return (
        <>
          {driveBadge(job)}
          <div className="mt-2 text-xs text-gray-500 italic">Nenhum arquivo gerado ainda.</div>
        </>
      );
    }
    return (
      <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
        {driveBadge(job)}
        {files.map((f) => {
          const isBinaryOrHtml = /\.(png|jpg|jpeg|gif|pdf|html?)$/i.test(f.name);
          const kb = (f.size / 1024).toFixed(1);
          return (
            <div key={f.name} className="flex items-center gap-2 text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <span>{fileIcon(f.name)}</span>
              <span className="flex-1 font-mono truncate text-gray-700">{f.name}</span>
              <span className="text-[9px] text-gray-400 shrink-0">{kb} KB</span>
              {isBinaryOrHtml ? (
                <a
                  href={`${SQUAD_API_BASE}/api/jobs/${jobId}/files/${encodeURIComponent(f.name)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 no-underline"
                >
                  Abrir ↗
                </a>
              ) : (
                <button
                  onClick={() => openFile(jobId, f.name)}
                  className="text-[10px] px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300"
                >
                  Ver
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function inlineFilesButton(jobId: string) {
    const isOpen = openFilesFor.has(jobId);
    const count = inlineFiles[jobId]?.length;
    return (
      <button
        onClick={() => toggleInlineFiles(jobId)}
        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded border border-blue-300"
      >
        📂 {isOpen ? "Esconder" : "Arquivos"}{count !== undefined ? ` (${count})` : ""}
      </button>
    );
  }

  const hasTroubled = troubledJobs.length > 0;
  const bannerColor = hasTroubled ? "red" : "yellow";
  const bannerBg = hasTroubled ? "bg-red-50 border-red-500" : "bg-yellow-50 border-yellow-400";
  const bannerText = hasTroubled ? "text-red-900 hover:text-red-700" : "text-yellow-900 hover:text-yellow-700";
  const bannerSubText = hasTroubled ? "text-red-800" : "text-yellow-800";

  return (
    <>
      {/* Banner fixo no topo */}
      <div className={`${bannerBg} border-b-2 shadow-sm`}>
        <div className="px-3 md:px-5 py-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-2 text-sm font-bold ${bannerText} cursor-pointer`}
          >
            {hasTroubled ? "🚨" : pendingCount > 0 ? "🔔" : "⚡"}
            {hasTroubled
              ? `${troubledJobs.length} squad(s) precisam da sua atenção`
              : pendingCount > 0
              ? `${pendingCount} aprovação(ões) pendente(s)`
              : `${runningJobs.length} squad(s) em execução`}
            <span className="text-xs">{expanded ? "▲" : "▼"}</span>
          </button>
          <div className={`text-xs ${bannerSubText}`}>
            {[...troubledJobs, ...runningJobs].map((j) => j.squad).join(", ")}
          </div>
        </div>

        {expanded && (
          <div className="px-3 md:px-5 pb-3 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Jobs com problema (failed / paused / interrupted) */}
            {troubledJobs.map((job) => {
              const statusLabel: Record<string, string> = {
                failed: "❌ Erro",
                paused: "⏸️ Pausado",
                interrupted: "⚠️ Interrompido (squad-api reiniciou)",
              };
              const lastOk = job.lastSuccessfulStepId ?? "(nenhum)";
              return (
                <div key={job.jobId} className="bg-white border-2 border-red-300 rounded p-3 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-red-900">
                        {statusLabel[job.status] || job.status} — {job.squad}{" "}
                        <span className="text-xs text-gray-500">#{job.jobId.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-gray-600 italic line-clamp-2">{job.topic}</div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        último step OK: <span className="font-mono">{String(lastOk)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {inlineFilesButton(job.jobId)}
                      <div className="flex gap-1">
                        <button
                          onClick={() => markJob(job.jobId, "done")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded border border-green-300 disabled:opacity-50"
                          title="Já resolvi — marcar como concluído (vai pra Arquivados)"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => markJob(job.jobId, "paused")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300 disabled:opacity-50"
                          title="Vou lidar depois — marcar como pausado"
                        >
                          ⏸️
                        </button>
                        <button
                          onClick={() => markJob(job.jobId, "archived")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-300 disabled:opacity-50"
                          title="Não vou tratar — arquivar"
                        >
                          🗄️
                        </button>
                      </div>
                      <button
                        onClick={() => dismissJob(job.jobId)}
                        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded border border-gray-300"
                        title="Esconder do painel só nesta sessão (sem registrar)"
                      >
                        Só esconder
                      </button>
                    </div>
                  </div>

                  {job.error?.message && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded mb-2">
                      <div className="text-xs font-semibold text-red-800 mb-1">
                        {job.error.stepName ? `Step ${job.error.stepId} (${job.error.stepName})` : "Erro"}
                      </div>
                      <div className="text-xs text-red-700 font-mono whitespace-pre-wrap">
                        {job.error.message}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => openResumeModal(job)}
                    disabled={actionLoading === job.jobId}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-semibold disabled:opacity-50"
                  >
                    {actionLoading === job.jobId ? "..." : "▶️ Retomar de onde parou"}
                  </button>
                  {renderInlineFiles(job)}
                </div>
              );
            })}

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
                      {inlineFilesButton(job.jobId)}
                      <div className="flex gap-1">
                        <button
                          onClick={() => markJob(job.jobId, "done")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded border border-green-300 disabled:opacity-50"
                          title="Marcar como concluído (vai pra Registro)"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => markJob(job.jobId, "paused")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300 disabled:opacity-50"
                          title="Pausar / lidar depois"
                        >
                          ⏸️
                        </button>
                        <button
                          onClick={() => markJob(job.jobId, "archived")}
                          disabled={actionLoading === `user-status:${job.jobId}`}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-300 disabled:opacity-50"
                          title="Arquivar"
                        >
                          🗄️
                        </button>
                      </div>
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
                  {renderInlineFiles(job)}
                </div>
              );
            })}

            {/* Arquivados — jobs que a Andréia marcou manualmente. Ficam pro histórico */}
            {archivedJobs.length > 0 && (
              <div className="pt-2 border-t border-gray-300/50">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs text-gray-600 hover:text-gray-800 font-semibold flex items-center gap-1.5"
                >
                  <span>{showArchived ? "▼" : "▶"}</span>
                  🗂️ Registro ({archivedJobs.length} marcado{archivedJobs.length !== 1 ? "s" : ""})
                </button>
                {showArchived && (
                  <div className="mt-2 space-y-1.5">
                    {archivedJobs.map((job) => {
                      const ui = job.userStatus ? USER_STATUS_UI[job.userStatus] : null;
                      return (
                        <div key={job.jobId} className="bg-white/60 border border-gray-200 rounded p-2 text-xs">
                          <div className="flex items-start gap-2">
                            {ui && (
                              <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${ui.badge}`}>
                                {ui.icon} {ui.label}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-800">
                                {job.squad} <span className="text-gray-500">#{job.jobId.slice(0, 8)}</span>
                              </div>
                              <div className="text-gray-600 italic line-clamp-1">{job.topic}</div>
                              {job.userStatusAt && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  marcado {new Date(job.userStatusAt).toLocaleString("pt-BR")}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => toggleInlineFiles(job.jobId)}
                                className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200"
                              >
                                📂 {openFilesFor.has(job.jobId) ? "Esconder" : "Arquivos"}
                              </button>
                              <button
                                onClick={() => markJob(job.jobId, null)}
                                disabled={actionLoading === `user-status:${job.jobId}`}
                                className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-50"
                                title="Voltar pra lista ativa"
                              >
                                ↩ Desmarcar
                              </button>
                            </div>
                          </div>
                          {renderInlineFiles(job)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

      {/* Modal: retomar do step X */}
      {resumeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-4 py-3 border-b bg-green-50">
              <div className="font-bold text-sm">▶️ Retomar squad — #{resumeModal.jobId.slice(0, 8)}</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-600">
                A execução vai continuar no <strong>mesmo job</strong>, do step que você escolher.
                {resumeModal.suggestedStepId != null && (
                  <> Sugestão: step <strong>{String(resumeModal.suggestedStepId)}</strong> (o que falhou).</>
                )}
              </div>
              <label className="block text-sm font-medium text-gray-700">Retomar a partir do step:</label>
              <select
                value={resumeStepId}
                onChange={(e) => setResumeStepId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-sm"
              >
                <option value="">— escolher —</option>
                {(pipelineSteps[resumeModal.squad] || []).map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.id} — {s.name} {s.type === "checkpoint" ? "(checkpoint)" : s.agent ? `(${s.agent})` : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setResumeModal(null)}
                  className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmResume}
                  disabled={!resumeStepId.trim() || actionLoading === resumeModal.jobId}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
                >
                  {actionLoading === resumeModal.jobId ? "..." : "▶️ Retomar agora"}
                </button>
              </div>
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
