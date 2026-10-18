"use client";

import { useEffect } from "react";

// Registra o service worker mínimo (public/sw.js) para o painel poder ser instalado como app.
export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => { /* instalar é opcional */ });
  }, []);
  return null;
}
