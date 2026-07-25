"use client";

// Seção Escritório da página única (18/07).
// "Assistentes por área" virou coluna lateral do Hoje (AssistentesPorArea.tsx),
// então aqui sobrou o que importa: os bonequinhos com a largura toda.

import { useEffect, useState } from "react";
import { squadUrlComToken } from "@/lib/squadFetch";

export default function InicioPanel() {
  const [openOfficeFullscreen, setOpenOfficeFullscreen] = useState(false);
  // 25/07 (tarde): a rodinha do mouse não subia a página quando o ponteiro
  // estava sobre o escritório — o quadro capturava a rolagem. Agora ele nasce
  // "só pra ver": a rolagem passa direto. Um clique em "interagir" devolve o
  // controle pra quem quiser mexer nos bonequinhos.
  const [interagindo, setInteragindo] = useState(false);
  // 25/07/2026: o escritório deixou de ser aberto na internet — /office e
  // /api/snapshot agora exigem login. Como iframe não manda cabeçalho, o token
  // da sessão vai na própria URL (a squad-api aceita ?token=).
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    squadUrlComToken("/office/").then((u) => { if (vivo) setOfficeUrl(u); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  return (
    <div className="p-4 md:p-6 pt-0 w-full">
      <section className="rounded-xl border border-[var(--border)] overflow-hidden max-w-[900px] mx-auto">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">🏢 Escritório</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setInteragindo(!interagindo)}
              title={interagindo ? "Voltar a rolar a página com a rodinha" : "Deixar o escritório receber cliques e rolagem"}
              className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-all ${
                interagindo ? "text-white" : "bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-125"
              }`}
              style={interagindo ? { background: "var(--accent, #2D6B6B)" } : undefined}>
              {interagindo ? "🖱️ interagindo — clique pra soltar" : "🖱️ interagir"}
            </button>
            <button onClick={() => setOpenOfficeFullscreen(true)}
              className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-125 cursor-pointer transition-all">
              Ver em tela cheia ↗
            </button>
          </div>
        </div>
        {officeUrl ? (
          <iframe
            src={officeUrl}
            className={`w-full border-0 h-[70vh] md:h-[78vh] ${interagindo ? "" : "pointer-events-none"}`}
            title="Escritório virtual"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-sm text-[var(--text-secondary)]">
            abrindo o escritório…
          </div>
        )}
      </section>

      {/* Modal de escritório em tela cheia */}
      {openOfficeFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpenOfficeFullscreen(false)}>
          <div className="bg-[var(--bg-primary)] rounded-2xl overflow-hidden w-full h-full max-w-7xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">🏢 Escritório em tela cheia</span>
              <button onClick={() => setOpenOfficeFullscreen(false)}
                className="text-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] leading-none cursor-pointer">
                ✕
              </button>
            </div>
            {officeUrl && (
              <iframe src={officeUrl} className="flex-1 w-full border-0" title="Escritório virtual (fullscreen)" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
