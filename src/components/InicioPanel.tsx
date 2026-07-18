"use client";

// Seção Escritório da página única (18/07).
// "Assistentes por área" virou coluna lateral do Hoje (AssistentesPorArea.tsx),
// então aqui sobrou o que importa: os bonequinhos com a largura toda.

import { useState } from "react";
import { SQUAD_API_BASE } from "@/lib/config";

export default function InicioPanel() {
  const [openOfficeFullscreen, setOpenOfficeFullscreen] = useState(false);
  const officeUrl = `${SQUAD_API_BASE}/office/`;

  return (
    <div className="p-4 md:p-6 pt-0 max-w-[1500px] mx-auto">
      <section className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">🏢 Escritório</span>
          <button onClick={() => setOpenOfficeFullscreen(true)}
            className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-125 cursor-pointer transition-all">
            Ver em tela cheia ↗
          </button>
        </div>
        <iframe
          src={officeUrl}
          className="w-full border-0 h-[60vh] md:h-[70vh]"
          title="Escritório virtual"
          loading="lazy"
        />
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
            <iframe src={officeUrl} className="flex-1 w-full border-0" title="Escritório virtual (fullscreen)" />
          </div>
        </div>
      )}
    </div>
  );
}
