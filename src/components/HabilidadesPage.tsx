"use client";

// Equipe › Habilidades: um card por habilidade (o que faz, como pedir, quem usa),
// separado em seções por grupo (src/lib/habilidades.ts, CATEGORIAS e GRUPO).
// Dados: /api/catalogo (skills lidas da VPS), com os catálogos locais de
// biblioteca.ts como reserva e para Prompts, Plugins e Referências.

import { useEffect, useMemo, useState } from "react";
import Mascote from "./Mascote";
import { Janela } from "./ui";
import { usePainel } from "@/lib/painel-context";
import { ehPessoal } from "@/lib/modo";
import { SKILLS, REFERENCIAS_EXTERNAS, fetchCatalogo, type SkillApiItem } from "@/lib/biblioteca";
import { CATEGORIAS, categoriaChip, comoPedir, nomeBonito, QUEM_USA, NOME_AGENTE, type CategoriaChip } from "@/lib/habilidades";

type Filtro = "todas" | CategoriaChip | "prompts" | "plugins" | "referencias";

interface Card extends SkillApiItem {
  chip: CategoriaChip;
  pedir: string | null;
  quem: string[];
}

const primeiraFrase = (t: string) => {
  const s = (t || "").split("\n")[0].replace(/\s+/g, " ").trim();
  const i = s.search(/[.!](\s|$)/);
  const f = i > 0 ? s.slice(0, i + 1) : s;
  return f.length > 220 ? f.slice(0, 219).replace(/\s\S*$/, "") + "…" : f;
};

