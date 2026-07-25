import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useStatus, NIVEL_UI } from "@/lib/status";

// Semáforo de saúde do ecossistema — o resumo que fica no topo da home.
// É o que a Andréia olha primeiro ("é um lugar que eu visualizo mais rápido"),
// então ele não muda de lugar nem de forma.
//
// 25/07/2026: deixou de ter fetch próprio (agora usa a leitura compartilhada,
// ver lib/status.ts) e ganhou saída pro detalhe — antes abria este balãozinho
// e morria ali, sem caminho pra investigar.

export default function StatusSemaforo() {
  const router = useRouter();
  const { status, mudo: stale } = useStatus();
  const [open, setOpen] = useState(false);

  if (!status && !stale) return null;

  const nivel = stale ? "vermelho" : status!.nivel;
  const ui = NIVEL_UI[nivel];
  const problemas = stale
    ? ["A VPS parou de publicar o status (pode estar fora do ar)"]
    : status!.problemas;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs md:text-sm hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        title={ui.label}
      >
        <span>{ui.dot}</span>
        <span className="hidden md:inline text-[var(--text-secondary)]">{ui.label}</span>
      </button>
      {open && createPortal(
        // PORTAL no <body> (18/07): o header tem backdrop-blur, que no CSS faz
        // até um "fixed" ficar preso (e cortado) dentro dele. Renderizando fora
        // da barra, o popup flutua por cima de tudo de verdade.
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setOpen(false)} />
          <div className="fixed right-3 top-16 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl p-4 z-[100] text-sm">
          <div className="font-semibold mb-2 flex items-center gap-2">
            {ui.dot} Saúde do ecossistema
          </div>
          {problemas.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              Donna, crons, fila e disco: tudo em ordem.
            </p>
          ) : (
            <ul className="space-y-1.5 text-[var(--text-secondary)]">
              {problemas.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          )}
          <button
            onClick={() => { setOpen(false); router.push("/saude"); }}
            className="mt-3 w-full text-xs px-3 py-2 rounded-lg font-medium text-white hover:opacity-90 cursor-pointer"
            style={{ background: "var(--accent, #2D6B6B)" }}
          >
            🩺 Ver o detalhe
          </button>
          {status && (
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              Atualizado {new Date(status.gerado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · disco {status.disco_pct}%
            </p>
          )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
