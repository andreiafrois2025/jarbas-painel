"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Execution, Collaborator, Assignment, Category, Flow, Agent } from "@/lib/types";
import {
  getExecutions, getCollaborators, getAssignments,
  getCategories, getFlows, getAgents,
} from "@/lib/storage";

// =============================================
// Página de Métricas v3 — Dashboard de produtividade
// Usa novo modelo (collaborators + assignments)
// Tempo economizado calculado por função
// =============================================

interface MetricsPageProps {
  onNavigate: (page: string) => void;
}

interface CollabStats {
  collaborator: Collaborator;
  assignments: Assignment[];
  totalExecs: number;
  timeSaved: number;
  functions: { toolName: string; description: string; count: number; timeSaved: number }[];
}

export default function MetricsPage({ onNavigate }: MetricsPageProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "dismissed">("active");
  const [expandedCollab, setExpandedCollab] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [execs, collabs, asgs, cats, flws, agts] = await Promise.all([
        getExecutions(), getCollaborators(), getAssignments(),
        getCategories(), getFlows(), getAgents(),
      ]);
      setExecutions(execs);
      setCollaborators(collabs);
      setAssignments(asgs);
      setCategories(cats);
      setFlows(flws);
      setAgents(agts);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Filtered collaborators by status ---
  const filteredCollabs = useMemo(() => {
    if (statusFilter === "all") return collaborators;
    return collaborators.filter(c => (c.status || "active") === statusFilter);
  }, [collaborators, statusFilter]);

  // --- Map executions to assignments (com fallback para agents antigos) ---
  const execWithDetails = useMemo(() => {
    return executions.map(exec => {
      let assignment = assignments.find(a => a.id === exec.agent_id);

      // Fallback: exec.agent_id pode referenciar tabela agents (modelo legado)
      if (!assignment && exec.agent_id) {
        const oldAgent = agents.find(a => a.id === exec.agent_id);
        if (oldAgent) {
          assignment = assignments.find(a =>
            a.tool_name === oldAgent.name &&
            a.collaborator?.name === (oldAgent.agent_name || oldAgent.name)
          );
        }
      }

      const collaborator = assignment
        ? collaborators.find(c => c.id === assignment!.collaborator_id)
        : null;
      const category = assignment
        ? categories.find(c => c.id === assignment!.category_id)
        : null;
      return { exec, assignment: assignment || undefined, collaborator, category };
    });
  }, [executions, assignments, collaborators, categories, agents]);

  // --- Time-based filters ---
  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const weekAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.getTime(); }, []);
  const monthAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.getTime(); }, []);

  const todayCount = executions.filter(e => new Date(e.created_at || "").getTime() >= todayStart).length;
  const weekCount = executions.filter(e => new Date(e.created_at || "").getTime() >= weekAgo).length;
  const monthCount = executions.filter(e => new Date(e.created_at || "").getTime() >= monthAgo).length;

  // --- Time saved (per-function calculation) ---
  const totalTimeSaved = useMemo(() => {
    return execWithDetails.reduce((sum, { assignment }) => {
      return sum + (assignment?.time_saved_minutes ?? 2);
    }, 0);
  }, [execWithDetails]);

  const hoursSaved = Math.floor(totalTimeSaved / 60);
  const remainingMin = totalTimeSaved % 60;

  // --- Collaborator stats with function breakdown ---
  const collabStats: CollabStats[] = useMemo(() => {
    return filteredCollabs.map(collab => {
      const collabAsgs = assignments.filter(a => a.collaborator_id === collab.id);
      const asgIds = new Set(collabAsgs.map(a => a.id));
      const collabExecs = executions.filter(e => asgIds.has(e.agent_id || ""));
      const timeSaved = collabExecs.reduce((sum, e) => {
        const asg = collabAsgs.find(a => a.id === e.agent_id);
        return sum + (asg?.time_saved_minutes ?? 2);
      }, 0);

      // Breakdown per function/assignment
      const functions = collabAsgs.map(asg => {
        const fExecs = collabExecs.filter(e => e.agent_id === asg.id);
        return {
          toolName: asg.tool_name,
          description: asg.description || "",
          count: fExecs.length,
          timeSaved: fExecs.length * (asg.time_saved_minutes ?? 2),
        };
      }).sort((a, b) => b.count - a.count);

      return { collaborator: collab, assignments: collabAsgs, totalExecs: collabExecs.length, timeSaved, functions };
    }).sort((a, b) => b.totalExecs - a.totalExecs);
  }, [filteredCollabs, assignments, executions]);

  // --- Employee of the Month ---
  type EmpOfMonth = { collab: Collaborator; count: number };
  const employeeOfMonth = useMemo<EmpOfMonth | null>(() => {
    const monthExecs = executions.filter(e => new Date(e.created_at || "").getTime() >= monthAgo);
    const map = new Map<string, EmpOfMonth>();
    monthExecs.forEach(e => {
      const asg = assignments.find(a => a.id === e.agent_id);
      if (!asg) return;
      const collab = collaborators.find(c => c.id === asg.collaborator_id);
      if (!collab) return;
      const existing = map.get(collab.id);
      if (existing) existing.count++;
      else map.set(collab.id, { collab, count: 1 });
    });
    let best: EmpOfMonth | null = null;
    map.forEach(v => { if (!best || v.count > best.count) best = v; });
    return best;
  }, [executions, assignments, collaborators, monthAgo]);

  // --- Daily chart data ---
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - i)); date.setHours(0, 0, 0, 0);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const count = executions.filter(e => {
        const t = new Date(e.created_at || "").getTime();
        return t >= date.getTime() && t < next.getTime();
      }).length;
      return { label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), count };
    });
  }, [executions]);

  const maxDaily = Math.max(...dailyData.map(d => d.count), 1);
  const maxCount = Math.max(...collabStats.map(s => s.totalExecs), 1);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">📊</span>
          <span className="text-[var(--text-secondary)]">Carregando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden dashboard-bg">
      {/* Header */}
      <header className="h-14 bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0">
        <h1 className="text-lg font-semibold">Métricas</h1>
        <span className="text-sm text-[var(--text-muted)]">Produtividade do escritório</span>
        <div className="flex-1" />
        {/* Status filter */}
        <div className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-0.5 border border-[var(--border)]">
          {([
            { key: "active" as const, label: "Ativos" },
            { key: "all" as const, label: "Todos" },
            { key: "dismissed" as const, label: "Desligados" },
          ]).map(opt => (
            <button key={opt.key} onClick={() => setStatusFilter(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                statusFilter === opt.key
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Hoje</p>
              <p className="text-2xl font-bold text-[var(--success)]">{todayCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Esta semana</p>
              <p className="text-2xl font-bold text-[var(--accent)]">{weekCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Este mês</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{monthCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Tempo economizado</p>
              <p className="text-2xl font-bold text-[var(--warning)]">
                {hoursSaved > 0 ? `${hoursSaved}h${remainingMin > 0 ? remainingMin : ""}` : `${totalTimeSaved}min`}
              </p>
              <p className="text-xs text-[var(--text-muted)]">baseado no uso real</p>
            </div>
          </div>

          {/* Employee of the Month + Daily Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee of the month */}
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5 flex flex-col items-center text-center">
              <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider font-medium">
                Colaborador do Mês
              </p>
              {employeeOfMonth !== null ? (
                <>
                  <div className="relative mb-3">
                    <span className="text-5xl">{employeeOfMonth.collab.icon || "⚡"}</span>
                    <span className="absolute -top-1 -right-2 text-2xl">🏆</span>
                  </div>
                  <p className="font-semibold text-base">{employeeOfMonth.collab.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {employeeOfMonth.collab.bio || `${assignments.filter(a => a.collaborator_id === employeeOfMonth.collab.id).length} funções`}
                  </p>
                  <div className="mt-3 bg-[var(--accent-soft)] rounded-full px-3 py-1">
                    <span className="text-sm font-bold text-[var(--accent)]">
                      {employeeOfMonth.count} execuções
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-4xl mb-2 opacity-30">🏆</span>
                  <p className="text-sm text-[var(--text-muted)]">Nenhuma execução ainda</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Use seus colaboradores para eleger o destaque do mês!</p>
                </>
              )}
            </div>

            {/* Daily chart */}
            <div className="md:col-span-2 bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5">
              <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
                Últimos 7 dias
              </p>
              <div className="flex items-end gap-2 h-32">
                {dailyData.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {day.count > 0 ? day.count : ""}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max((day.count / maxDaily) * 100, 4)}%`,
                        backgroundColor: day.count > 0 ? "var(--accent)" : "var(--bg-tertiary)",
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)]">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ranking de Colaboradores com funções */}
          <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
              Ranking de Colaboradores
            </p>
            {collabStats.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                {statusFilter === "dismissed" ? "Nenhum colaborador desligado" : "Nenhum colaborador cadastrado"}
              </p>
            ) : (
              <div className="space-y-2">
                {collabStats.map((stat, i) => {
                  const isExpanded = expandedCollab === stat.collaborator.id;
                  const isDismissed = stat.collaborator.status === "dismissed";
                  return (
                    <div key={stat.collaborator.id}>
                      <div
                        className={`flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition-all hover:bg-[var(--bg-primary)] ${isDismissed ? "opacity-60" : ""}`}
                        onClick={() => setExpandedCollab(isExpanded ? null : stat.collaborator.id)}
                      >
                        <span className="text-sm font-bold text-[var(--text-muted)] w-5 text-right">{i + 1}</span>
                        <span className="text-lg w-7 text-center">{stat.collaborator.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{stat.collaborator.name}</span>
                            {isDismissed && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] font-medium">Desligado</span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {stat.assignments.length} função{stat.assignments.length !== 1 ? "ões" : ""} · {stat.timeSaved}min economizados
                          </span>
                        </div>
                        <div className="flex-1 max-w-xs h-6 bg-[var(--bg-primary)] rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((stat.totalExecs / maxCount) * 100, 2)}%`,
                              backgroundColor: i === 0 && stat.totalExecs > 0 ? "var(--accent)" : i === 1 && stat.totalExecs > 0 ? "var(--accent-hover)" : "var(--bg-tertiary)",
                              minWidth: stat.totalExecs > 0 ? "32px" : "8px",
                            }}
                          >
                            {stat.totalExecs > 0 && <span className="text-[10px] font-bold text-white">{stat.totalExecs}</span>}
                          </div>
                        </div>
                        <span className="sm:hidden text-sm font-bold text-[var(--accent)]">{stat.totalExecs}</span>
                        <span className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                      </div>

                      {/* Expanded: function breakdown */}
                      {isExpanded && stat.functions.length > 0 && (
                        <div className="ml-14 mr-3 mb-2 mt-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                          {stat.functions.map((fn, fi) => (
                            <div key={fi} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium">{fn.toolName}</span>
                                {fn.description && <span className="text-[10px] text-[var(--text-muted)]"> · {fn.description}</span>}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium">
                                {fn.count} exec{fn.count !== 1 ? "." : "."}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {fn.timeSaved}min
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isExpanded && stat.functions.length === 0 && (
                        <div className="ml-14 mr-3 mb-2 mt-1 text-xs text-[var(--text-muted)] text-center py-3">
                          Nenhuma execução registrada
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Execuções Recentes (com detalhes de função) */}
          <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
              Execuções Recentes
            </p>
            {executions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma execução registrada</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {execWithDetails.slice(0, 30).map(({ exec, assignment, collaborator, category }) => {
                  const flow = flows.find(f => f.id === exec.flow_id);
                  return (
                    <div key={exec.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--bg-primary)] transition-all">
                      <span className="text-lg">{collaborator?.icon || "⚡"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {collaborator?.name || "Colaborador removido"}
                          </span>
                          {assignment && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-medium shrink-0">
                              {assignment.tool_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {assignment?.description && (
                            <span className="text-[10px] text-[var(--text-muted)]">{assignment.description}</span>
                          )}
                          {category && (
                            <span className="text-[10px] text-[var(--text-muted)]">· {category.context} › {category.name}</span>
                          )}
                          {flow && (
                            <span className="text-[10px] text-[var(--text-muted)]">· Fluxo: {flow.name}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        exec.status === "completed"
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : exec.status === "failed"
                          ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                          : "bg-[var(--warning)]/10 text-[var(--warning)]"
                      }`}>
                        {exec.status === "completed" ? "OK" : exec.status === "failed" ? "Falha" : "..."}
                      </span>
                      {assignment?.time_saved_minutes && (
                        <span className="text-[10px] text-[var(--warning)] font-medium shrink-0">
                          +{assignment.time_saved_minutes}min
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                        {exec.created_at ? new Date(exec.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        }) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{collaborators.filter(c => (c.status || "active") === "active").length}</p>
              <p className="text-xs text-[var(--text-muted)]">Colaboradores ativos</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Funções cadastradas</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{flows.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Fluxos criados</p>
            </div>
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{executions.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Total execuções</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
