"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePainel } from "@/lib/painel-context";
import { ACOES, urlConversa, type AreaAcao, type AcaoAgora } from "@/lib/fazer-agora";

// Faixa de botões de ação no topo de cada aba das Áreas.
export default function FazerAgora({ area, onNovoProcesso }: { area: AreaAcao; onNovoProcesso?: () => void }) {
  const router = useRouter();
  const { servidora } = usePainel();
  const [nota, setNota] = useState<{ id: string; texto: string } | null>(null);

  const lista = ACOES.filter((a) => a.area === area && !(servidora && a.pessoal));
  if (lista.length === 0) return null;

  function clicar(a: AcaoAgora) {
    if (a.emBreve) { setNota(nota?.id === a.id ? null : { id: a.id, texto: a.emBreve }); return; }
    if (a.aviso) { setNota(nota?.id === a.id ? null : { id: a.id, texto: a.aviso }); return; }
    setNota(null);
    if (a.acao === "novo-processo") onNovoProcesso?.();
    else router.push(urlConversa(a));
  }

  return (
    <div className="shrink-0 px-3 md:px-5 pt-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fazer agora">
        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)] mr-1">⚡ Fazer agora</span>
        {lista.map((a) => (
          <button
            key={a.id}
            onClick={() => clicar(a)}
            title={a.emBreve || undefined}
            aria-disabled={a.emBreve ? true : undefined}
            aria-expanded={nota?.id === a.id ? true : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-semibold cursor-pointer transition-colors ${
              a.emBreve
                ? "border-dashed border-[var(--border-light)] text-[var(--text-muted)] bg-transparent"
                : "border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--ac)] hover:text-[var(--ac)]"
            }`}
          >
            {a.rotulo}
            {a.emBreve && (
              <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">em breve</span>
            )}
          </button>
        ))}
      </div>
      {nota && (
        <p role="status" className="mt-2 text-[13px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-secondary)]">
          {nota.texto}
        </p>
      )}
    </div>
  );
}
