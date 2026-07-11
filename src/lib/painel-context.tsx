"use client";

import { createContext, useContext } from "react";
import type { Collaborator, Assignment, QuickLink, Category as CategoryType } from "@/lib/types";

// Dados compartilhados entre o shell do painel (layout) e as páginas.
// O shell carrega uma vez; as páginas consomem via usePainel().
export interface PainelData {
  collaborators: Collaborator[];
  assignments: Assignment[];
  categories: CategoryType[];
  quickLinks: QuickLink[];
  reload: () => Promise<void>;
}

export const PainelContext = createContext<PainelData | null>(null);

export function usePainel(): PainelData {
  const ctx = useContext(PainelContext);
  if (!ctx) throw new Error("usePainel precisa estar dentro do layout do painel");
  return ctx;
}

// Mapeia os nomes de página legados (onNavigate) para as rotas novas.
export const PAGE_PATHS: Record<string, string> = {
  inicio: "/inicio",
  equipe: "/equipe",
  producao: "/producao/squads",
  config: "/config",
};

export function pageToPath(page: string): string {
  return PAGE_PATHS[page] || "/inicio";
}
