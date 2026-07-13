"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InicioPanel from "@/components/InicioPanel";
import HojePanel from "@/components/HojePanel";
import { usePainel } from "@/lib/painel-context";

export default function InicioPage() {
  const router = useRouter();
  const { collaborators, assignments, categories, quickLinks } = usePainel();
  const [aba, setAba] = useState<"hoje" | "escritorio">("hoje");

  const botao = (id: "hoje" | "escritorio", rotulo: string) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
        aba === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        {botao("hoje", "🏠 Hoje")}
        {botao("escritorio", "🏢 Escritório")}
      </div>
      {aba === "hoje" ? (
        <HojePanel />
      ) : (
        <InicioPanel
          collaborators={collaborators}
          assignments={assignments}
          categories={categories}
          quickLinks={quickLinks}
          onOpenEquipe={() => router.push("/equipe")}
        />
      )}
    </div>
  );
}