export default function HabilidadesPage() {
  const { servidora } = usePainel();
  const [skills, setSkills] = useState<SkillApiItem[] | null>(null);
  const [aoVivo, setAoVivo] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<SkillApiItem | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchCatalogo().then((c) => {
      if (!vivo) return;
      if (c) { setSkills(c.skills); setAoVivo(true); return; }
      // sem a VPS: usa o catálogo local de reserva
      setSkills(SKILLS.flatMap((g) => g.itens).map((s) => ({
        nome: s.nome, descricao: s.descricao, descricao_simples: s.descricao, fonte_nome: "Andréia Frois",
        instalado: true, categoria: "⚙️ Sistema & Automação", conteudo: `# ${s.nome}\n\n${s.descricao}\n\nComo usar: ${s.como}`,
      })));
    });
    return () => { vivo = false; };
  }, []);

  const filtraPessoal = (l: SkillApiItem[]) => servidora ? l.filter((x) => !ehPessoal(x.nome, x.descricao_simples || x.descricao)) : l;

  // "Os agentes usam sozinhos" não mostra "como pedir": ela não chama essas.
  const instaladas: Card[] = useMemo(() => filtraPessoal(skills ?? []).map((s) => ({
    ...s,
    chip: categoriaChip(s.categoria, s.nome),
    pedir: categoriaChip(s.categoria, s.nome) === "agentes" ? null : comoPedir(s.descricao),
    quem: QUEM_USA[s.nome] ?? [],
  })).sort((a, b) => nomeBonito(a.nome).localeCompare(nomeBonito(b.nome), "pt-BR")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [skills, servidora]);

  const refs = (tipo: "skill" | "prompt" | "plugin"): Card[] => filtraPessoal(REFERENCIAS_EXTERNAS.filter((r) => (r.tipo || "skill") === tipo))
    .map((s) => ({ ...s, chip: categoriaChip(s.categoria, s.nome), pedir: null, quem: [] }));
  const prompts = useMemo(() => refs("prompt"), [servidora]); // eslint-disable-line react-hooks/exhaustive-deps
  const plugins = useMemo(() => refs("plugin"), [servidora]); // eslint-disable-line react-hooks/exhaustive-deps
  const referencias = useMemo(() => refs("skill"), [servidora]); // eslint-disable-line react-hooks/exhaustive-deps

  const base: Card[] = filtro === "prompts" ? prompts : filtro === "plugins" ? plugins : filtro === "referencias" ? referencias
    : filtro === "todas" ? instaladas : instaladas.filter((c) => c.chip === filtro);
  const q = busca.trim().toLowerCase();
  const lista = q ? base.filter((c) => [c.nome, c.descricao_simples, c.descricao, c.pedir].some((t) => t?.toLowerCase().includes(q))) : base;

  const chip = (ativo: boolean) =>
    `shrink-0 text-[13px] font-bold rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${
      ativo ? "bg-[var(--ac)] text-[var(--on-ac)] border-[var(--ac)]"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)]"}`;
  const emojiDe = (c: CategoriaChip) => CATEGORIAS.find((x) => x.id === c)?.emoji ?? "🧩";

  const copiar = (t: string) => navigator.clipboard.writeText(t).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); });

  const cartao = (c: Card) => (
    <button key={c.nome} onClick={() => setAberta(c)}
      className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col gap-2.5 min-w-0 hover:border-[var(--accent)] transition-colors cursor-pointer">
      <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug break-words">
        <span aria-hidden>{emojiDe(c.chip)} </span>{nomeBonito(c.nome)}
      </h2>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{primeiraFrase(c.descricao_simples || c.descricao)}</p>
      {c.pedir && (
        <p className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          <span className="sr-only">Como pedir: </span>“{c.pedir}”
        </p>
      )}
      {c.quem.length > 0 && (
        <p className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          quem usa:
          {c.quem.map((id) => (
            <span key={id} title={NOME_AGENTE[id]} className="inline-flex"><Mascote nome={NOME_AGENTE[id]} emoji="🤖" tamanho={28} /></span>
          ))}
          <span className="sr-only">{c.quem.map((id) => NOME_AGENTE[id]).join(", ")}</span>
        </p>
      )}
      {!c.quem.length && !c.instalado && <p className="mt-auto text-[11px] text-[var(--text-muted)]">⚪ Não instalado: só referência</p>}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          <button onClick={() => setFiltro("todas")} aria-pressed={filtro === "todas"} className={chip(filtro === "todas")}>Todas ({instaladas.length})</button>
          {CATEGORIAS.map((c) => (
            <button key={c.id} onClick={() => setFiltro(c.id)} aria-pressed={filtro === c.id} className={chip(filtro === c.id)}>{c.emoji} {c.rotulo} ({instaladas.filter((x) => x.chip === c.id).length})</button>
          ))}
          <button onClick={() => setFiltro("prompts")} aria-pressed={filtro === "prompts"} className={chip(filtro === "prompts")}>💬 Prompts</button>
          <button onClick={() => setFiltro("plugins")} aria-pressed={filtro === "plugins"} className={chip(filtro === "plugins")}>🔌 Plugins</button>
          {referencias.length > 0 && (
            <button onClick={() => setFiltro("referencias")} aria-pressed={filtro === "referencias"} className={chip(filtro === "referencias")}>📋 Referências</button>
          )}
        </div>
        <label className="relative w-full sm:w-64 shrink-0">
          <span className="sr-only">Buscar habilidade</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" aria-hidden>🔎</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar habilidade…" className="input-modern !pl-9 !py-2 text-sm w-full" />
        </label>
      </div>

      {CATEGORIAS.find((c) => c.id === filtro) && <p className="text-xs text-[var(--text-muted)]">{CATEGORIAS.find((c) => c.id === filtro)!.explica}</p>}
      {filtro === "prompts" && <p className="text-xs text-[var(--text-muted)]">Prompts prontos: cole direto no chat, não é código para instalar.</p>}
      {filtro === "plugins" && <p className="text-xs text-[var(--text-muted)]">Plugins e ferramentas de terceiros: referência, nada instalado.</p>}
      {filtro === "referencias" && <p className="text-xs text-[var(--text-muted)]">Material trazido de fora para avaliar: nada instalado. Clique num card para ver o passo a passo.</p>}

      {skills === null ? (
        <p className="text-sm text-[var(--text-muted)] animate-pulse">carregando…</p>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--text-secondary)]">
          <p className="text-4xl mb-2 opacity-40">🧰</p>
          {busca ? "Nenhuma habilidade encontrada." : "Nada guardado aqui ainda."}
        </div>
      ) : filtro === "todas" && !q ? (
        <div className="space-y-6">
          {CATEGORIAS.map((g) => {
            const doGrupo = lista.filter((c) => c.chip === g.id);
            if (!doGrupo.length) return null;
            return (
              <section key={g.id} className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{g.emoji} {g.rotulo} <span className="font-normal text-[var(--text-muted)]">({doGrupo.length})</span></h3>
                  <p className="text-xs text-[var(--text-muted)]">{g.explica}</p>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-stretch">
                  {doGrupo.map(cartao)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          {lista.map(cartao)}
        </div>
      )}
      {skills !== null && !aoVivo && <p className="text-xs text-[var(--text-muted)]">Mostrando o catálogo local: não consegui ler a VPS agora.</p>}

      {aberta && (
        <Janela titulo={nomeBonito(aberta.nome)} subtitulo={aberta.descricao_simples || primeiraFrase(aberta.descricao)} onFechar={() => setAberta(null)} largura="media">
          <div className="flex flex-col gap-3">
            <button onClick={() => copiar(aberta.conteudo)} className="self-start text-xs px-3 py-1.5 rounded-full font-bold bg-[var(--ac)] text-[var(--on-ac)] hover:opacity-90 cursor-pointer">
              {copiado ? "copiado!" : "📋 Copiar"}
            </button>
            <p className={`text-xs font-medium ${aberta.instalado ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
              {aberta.instalado ? "🟢 Instalado no ecossistema" : "⚪ Não instalado: só referência"}
            </p>
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] flex items-center gap-1.5">
              <span className="font-semibold text-[var(--text-primary)]">Fonte:</span>
              {aberta.fonte_url
                ? <a href={aberta.fonte_url} target="_blank" rel="noreferrer" className="underline hover:text-[var(--accent)]">{aberta.fonte_nome || "Andréia Frois"} ↗</a>
                : <span>{aberta.fonte_nome || "Andréia Frois"}</span>}
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-xs bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">{aberta.conteudo}</pre>
          </div>
        </Janela>
      )}
    </div>
  );
}
