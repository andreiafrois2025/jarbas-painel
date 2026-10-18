"use client";

// O nível de leitura (Leigo / Intermediário / Código) fica fixo no topo e é lembrado
// entre fluxos: vale ?nivel= na URL, senão o último escolhido (localStorage), senão 1.

import { useCallback, useState } from "react";
import type { Nivel } from "../radiografia";

const CHAVE = "fluxos:nivel";

export function lerNivelSalvo(): Nivel | null {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return v === "1" || v === "2" || v === "3" ? (Number(v) as Nivel) : null;
  } catch { return null; }
}

export function useNivel(param: string | null): [Nivel, (n: Nivel) => void] {
  const [nivel, setNivel] = useState<Nivel>(() => {
    if (param === "1" || param === "2" || param === "3") return Number(param) as Nivel;
    if (typeof window === "undefined") return 1;
    return lerNivelSalvo() ?? 1;
  });
  const muda = useCallback((n: Nivel) => {
    setNivel(n);
    try { window.localStorage.setItem(CHAVE, String(n)); } catch { /* sem armazenamento, segue sem lembrar */ }
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("nivel", String(n));
      window.history.replaceState(window.history.state, "", u);
    } catch { /* sem URL, sem problema */ }
  }, []);
  return [nivel, muda];
}

const CHAVE_VISTA = "fluxos:ultima-vista";
export function lerUltimaVista(): string | null {
  try { return window.localStorage.getItem(CHAVE_VISTA); } catch { return null; }
}
export function guardarUltimaVista(v: string) {
  try { window.localStorage.setItem(CHAVE_VISTA, v); } catch { /* ok */ }
}
