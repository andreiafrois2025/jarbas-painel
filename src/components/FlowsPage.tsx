"use client";

import { useState, useEffect, useCallback } from "react";
import type { Flow, Agent } from "@/lib/types";
import { getFlows, addFlow, updateFlow, deleteFlow, executeFlow, getAgents } from "@/lib/storage";
import FlowModal from "./FlowModal";

// =============================================
// Página de Fluxos — Lista, cria, edita e executa fluxos
// Mostra resultados da execução automática
// =============================================

interface FlowResult {
  step: number;
  agent: string;
  url: string;
  title: string;
  prompt: string;
  response: string;
  screenshot?: string;
  status: "success" | "error";
  error?: string;
}

interface ExecutionResult {
  flowName: string;
  totalSteps: number;
  completedSteps: number;
  results: FlowResult[];
}

interface FlowsPageProps {
  onNavigate: (page: string) => void;
}

export default function FlowsPage({ onNavigate }: FlowsPageProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [flowsData, agentsData] = await Promise.all([getFlows(), getAgents()]);
      setFlows(flowsData);
      setAgents(agentsData);
    } catch (err) {
      console.error("Erro ao carregar fluxos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (data: { name: string; steps: Flow["steps"] }) => {
    try {
      if (editingFlow) {
        await updateFlow(editingFlow.id, data);
      } else {
        await addFlow(data);
      }
      await loadData();
      setShowModal(false);
      setEditingFlow(null);
    } catch (err) {
      console.error("Erro ao salvar fluxo:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este fluxo?")) {
      try {
        await deleteFlow(id);
        await loadData();
      } catch (err) {
        console.error("Erro ao excluir:", err);
      }
    }
  };

  // Execução manual — abre abas no navegador
  const handleExecuteManual = async (flow: Flow) => {
    setExecutingId(flow.id);
    try {
      await executeFlow(flow);
      for (const step of flow.steps.sort((a, b) => a.order - b.order)) {
        const agent = agents.find((a) => a.id === step.agentId);
        if (agent) {
          window.open(agent.link, "_blank");
        }
      }
    } catch (err) {
      console.error("Erro ao executar fluxo:", err);
    } finally {
      setExecutingId(null);
    }
  };

  // Execução automática — via Puppeteer no servidor
  const handleExecuteAuto = async (flow: Flow) => {
    const confirmed = window.confirm(
      "O Puppeteer vai abrir o Chrome para executar o fluxo automaticamente.\n\n" +
      "Na primeira vez, você precisará fazer login nos sites dos agentes.\n" +
      "Depois, o login ficará salvo para as próximas execuções.\n\n" +
      "Continuar?"
    );
    if (!confirmed) return;

    setExecutingId(flow.id);
    setExecutionResult(null);
    try {
      await executeFlow(flow);
      const steps = flow.steps
        .sort((a, b) => a.order - b.order)
        .map((step) => {
          const agent = agents.find((a) => a.id === step.agentId);
          return {
            agentId: step.agentId,
            agentName: agent?.agent_name || agent?.name || "???",
            agentUrl: agent?.link || "",
            action: step.action,
            order: step.order,
          };
        });

      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: flow.id,
          flowName: flow.name,
          steps,
          headless: false,
        }),
      });

      const result = await res.json();
      if (result.error) {
        alert(`Erro: ${result.error}`);
      } else {
        setExecutionResult(result);
      }
    } catch (err) {
      console.error("Erro na automação:", err);
      alert("Erro ao executar automação. Verifique o console.");
    } finally {
      setExecutingId(null);
    }
  };

  const getAgentInfo = (agentId: string) => {
    return agents.find((a) => a.id === agentId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">🔄</span>
          <span className="text-[var(--text-secondary)]">Carregando fluxos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-5 gap-4 shrink-0">
        <h1 className="text-lg font-semibold">Fluxos</h1>

        <div className="flex gap-4 ml-4 text-sm">
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{flows.length}</span> fluxos
          </span>
          <span className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">{agents.length}</span> agentes disponíveis
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => { setEditingFlow(null); setShowModal(true); }}
          className="btn-primary !py-2 !px-4 text-sm"
        >
          + Novo Fluxo
        </button>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-5xl mb-4">🔄</span>
            <h2 className="text-lg font-medium mb-2">Nenhum fluxo criado</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 text-center max-w-md">
              Fluxos permitem encadear seus agentes em sequência. Crie um fluxo para automatizar tarefas como pesquisar → gerar texto → criar imagem.
            </p>
            <button
              onClick={() => { setEditingFlow(null); setShowModal(true); }}
              className="btn-primary"
            >
              + Criar Primeiro Fluxo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl mx-auto">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-light)] transition-all"
              >
                {/* Cabeçalho do card */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold">{flow.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {flow.steps?.length || 0} {(flow.steps?.length || 0) === 1 ? "etapa" : "etapas"}
                      {flow.created_at && (
                        <> · Criado em {new Date(flow.created_at).toLocaleDateString("pt-BR")}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingFlow(flow); setShowModal(true); }}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Etapas do fluxo */}
                {flow.steps && flow.steps.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {flow.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, i) => {
                        const agent = getAgentInfo(step.agentId);
                        return (
                          <div key={i} className="flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] min-w-[80px]">
                              <span className="text-lg">{agent?.icon || "⚡"}</span>
                              <span className="text-xs font-medium text-center leading-tight">
                                {agent?.agent_name || agent?.name || "???"}
                              </span>
                              {step.action && (
                                <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight mt-0.5">
                                  {step.action.length > 30 ? step.action.slice(0, 29) + "…" : step.action}
                                </span>
                              )}
                            </div>
                            {i < flow.steps.length - 1 && (
                              <span className="text-[var(--accent)] text-sm font-bold shrink-0">→</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Botões executar */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExecuteManual(flow)}
                    disabled={executingId === flow.id}
                    className="btn-primary flex-1 !py-2.5 text-sm disabled:opacity-50"
                  >
                    {executingId === flow.id ? "Executando..." : "▶ Abrir Manualmente"}
                  </button>
                  <button
                    onClick={() => handleExecuteAuto(flow)}
                    disabled={executingId === flow.id}
                    className="btn-secondary flex-1 !py-2.5 text-sm disabled:opacity-50"
                    title="Abre o navegador, digita o prompt, espera resposta e passa para o próximo agente"
                  >
                    {executingId === flow.id ? "Executando..." : "🤖 Automático"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de resultados da execução */}
      {executionResult && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setExecutionResult(null)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do resultado */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-semibold">Resultado: {executionResult.flowName}</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {executionResult.completedSteps}/{executionResult.totalSteps} etapas completadas
                </p>
              </div>
              <button
                onClick={() => setExecutionResult(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]"
              >×</button>
            </div>

            {/* Resultados por etapa */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {executionResult.results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    r.status === "success"
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                      r.status === "success" ? "bg-green-500" : "bg-red-500"
                    }`}>
                      {r.step}
                    </span>
                    <span className="font-medium text-sm">{r.agent}</span>
                    <span className="text-xs text-[var(--text-muted)]">{r.status === "success" ? "Concluído" : "Erro"}</span>
                  </div>

                  {r.prompt && (
                    <div className="mb-2">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Prompt enviado:</p>
                      <p className="text-xs bg-[var(--bg-primary)] rounded-lg p-2 text-[var(--text-secondary)]">
                        {r.prompt}
                      </p>
                    </div>
                  )}

                  {r.response && (
                    <div className="mb-2">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Resposta capturada:</p>
                      <p className="text-xs bg-[var(--bg-primary)] rounded-lg p-2 text-[var(--text-primary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {r.response}
                      </p>
                    </div>
                  )}

                  {r.error && (
                    <p className="text-xs text-red-400 mt-1">Erro: {r.error}</p>
                  )}

                  {r.screenshot && (
                    <details className="mt-2">
                      <summary className="text-xs text-[var(--accent)] cursor-pointer">Ver screenshot</summary>
                      <img
                        src={`data:image/png;base64,${r.screenshot}`}
                        alt={`Screenshot ${r.agent}`}
                        className="mt-2 rounded-lg border border-[var(--border)] w-full"
                      />
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={() => setExecutionResult(null)}
                className="btn-primary w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <FlowModal
          flow={editingFlow}
          agents={agents}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingFlow(null);
          }}
        />
      )}
    </div>
  );
}
