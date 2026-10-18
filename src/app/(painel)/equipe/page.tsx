"use client";

import { Suspense } from "react";
import EquipePage from "@/components/EquipePage";

// Suspense: as abas leem o ?aba= do endereço.
export default function EquipeRoute() {
  return <Suspense fallback={null}><EquipePage /></Suspense>;
}
