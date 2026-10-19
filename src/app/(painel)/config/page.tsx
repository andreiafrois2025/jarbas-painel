"use client";

import { Suspense } from "react";
import ConfigPage from "@/components/ConfigPage";

// Suspense: o menu de seções lê o ?s= do endereço.
export default function ConfigRoute() {
  return <Suspense fallback={null}><ConfigPage /></Suspense>;
}
