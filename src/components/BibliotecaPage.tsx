"use client";

import { useEffect, useState } from "react";
import {
  CRIACOES,
  SKILLS,
  fetchCatalogo,
  criarCriacao,
  type Catalogo,
  type LinkItem,
  type NovaCriacaoPayload,
} from "@/lib/biblioteca";
import GrafoView from "./GrafoView";
import GrafoConteudoView from "./GrafoConteudoView";

// Biblioteca: acesso rápido a tudo que existe (links diretos) e o catálogo
// de skills/capacidades do ecossistema, com como acionar cada uma.
//
// 19/07/2026: aba Skills agora lê ao vivo da squad-api (/api/catalogo) —
// grid compacto de cards + modal com o SKILL.md completo e botão copiar.
// Aba Criações ganhou inserção manual (formulário) pra ela guardar coisas
// criadas fora da VPS (GPT, outras IAs). Se a API cair, tudo volta pro
// catálogo estático de sempre — a tela nunca quebra.

type Aba = "criacoes" | "skills" | "grafo" | "conhecimento";

const ORIGENS = ["Claude VPS", "Claude fora", "GPT", "Outra IA"];

// Item unificado de criação (estático ou vindo da API) pra renderizar junto.
interface CriacaoUnificada {
  icone: string;
  nome: string;
  descricao: string;
  links: LinkItem[];
  origem?: string;
}

