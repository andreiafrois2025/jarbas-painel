"use client";

import { useState } from "react";
import { CRIACOES, SKILLS } from "@/lib/biblioteca";

// Biblioteca: acesso rápido a tudo que existe (links diretos) e o catálogo
// de skills/capacidades do ecossistema, com como acionar cada uma.

type Aba = "criacoes" | "skills";

export default function BibliotecaPage() {
  const [aba, setAba] = useState<Aba>("criacoes");

  const botao = (id: Aba, rotulo: string) => (
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
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">📚 Biblioteca</h1>
        {botao("criacoes", "🔗 Criações")}
        {botao("skills", "🧰 Skills")}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          {aba === "criacoes" ? (
            CRIACOES.map((g) => (
              <section key={g.grupo}>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  {g.grupo}
                </h2>
                <div className="space-y-2">
                  {g.itens.map((c) => (
                    <div key={c.nome} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{c.icone}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--text-primary)]">{c.nome}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{c.descricao}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {c.links.map((l) => (
                              <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                                className="text-xs px-3 py-1.5 rounded-full border font-medium hover:opacity-80"
                                style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                                {l.rotulo} ↗
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            SKILLS.map((g) => (
              <section key={g.grupo}>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  {g.grupo}
                </h2>
                <div className="space-y-2">
                  {g.itens.map((s) => (
                    <div key={s.nome} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] flex items-start gap-3">
                      <span className="text-2xl">{s.icone}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">{s.nome}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{s.descricao}</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Como usar: {s.como}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
          <p className="text-xs text-[var(--text-muted)] pb-4">
            Pra adicionar itens aqui, é só me pedir no chat — eu mantenho este catálogo.
          </p>
        </div>
      </div>
    </div>
  );
}
