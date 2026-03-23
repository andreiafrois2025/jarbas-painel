"use client";

import { useState, useEffect, useCallback } from "react";
import type { Execution, Agent, Flow } from "@/lib/types";
import { getExecutions, getAgents, getFlows } from "@/lib/storage";

// =============================================
// Página de Métricas — Dashboard de produtividade
// Exibe estatísticas, gráficos e "Funcionário do Mês"
// =============================================

interface FlowsPageProps {
  onNavigate: (page: string) => void;
}

// Contagem de execuções por agente
interface AgentStats {
  agentId: string;
  agentName: string;
  icon: string;
  gender: string;
  count: number;
}

export default function MetricsPage({ onNavigate }: FlowsPageProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [execs, agts, flws] = await Promise.all([
        getExecutions(),
        getAgents(),
        getFlows(),
      ]);
      setExecutions(execs);
      setAgents(agts);
      setFlows(flws);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Cálculos ---

  const todayCount = executions.filter((e) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(e.created_at || "").getTime() >= today.getTime();
  }).length;

  const weekCount = executions.filter((e) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(e.created_at || "").getTime() >= weekAgo.getTime();
  }).length;

  const monthCount = executions.filter((e) => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return new Date(e.created_at || "").getTime() >= monthAgo.getTime();
  }).length;

  // Estatísticas por agente
  const agentStats: AgentStats[] = agents
    .map((agent) => ({
      agentId: agent.id,
      agentName: agent.agent_name || agent.name,
      icon: agent.icon || "⚡",
      gender: agent.gender || "male",
      count: executions.filter((e) => e.agent_id === agent.id).length,
    }))
    .sort((a, b) => b.count - a.count);

  // Funcionário do mês (agente com mais execuções nos últimos 30 dias)
  const monthExecs = executions.filter((e) => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return new Date(e.created_at || "").getTime() >= monthAgo.getTime();
  });

  const employeeOfMonth = agents
    .map((agent) => ({
      agent,
      count: monthExecs.filter((e) => e.agent_id === agent.id).length,
    }))
    .sort((a, b) => b.count - a.count)[0];

  // Barra máxima para gráfico
  const maxCount = Math.max(...agentStats.map((s) => s.count), 1);

  // Execuções por dia (últimos 7 dias)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = executions.filter((e) => {
      const t = new Date(e.created_at || "").getTime();
      return t >= date.getTime() && t < nextDay.getTime();
    }).length;

    return {
      label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      count,
    };
  });

  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  // Tempo estimado economizado (2 min por execução manual)
  const minutesSaved = executions.length * 2;
  const hoursSaved = Math.floor(minutesSaved / 60);
  const remainingMinutes = minutesSaved % 60;

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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0">
        <h1 className="text-lg font-semibold">Métricas</h1>
        <span className="text-sm text-[var(--text-muted)]">Produtividade do escritório</span>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Hoje</p>
              <p className="text-2xl font-bold text-[var(--success)]">{todayCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Esta semana</p>
              <p className="text-2xl font-bold text-[var(--accent)]">{weekCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Este mês</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{monthCount}</p>
              <p className="text-xs text-[var(--text-muted)]">execuções</p>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Tempo economizado</p>
              <p className="text-2xl font-bold text-[var(--warning)]">
                {hoursSaved > 0 ? `${hoursSaved}h${remainingMinutes > 0 ? remainingMinutes : ""}` : `${minutesSaved}min`}
              </p>
              <p className="text-xs text-[var(--text-muted)]">estimado</p>
            </div>
          </div>

          {/* Funcionário do Mês + Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Funcionário do mês */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 flex flex-col items-center text-center">
              <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider font-medium">
                Funcionário do Mês
              </p>
              {employeeOfMonth && employeeOfMonth.count > 0 ? (
                <>
                  <div className="relative mb-3">
                    <span className="text-5xl">{employeeOfMonth.agent.icon || "⚡"}</span>
                    <span className="absolute -top-1 -right-2 text-2xl">🏆</span>
                  </div>
                  <p className="font-semibold text-base">
                    {employeeOfMonth.agent.agent_name || employeeOfMonth.agent.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {employeeOfMonth.agent.name} · {employeeOfMonth.agent.description}
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
                  <p className="text-xs text-[var(--text-muted)] mt-1">Use seus agentes para eleger o funcionário do mês!</p>
                </>
              )}
            </div>

            {/* Gráfico diário */}
            <div className="md:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
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

          {/* Ranking de agentes */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
              Ranking de Agentes
            </p>
            {agentStats.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhum agente cadastrado</p>
            ) : (
              <div className="space-y-3">
                {agentStats.map((stat, i) => (
                  <div key={stat.agentId} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--text-muted)] w-5 text-right">
                      {i + 1}
                    </span>
                    <span className="text-lg w-7 text-center">{stat.icon}</span>
                    <span className="text-sm font-medium w-28 truncate">{stat.agentName}</span>
                    <div className="flex-1 h-6 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max((stat.count / maxCount) * 100, 2)}%`,
                          backgroundColor: i === 0 && stat.count > 0
                            ? "var(--accent)"
                            : i === 1 && stat.count > 0
                            ? "var(--accent-hover)"
                            : "var(--bg-tertiary)",
                          minWidth: stat.count > 0 ? "32px" : "8px",
                        }}
                      >
                        {stat.count > 0 && (
                          <span className="text-[10px] font-bold text-white">{stat.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de execuções recentes */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
              Execuções Recentes
            </p>
            {executions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma execução registrada</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {executions.slice(0, 20).map((exec) => {
                  const agent = agents.find((a) => a.id === exec.agent_id);
                  const flow = flows.find((f) => f.id === exec.flow_id);
                  return (
                    <div
                      key={exec.id}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg-primary)] transition-all"
                    >
                      <span className="text-lg">{agent?.icon || "⚡"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {agent?.agent_name || agent?.name || "Agente removido"}
                        </p>
                        {flow && (
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Fluxo: {flow.name}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        exec.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : exec.status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {exec.status === "completed" ? "Concluído" : exec.status === "failed" ? "Falhou" : "Em andamento"}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                        {exec.created_at
                          ? new Date(exec.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info geral */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Agentes ativos</p>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{flows.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Fluxos criados</p>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{executions.length}</p>
              <p className="text-xs text-[var(--text-muted)]">Total execuções</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
