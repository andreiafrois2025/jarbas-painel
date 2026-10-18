"use client";

import { Suspense } from "react";
import AreasPage from "@/components/AreasPage";

// Suspense: as abas leem o ?aba= do endereço.
export default function AreasRoute() {
  return <Suspense fallback={null}><AreasPage /></Suspense>;
}
