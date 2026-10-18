"use client";

import { Suspense } from "react";
import MaquinaPage from "@/components/MaquinaPage";

// Suspense: as abas leem o ?aba= do endereço.
export default function MaquinaRoute() {
  return <Suspense fallback={null}><MaquinaPage /></Suspense>;
}
