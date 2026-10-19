"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rotaInicial } from "@/lib/preferencias";

// Entrada do painel ("/"): leva para Conversa ou Áreas, conforme Ajustes › Aparência
// › "Abrir o painel em" (guardado neste navegador; padrão: Conversa).
export default function Entrada() {
  const router = useRouter();
  useEffect(() => { router.replace(rotaInicial()); }, [router]);
  return null;
}
