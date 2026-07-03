// Base da API/escritório das squads na VPS.
// Configurável via env var na Vercel; fallback mantém o domínio atual.
export const SQUAD_API_BASE =
  process.env.NEXT_PUBLIC_SQUAD_API_BASE || "https://squad.srv1536795.hstgr.cloud";
