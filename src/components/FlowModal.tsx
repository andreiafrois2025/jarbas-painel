"use client";

import { useState, useEffect } from "react";
import type { Flow, FlowStep, Agent } from "@/lib/types";

// =============================================
// Modal de criação/edição de Fluxo
// Permite encadear agentes com ações em sequência
// =============================================

interface FlowModalProps {
  flow?: Flow | null;
  agents: Agent[];
  onSave: (data: { name: string; steps: FlowStep[] }) => void;
  onClose: () => void;
}

export default function FlowModal({ flow, agents, onSave, onClose }: FlowModalProps) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([]);

  useEffect(() => {
    if (flow) {
      setName(flow.name);
      setSteps(flow.steps || []);
    }
  }, [flow]);

  const addStep = () => {
    if (agents.length === 0) return;
    setSteps([
      ...steps,
      { agentId: agents[0].id, action: "", order: steps.length + 1 },
    ]);
  };

  const updateStep = (index: number, field: keyof FlowStep, value: string | number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    // Reordenar
    setSteps(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;
    const updated = [...steps];
    const target = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSteps(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || steps.length === 0) return;
    onSave({ name: name.trim(), steps });
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? `${agent.icon || "⚡"} ${agent.agent_name || agent.name}` : "???";
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {flow ? "Editar Fluxo" : "Criar Fluxo"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]"
          >×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nome do fluxo */}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome do fluxo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-modern"
              placeholder="Ex: Gerar Carrossel, Pesquisa Completa..."
              required
              autoFocus
            />
          </div>

          {/* Etapas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-[var(--text-secondary)]">
                Etapas ({steps.length})
              </label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer font-medium"
              >
                + Adicionar etapa
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-6 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] border-dashed">
                <p className="text-sm text-[var(--text-muted)] mb-2">Nenhuma etapa adicionada</p>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer font-medium"
                >
                  + Adicionar primeira etapa
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]"
                  >
                    {/* Número da etapa */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      {/* Setas mover */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveStep(index, "up")}
                          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer leading-none"
                          disabled={index === 0}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, "down")}
                          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer leading-none"
                          disabled={index === steps.length - 1}
                        >▼</button>
                      </div>
                    </div>

                    {/* Campos */}
                    <div className="flex-1 space-y-2">
                      {/* Agente */}
                      <select
                        value={step.agentId}
                        onChange={(e) => updateStep(index, "agentId", e.target.value)}
                        className="input-modern !py-1.5 text-sm cursor-pointer"
                      >
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.icon || "⚡"} {a.agent_name || a.name} — {a.name}
                          </option>
                        ))}
                      </select>

                      {/* Prompt — o que digitar no agente */}
                      <textarea
                        value={step.action}
                        onChange={(e) => updateStep(index, "action", e.target.value)}
                        className="input-modern !py-1.5 text-sm resize-none"
                        rows={2}
                        placeholder="Prompt para enviar ao agente. Ex: Pesquise sobre marketing digital para Instagram e liste 5 tópicos..."
                      />
                    </div>

                    {/* Remover */}
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer text-sm mt-1"
                      title="Remover etapa"
                    >✕</button>
                  </div>
                ))}

                {/* Linha de conexão visual */}
                {steps.length >= 2 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-1">
                    Cada agente recebe o prompt + resultado do anterior automaticamente
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!name.trim() || steps.length === 0}
            >
              {flow ? "Salvar" : "Criar Fluxo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
