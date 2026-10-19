"use client";

// Menu "/" de habilidades no chat: lista, filtro, detecção por áudio e aviso do modo obra.
//
// Fontes (nada inventado):
//  - /api/catalogo: nome, descrição e categoria de cada habilidade (a mesma da página Habilidades);
//  - /api/chat/habilidades: para as habilidades da pasta /root/.claude/skills, diz se é "modo obra"
//    (roda programa na VPS; regra no chat.js da squad-api) e quem é o especialista dela.
// Só aparecem no menu as habilidades que existem nas duas fontes: as outras (por exemplo as que
// ficam dentro do container do OpenClaw) o agente do chat não consegue ler.

import { useEffect, useState } from "react";
import { fetchCatalogo } from "./biblioteca";
import { chatApi } from "./chat";
import { categoriaChip, CATEGORIAS, nomeBonito } from "./habilidades";
import { ehPessoal } from "./modo";

export interface HabChat {
  id: string;
  rotulo: string;       // nome amigável ("Mapa institucional")
  descricao: string;    // uma linha: o que faz
  icone: string;
  obra: boolean;        // roda programa na VPS (chat ainda não executa)
  dono: string | null;  // especialista (id do agente), só informativo
  nomeN: string;        // rótulo + id normalizados, para busca
  descN: string;        // descrição normalizada
}

export const AVISO_OBRA = "Esta habilidade roda programa na VPS. Por enquanto peça pelo Telegram ou pelo terminal; no chat ela chega com o modo obra.";

export const normaliza = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ICONES: Record<string, string> = {
  "acontece-no-igam": "📣", aprender: "🎓", "assistir-video": "👁️", "criacao-edicao-imagem-gpt-image": "🖼️",
  "dg-editar-gravacao-bruta": "✂️", "documento-confirmar": "📄", "especificacao-curta": "📝", "fabrica-de-squads": "🏭",
  "frontend-design": "🎨", "gerador-post": "📱", "gerador-proposta": "💼", "gerar-prompt-seedance": "🎞️",
  lembrar: "🧠", lembretes: "⏰", "mapa-institucional": "🗺️", "mapa-por-audio": "📍", "mascote-agente": "🤖",
  "motion-design": "✨", opensquad: "👥", "pedir-ao-codex": "🖼️", radiografar: "🔬", "site-animado": "🌐",
  "site-animado-cinema": "🎬", "slide-animado": "📽️", socorro: "🆘", "video-animado": "🎥",
};

function primeiraFrase(t: string): string {
  const s = (t || "").split("\n")[0].replace(/\s+/g, " ").trim();
  const i = s.search(/[.!](\s|$)/);
  const f = i > 0 ? s.slice(0, i + 1) : s;
  return f.length > 120 ? f.slice(0, 119).replace(/\s\S*$/, "") + "…" : f;
}

/** Carrega as habilidades que dá para usar pelo chat. `lista` é null enquanto carrega ou se a API falhar. */
export function useHabilidadesChat(servidora: boolean): { lista: HabChat[]; pronto: boolean } {
  const [lista, setLista] = useState<HabChat[]>([]);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    Promise.all([fetchCatalogo(), chatApi.habilidades().catch(() => null)]).then(([cat, info]) => {
      if (!vivo) return;
      setPronto(true);
      if (!cat || !info) return;
      const itens: HabChat[] = [];
      for (const s of cat.skills) {
        const meta = info[s.nome];
        if (!meta) continue;
        const desc = s.descricao_simples || s.descricao;
        if (servidora && ehPessoal(s.nome, desc)) continue;
        const rotulo = nomeBonito(s.nome);
        const chip = categoriaChip(s.categoria);
        itens.push({
          id: s.nome, rotulo, descricao: primeiraFrase(desc),
          icone: ICONES[s.nome] ?? CATEGORIAS.find((c) => c.id === chip)?.emoji ?? "🧩",
          obra: meta.obra, dono: meta.dono,
          nomeN: normaliza(rotulo + " " + s.nome.replace(/-/g, " ")), descN: normaliza(primeiraFrase(desc)),
        });
      }
      itens.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
      setLista(itens);
    });
    return () => { vivo = false; };
  }, [servidora]);
  return { lista, pronto };
}

/** Onde está o "/" que abre o menu: no começo da caixa ou depois de espaço, logo antes do cursor. */
export function gatilhoBarra(texto: string, cursor: number): { inicio: number; consulta: string } | null {
  const antes = texto.slice(0, cursor);
  const m = /(^|\s)\/([^\s/]*)$/.exec(antes);
  if (!m) return null;
  return { inicio: antes.length - m[2].length - 1, consulta: m[2] };
}

/**
 * Filtra sem acento e sem diferenciar maiúscula. Ordem: começo de palavra no nome, trecho do nome (3+ letras),
 * começo de palavra na descrição e trecho da descrição (com 2 letras quase tudo
 * casaria: "/ma" tem que trazer "mapa", não metade do catálogo). Descrição só entra com 3+ letras
 * (começo de palavra) e 4+ letras (trecho).
 */
export function filtrarHabilidades(lista: HabChat[], consulta: string): HabChat[] {
  const q = normaliza(consulta.trim());
  if (!q) return lista;
  const pontos = (h: HabChat) => {
    if (h.nomeN.split(/[\s-]+/).some((p) => p.startsWith(q))) return 0;
    if (q.length >= 3 && h.nomeN.includes(q)) return 1;
    if (q.length >= 3 && h.descN.split(/[^a-z0-9]+/).some((p) => p.startsWith(q))) return 2;
    if (q.length >= 4 && h.descN.includes(q)) return 3;
    return 9;
  };
  return lista.map((h, i) => ({ h, p: pontos(h), i })).filter((x) => x.p < 9).sort((a, b) => a.p - b.p || a.i - b.i).map((x) => x.h);
}

/** "usa a habilidade mapa institucional" / "skill slide animado": acha a habilidade citada (nunca converte sozinho). */
export function detectarHabilidadeFalada(texto: string, lista: HabChat[]): HabChat | null {
  const n = normaliza(texto);
  const m = /\b(?:habilidade|skill)\s+(.*)$/.exec(n);
  if (!m || !lista.length) return null;
  const resto = m[1].replace(/^(?:chamada|de|do|da|o|a)\s+/, "").replace(/^(?:chamada|de|do|da|o|a)\s+/, "").trim();
  let melhor: HabChat | null = null; let tam = 0;
  for (const h of lista) {
    for (const nome of [normaliza(h.rotulo), normaliza(h.id.replace(/-/g, " "))]) {
      if (nome.length > tam && (resto === nome || resto.startsWith(nome + " ") || resto.startsWith(nome + ",") || resto.startsWith(nome + "."))) { melhor = h; tam = nome.length; }
    }
  }
  return melhor;
}
