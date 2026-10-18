"use client";

import { useState } from "react";
import { mascoteSrc } from "@/lib/mascotes";

// Mascote do agente. Se não houver imagem (ou ela falhar), mostra o emoji.
export default function Mascote({
  nome, emoji, tamanho, className = "", grande = false,
}: { nome?: string | null; emoji?: string | null; tamanho: number; className?: string; grande?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const src = mascoteSrc(nome, grande || tamanho > 128 ? 512 : 256);
  if (!src || falhou) {
    return (
      <span style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.62 }}
        className={`flex items-center justify-center shrink-0 leading-none ${className}`} aria-hidden>{emoji}</span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden width={tamanho} height={tamanho} loading="lazy" decoding="async"
    onError={() => setFalhou(true)} style={{ width: tamanho, height: tamanho }}
    className={`object-contain shrink-0 ${className}`} />;
}
