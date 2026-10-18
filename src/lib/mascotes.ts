// Mascotes (robozinhos) dos agentes. Arquivos em public/mascotes/<id>-256.webp e -512.webp.
// Associação por nome normalizado (sem acento, minúsculas, sem título "Dr."/"Dra.").

const IDS = new Set([
  "jarbas", "eric", "mike", "izzy", "donna", "nara", "felipe", "harvey",
  "junior", "tonny", "theo", "rafaela", "louis", "lara", "sofia", "katrina",
]);

export function mascoteId(nome?: string | null): string | null {
  if (!nome) return null;
  const n = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(dra?|sr|sra)\.?\s+/g, "")
    .trim()
    .split(/\s+/)[0];
  return IDS.has(n) ? n : null;
}

/** Caminho do mascote (tamanho 256 para ícones pequenos, 512 para cards grandes) ou null. */
export function mascoteSrc(nome?: string | null, tamanho: 256 | 512 = 256): string | null {
  const id = mascoteId(nome);
  return id ? `/mascotes/${id}-${tamanho}.webp` : null;
}