export default function BibliotecaPage() {
  const [aba, setAba] = useState<Aba>("criacoes");
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [skillAberta, setSkillAberta] = useState<{
    nome: string;
    descricao: string;
    descricao_simples?: string;
    fonte_nome?: string;
    fonte_url?: string;
    conteudo: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [formAberto, setFormAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchCatalogo().then((c) => {
      if (vivo) {
        setCatalogo(c);
        setCarregando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function recarregar() {
    const c = await fetchCatalogo();
    setCatalogo(c);
  }

  function copiarConteudo(texto: string) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  const aoVivo = !!catalogo;

  // Monta a lista de skills a exibir: da API se disponível, senão achata o
  // catálogo estático (perde o "como usar" mas o formato vira consistente).
  const skillsExibidas = catalogo
    ? catalogo.skills
    : SKILLS.flatMap((g) => g.itens).map((s) => ({
        nome: s.nome,
        descricao: `${s.descricao} Como usar: ${s.como}`,
        descricao_simples: s.descricao,
        fonte_nome: "Andréia Frois",
        conteudo: `# ${s.nome}\n\n${s.descricao}\n\nComo usar: ${s.como}`,
      }));

  // Criações: mescla API + estáticas, agrupando por `grupo`.
  const gruposCriacoes = new Map<string, CriacaoUnificada[]>();
  for (const g of CRIACOES) {
    gruposCriacoes.set(g.grupo, g.itens.map((c) => ({ ...c })));
  }
  if (catalogo) {
    for (const c of catalogo.criacoes) {
      const lista = gruposCriacoes.get(c.grupo) || [];
      lista.push({ icone: c.icone, nome: c.nome, descricao: c.descricao, links: c.links, origem: c.origem });
      gruposCriacoes.set(c.grupo, lista);
    }
  }

  const botao = (id: Aba, rotulo: string) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
        aba === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">📚 Biblioteca</h1>
        {botao("criacoes", "🔗 Criações")}
        {botao("skills", "🧰 Skills")}
        {botao("grafo", "🕸️ Grafo")}
        {botao("conhecimento", "🧠 Conhecimento")}
      </div>

      <div className="flex-1 overflow-y-auto">
        {aba === "conhecimento" ? (
          <GrafoConteudoView />
        ) : aba === "grafo" ? (
          <GrafoView />
        ) : (
          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {aba === "criacoes" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {carregando ? "carregando…" : aoVivo ? "lido ao vivo da VPS" : "catálogo local"}
                  </p>
                  <button
                    onClick={() => setFormAberto(true)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium text-white hover:opacity-90 shrink-0"
                    style={{ background: "var(--accent, #2D6B6B)" }}
                  >
                    + Nova criação
                  </button>
                </div>
                {[...gruposCriacoes.entries()].map(([grupo, itens]) => (
                  <section key={grupo}>
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      {grupo}
                    </h2>
                    <div className="space-y-2">
                      {itens.map((c) => (
                        <div
                          key={`${grupo}-${c.nome}`}
                          className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{c.icone}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-[var(--text-primary)]">{c.nome}</p>
                                {c.origem && c.origem !== "Claude VPS" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
                                    {c.origem}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--text-secondary)]">{c.descricao}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {c.links.map((l) => (
                                  <a
                                    key={l.url}
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs px-3 py-1.5 rounded-full border font-medium hover:opacity-80"
                                    style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}
                                  >
                                    {l.rotulo} ↗
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                <p className="text-xs text-[var(--text-muted)] pb-4">
                  Pra adicionar itens feitos na VPS, é só me pedir no chat. Pra coisas criadas fora (GPT, outra IA), use o botão “+ Nova criação”.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-muted)]">
                  {carregando ? "carregando…" : aoVivo ? "lido ao vivo da VPS" : "catálogo local"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skillsExibidas.map((s) => (
                    <button
                      key={s.nome}
                      onClick={() => setSkillAberta(s)}
                      className="text-left bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl shrink-0">🧩</span>
                        <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{s.nome}</p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {(s.descricao_simples || s.descricao).split("\n")[0]}
                      </p>
                    </button>
                  ))}
                </div>

                {catalogo && catalogo.automacoes.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      ⚙️ Automações reais (cron)
                    </h2>
                    <div className="space-y-2">
                      {catalogo.automacoes.map((a, i) => (
                        <div
                          key={`${a.nome}-${i}`}
                          className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border)]"
                        >
                          <p className="font-medium text-sm text-[var(--text-primary)]">{a.nome}</p>
                          <p className="text-xs mt-1 font-mono text-[var(--text-muted)]">{a.agenda}</p>
                          <p className="text-xs mt-0.5 font-mono text-[var(--text-secondary)] truncate">
                            {a.comando}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {catalogo && catalogo.squads.length > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    🤖 Squads: {catalogo.squads.join(", ")}
                  </p>
                )}

                <p className="text-xs text-[var(--text-muted)] pb-4">
                  Clique num card pra ver o documento completo da skill e copiar.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {skillAberta && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSkillAberta(null)}
          onKeyDown={(e) => e.key === "Escape" && setSkillAberta(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)]">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">{skillAberta.nome}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {skillAberta.descricao_simples || skillAberta.descricao}
                </p>
              </div>
              <button
                onClick={() => setSkillAberta(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none shrink-0"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-hidden flex flex-col gap-3">
              <button
                onClick={() => copiarConteudo(skillAberta.conteudo)}
                className="self-start text-xs px-3 py-1.5 rounded-full font-medium text-white hover:opacity-90"
                style={{ background: "var(--accent, #2D6B6B)" }}
              >
                {copiado ? "copiado!" : "📋 Copiar"}
              </button>
              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)] flex items-center gap-1.5">
                <span className="font-semibold text-[var(--text-primary)]">Fonte:</span>
                {skillAberta.fonte_url ? (
                  <a
                    href={skillAberta.fonte_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--accent)] underline"
                  >
                    {skillAberta.fonte_nome || "Andréia Frois"} ↗
                  </a>
                ) : (
                  <span>{skillAberta.fonte_nome || "Andréia Frois"}</span>
                )}
              </div>
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap font-mono text-xs bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                {skillAberta.conteudo}
              </pre>
            </div>
          </div>
        </div>
      )}

      {formAberto && (
        <FormNovaCriacao
          onFechar={() => setFormAberto(false)}
          onSalvo={async () => {
            setFormAberto(false);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

// Formulário de criação manual — pra registrar coisas feitas fora da VPS
// (GPT, outra IA) que o Claude não teria como enxergar sozinho.
function FormNovaCriacao({ onFechar, onSalvo }: { onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [icone, setIcone] = useState("✨");
  const [grupo, setGrupo] = useState("Outras criações");
  const [origem, setOrigem] = useState(ORIGENS[0]);
  const [links, setLinks] = useState<LinkItem[]>([{ rotulo: "", url: "" }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarLink(i: number, campo: keyof LinkItem, valor: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro("nome é obrigatório");
      return;
    }
    setSalvando(true);
    setErro(null);
    const payload: NovaCriacaoPayload = {
      icone: icone.trim() || "✨",
      nome: nome.trim(),
      descricao: descricao.trim(),
      grupo: grupo.trim() || "Outras criações",
      origem,
      links: links.filter((l) => l.url.trim()).map((l) => ({ rotulo: l.rotulo.trim() || "Abrir", url: l.url.trim() })),
    };
    const resultado = await criarCriacao(payload);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || "falha ao salvar");
      return;
    }
    onSalvo();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onFechar}>
      <div
        className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <p className="font-semibold text-[var(--text-primary)]">+ Nova criação</p>
          <button onClick={onFechar} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="w-20 shrink-0">
              <label className="text-xs text-[var(--text-secondary)]">Ícone</label>
              <input
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                maxLength={4}
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-center"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[var(--text-secondary)]">Nome *</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)]">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[var(--text-secondary)]">Grupo</label>
              <input
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[var(--text-secondary)]">Origem</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
              >
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)]">Links</label>
            <div className="space-y-2 mt-1">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="rótulo"
                    value={l.rotulo}
                    onChange={(e) => atualizarLink(i, "rotulo", e.target.value)}
                    className="w-24 shrink-0 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-sm"
                  />
                  <input
                    placeholder="https://…"
                    value={l.url}
                    onChange={(e) => atualizarLink(i, "url", e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-sm"
                  />
                  <button
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
                    aria-label="Remover link"
                  >
                    −
                  </button>
                </div>
              ))}
              <button
                onClick={() => setLinks((prev) => [...prev, { rotulo: "", url: "" }])}
                className="text-xs text-[var(--accent)] font-medium"
              >
                + adicionar link
              </button>
            </div>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onFechar} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)]">
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
              style={{ background: "var(--accent, #2D6B6B)" }}
            >
              {salvando ? "salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
