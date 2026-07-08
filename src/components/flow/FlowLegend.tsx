"use client";

// =============================================
// Painel flutuante explicando os formatos dos nodes e os tipos de seta.
// =============================================

interface Props {
  onClose: () => void;
}

const SHAPES = [
  {
    icon: "⭕",
    name: "Início",
    stroke: "#2D6B6B",
    desc: "Ponto de partida do fluxo. Todo fluxo começa aqui.",
  },
  {
    icon: "▭",
    name: "Ação",
    stroke: "#5A6B6B",
    desc: 'Uma tarefa executada. Ex.: "Mike pesquisa notícias".',
  },
  {
    icon: "◆",
    name: "Decisão",
    stroke: "#C4A460",
    desc: 'Pergunta com sim/não que ramifica o fluxo. Ex.: "Aprovado?".',
  },
  {
    icon: "📝",
    name: "Nota",
    stroke: "#C4A460",
    desc: "Anotação, contexto, observação. Não é uma etapa executável.",
  },
  {
    icon: "🎯",
    name: "Fim",
    stroke: "#A0583C",
    desc: "Ponto final do fluxo.",
  },
];

export default function FlowLegend({ onClose }: Props) {
  return (
    <div className="absolute bottom-16 right-3 w-80 bg-white border border-[var(--border)] rounded-lg shadow-xl p-4 text-sm z-30 max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Legenda dos fluxos</h3>
        <button
          onClick={onClose}
          className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      <div className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
        Formatos dos nodes
      </div>
      <ul className="space-y-2 mb-4">
        {SHAPES.map((s) => (
          <li key={s.name} className="flex gap-2 items-start">
            <span
              className="mt-0.5 text-lg leading-none w-6 text-center"
              style={{ color: s.stroke }}
            >
              {s.icon}
            </span>
            <div className="flex-1">
              <div className="font-medium text-[var(--text-primary)]">{s.name}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{s.desc}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
        Tipos de seta
      </div>
      <ul className="space-y-2 mb-4">
        <li className="flex gap-2 items-start">
          <div className="pt-2 w-6 flex items-center justify-center">
            <div style={{ width: 20, height: 2, background: "#5A6B6B" }} />
          </div>
          <div className="flex-1">
            <div className="font-medium">Fluxo normal</div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              Uma etapa vai pra próxima.
            </div>
          </div>
        </li>
        <li className="flex gap-2 items-start">
          <div className="pt-2 w-6 flex items-center justify-center">
            <div style={{ width: 20, height: 0, borderTop: "2px dashed #A0583C" }} />
          </div>
          <div className="flex-1">
            <div className="font-medium">Retorno / revisão</div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              Quando o fluxo volta pra uma etapa anterior (ex.: revisão pedida). Pra criar: clique numa seta e marque &quot;É retorno&quot;.
            </div>
          </div>
        </li>
      </ul>

      <div className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
        Dicas
      </div>
      <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 list-disc pl-4">
        <li>Arraste os nodes pra reposicionar.</li>
        <li>Puxe uma bolinha do node pra outra bolinha pra criar uma seta.</li>
        <li>Clique num node ou seta pra editar/excluir.</li>
        <li>Use a barra de cima pra adicionar novos nodes.</li>
      </ul>
    </div>
  );
}
