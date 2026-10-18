// Resumo das squads para Máquina › Squads (GET /api/squads-resumo da squad-api).
// Tudo vem do que existe de verdade: pipeline.yaml, state.json e os jobs.

import { squadFetch } from "./squadFetch";
import type { Squad } from "./types";

export type NoCaminho =
  | { tipo: "agente"; id: string; nome: string; verbo: string }
  | { tipo: "grupo"; id: "grupo"; nome: string; verbo: string; membros: string[] }
  | { tipo: "cp"; id: "cp" };

export interface ResumoSquad {
  code: string;
  nome: string;
  icone: string;
  descricao: string;
  categoria: "conteudo" | "igam" | "equipe" | null;
  caminho: NoCaminho[];
  ultima: { jobId: string; quando: string; topico: string } | null;
  rodando: { jobId: string; topico: string; desde: string } | null;
  estado: { status: string; etapa: number | null; total: number | null; rotulo: string | null } | null;
}

// Verbos que valem por squad (o servidor da squad-api traz o mesmo, mas só vale
// depois do próximo reinício dele; aqui garantimos já). strategist = Rafaela.
const VERBOS_POR_SQUAD: Record<string, Record<string, string>> = {
  "instagram-carrossel": { rafaela: "define a estratégia" },
};

export async function buscaResumoSquads(): Promise<ResumoSquad[] | null> {
  try {
    const r = await squadFetch("/api/squads-resumo");
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d.squads)) return null;
    return (d.squads as ResumoSquad[]).map((s) => ({
      ...s,
      caminho: s.caminho.map((n) => (n.tipo === "agente" && VERBOS_POR_SQUAD[s.code]?.[n.id] ? { ...n, verbo: VERBOS_POR_SQUAD[s.code][n.id] } : n)),
    }));
  } catch { return null; }
}

export interface JobResumo {
  jobId: string; squad: string; topic: string; status: string;
  startedAt: string; completedAt?: string; userStatus?: string;
}

export async function buscaJobs(): Promise<JobResumo[] | null> {
  try {
    const r = await squadFetch("/api/jobs");
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/** Código da squad na squad-api, tirado do link cadastrado (…?squad=codigo). */
export function codigoDaSquad(link?: string): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    const c = u.searchParams.get("squad");
    if (c) return c;
    const m = u.pathname.match(/(?:runner|office)\/([\w-]+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

const PARECE_TESTE = /\b(teste|testes|rascunho|c[oó]pia)\b/i;

export type MotivoRascunho = "nome de teste" | "cópia repetida" | "sem pasta no OpenSquad" | "desativada";

/**
 * Separa as squads de verdade dos rascunhos, testes e cópias. Nada é apagado:
 * quem cai em "rascunho" só vai para a faixa recolhida no fim da página.
 * Regras (na ordem): desativada; nome com "teste/rascunho/cópia"; mesmo código
 * de outra squad já listada (a mais antiga fica); código sem pasta em
 * /opt/opensquad/squads (só vale quando a lista de pastas foi carregada).
 */
export function separaSquads(squads: Squad[], codigosReais: Set<string> | null) {
  const reais: Squad[] = [];
  const rascunhos: { squad: Squad; motivo: MotivoRascunho }[] = [];
  const vistos = new Set<string>();
  for (const s of squads) { // já vêm em ordem de criação (mais antiga primeiro)
    const code = codigoDaSquad(s.link);
    let motivo: MotivoRascunho | null = null;
    if ((s.status || "active") === "inactive") motivo = "desativada";
    else if (PARECE_TESTE.test(s.name)) motivo = "nome de teste";
    else if (code && vistos.has(code)) motivo = "cópia repetida";
    else if (codigosReais && (!code || !codigosReais.has(code))) motivo = "sem pasta no OpenSquad";
    if (code && !motivo) vistos.add(code);
    if (motivo) rascunhos.push({ squad: s, motivo }); else reais.push(s);
  }
  return { reais, rascunhos };
}

/** "hoje 14h", "ontem 18h" ou "15/10". */
export function quandoCurto(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const fmt = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h");
  if (fmt(d) === fmt(hoje)) return `hoje ${hora}`;
  if (fmt(d) === fmt(ontem)) return `ontem ${hora}`;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}
