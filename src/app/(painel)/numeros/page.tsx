"use client";

import { Suspense } from "react";
import MetricasPage from "@/components/MetricasPage";

// Suspense: as abas leem o ?aba= do endereço.
export default function NumerosRoute() {
  return <Suspense fallback={null}><MetricasPage /></Suspense>;
}
