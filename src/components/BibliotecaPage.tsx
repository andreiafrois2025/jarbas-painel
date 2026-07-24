"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CRIACOES,
  SKILLS,
  REFERENCIAS_EXTERNAS,
  fetchCatalogo,
  criarCriacao,
  atualizarCriacao,
  excluirCriacao,
  type Catalogo,
  type LinkItem,
  type NovaCriacaoPayload,
  type AutomacaoApiItem,
} from "@/lib/biblioteca";
import { interpretaCron, formataProxima } from "@/lib/cron";
import GrafoView from "./GrafoView";

// Biblioteca: acesso rápido a tudo que existe (links diretos) e o catálogo
// de skills/capacidades do ecossistema, com como acionar cada uma.
//
// 19/07/2026: aba Skills agora lê ao vivo da squad-api (/api/catalogo) —
// grid compacto de cards + modal com o SKILL.md completo e botão copiar.
// Aba Criações ganhou inserção manual (formulário) pra ela guardar coisas
// criadas fora da VPS (GPT, outras IAs). Se a API cair, tudo volta pro
// catálogo estático de sempre — a tela nunca quebra.

type Aba = "criacoes" | "skills" | "automacoes" | "prompts" | "plugins" | "grafo";

const ORIGENS = ["Claude VPS", "Claude fora", "GPT", "Outra IA"];
const ICONES_SUGERIDOS = [
  "✨", "🖥️", "🌐", "📡", "🏭", "✅", "📈", "☁️", "⚡", "🎤",
  "🎨", "🎬", "🖼️", "📄", "📊", "🔗", "🤖", "📚", "💡", "🎒",
];

// Item unificado de criação (estático ou vindo da API) pra renderizar junto.
interface CriacaoUnificada {
  id?: string; // só as vindas da API têm id — só essas são editáveis/excluíveis
  icone: string;
  nome: string;
  descricao: string;
  links: LinkItem[];
  origem?: string;
  grupo?: string;
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
    instalado?: boolean;
    conteudo: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [criacaoEditando, setCriacaoEditando] = useState<CriacaoUnificada | null>(null);

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
        instalado: true,
        categoria: "⚙️ Sistema & Automação",
        conteudo: `# ${s.nome}\n\n${s.descricao}\n\nComo usar: ${s.como}`,
      }));

  // Referência externa por tipo — só skill entra na aba Skills; prompt/plugin
  // ganharam aba própria (pedido 24/07: "skill é pra ter só skill").
  const referenciasSkill = REFERENCIAS_EXTERNAS.filter((r) => (r.tipo || "skill") === "skill");
  const referenciasPrompt = REFERENCIAS_EXTERNAS.filter((r) => r.tipo === "prompt");
  const referenciasPlugin = REFERENCIAS_EXTERNAS.filter((r) => r.tipo === "plugin");

  // Agrupa por categoria (design, vídeo, imagem, sistema...) em vez de
  // listar tudo junto — pedido 24/07: "achar o que eu quero mais rápido".
  const gradeAgrupada = (lista: typeof skillsExibidas) => {
    const grupos = new Map<string, typeof skillsExibidas>();
    for (const item of lista) {
      const cat = item.categoria || "🧩 Outros";
      grupos.set(cat, [...(grupos.get(cat) || []), item]);
    }
    const ordem = [...grupos.keys()].sort();
    return (
      <div className="space-y-5">
        {ordem.map((cat) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
              {cat} <span className="text-[var(--text-muted)] font-normal">({grupos.get(cat)!.length})</span>
            </h3>
            {grade(grupos.get(cat)!)}
          </div>
        ))}
      </div>
    );
  };

  const grade = (lista: typeof skillsExibidas) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {lista.map((s) => (
        <button
          key={s.nome}
          onClick={() => setSkillAberta(s)}
          className="text-left bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl shrink-0">🧩</span>
            <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{s.nome}</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-3">
            {(s.descricao_simples || s.descricao).split("\n")[0]}
          </p>
          <p className={`text-[10px] mt-2 font-medium ${s.instalado ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}`}>
            {s.instalado ? "🟢 Instalado no ecossistema" : "⚪ Não instalado"}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Fonte: {s.fonte_nome || "Andréia Frois"}
          </p>
        </button>
      ))}
    </div>
  );

  // Criações: 24/07 — tudo migrou pro backend (editável). O catálogo estático
  // (CRIACOES) só entra como FALLBACK se a API cair, igual já fazia com Skills.
  const gruposCriacoes = new Map<string, CriacaoUnificada[]>();
  if (catalogo) {
    for (const c of catalogo.criacoes) {
      const lista = gruposCriacoes.get(c.grupo) || [];
      lista.push({ id: c.id, icone: c.icone, nome: c.nome, descricao: c.descricao, links: c.links, origem: c.origem, grupo: c.grupo });
      gruposCriacoes.set(c.grupo, lista);
    }
  } else if (!carregando) {
    for (const g of CRIACOES) {
      gruposCriacoes.set(g.grupo, g.itens.map((c) => ({ ...c })));
    }
  }
  // nomes de grupo já existentes, pra sugerir no formulário (evita duplicar/digitar errado)
  const gruposExistentes = [...gruposCriacoes.keys()].sort();

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
        {botao("automacoes", "⚙️ Automações")}
        {botao("prompts", "💬 Prompts")}
        {botao("plugins", "🔌 Plugins")}
        {botao("grafo", "🕸️ Grafo")}
      </div>

      <div className="flex-1 overflow-y-auto">
        {aba === "grafo" ? (
          <GrafoView />
        ) : (
          <div className={`p-4 md:p-6 mx-auto space-y-6 ${aba === "skills" || aba === "prompts" || aba === "plugins" ? "max-w-7xl" : "max-w-4xl"}`}>
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
                              <div className="flex flex-wrap gap-2 mt-2 items-center">
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
                                {c.id && (
                                  <>
                                    <button
                                      onClick={() => setCriacaoEditando(c)}
                                      className="text-xs px-3 py-1.5 rounded-full border font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border)]"
                                    >
                                      ✏️ Editar
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Excluir "${c.nome}"?`)) return;
                                        await excluirCriacao(c.id!);
                                        await recarregar();
                                      }}
                                      className="text-xs px-3 py-1.5 rounded-full border font-medium text-red-500 hover:text-red-600 border-[var(--border)]"
                                    >
                                      🗑️ Excluir
                                    </button>
                                  </>
                                )}
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
            ) : aba === "skills" ? (
              <>
                <p className="text-xs text-[var(--text-muted)]">
                  {carregando ? "carregando…" : aoVivo ? "lido ao vivo da VPS" : "catálogo local"}
                </p>
                {(() => {
                  const nossas = skillsExibidas.filter((s) => (s.fonte_nome || "Andréia Frois") === "Andréia Frois");
                  const outras = skillsExibidas.filter((s) => (s.fonte_nome || "Andréia Frois") !== "Andréia Frois");
                  return (
                    <>
                      <section>
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                          💎 Andréia Frois
                        </h2>
                        {nossas.length > 0 ? gradeAgrupada(nossas) : (
                          <p className="text-xs text-[var(--text-muted)]">Nenhuma skill nossa ainda.</p>
                        )}
                      </section>
                      <section>
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                          🌐 Outras fontes
                        </h2>
                        {gradeAgrupada(outras)}
                      </section>
                      <section>
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                          📋 Catálogo externo — referência (nada instalado)
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mb-2">
                          Material trazido de fora pra avaliar. Clique num card pra ver o passo a passo completo.
                        </p>
                        {gradeAgrupada(referenciasSkill)}
                      </section>
                    </>
                  );
                })()}

                {catalogo && catalogo.squads.length > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    🤖 Squads: {catalogo.squads.join(", ")}
                  </p>
                )}

                <p className="text-xs text-[var(--text-muted)] pb-4">
                  Clique num card pra ver o documento completo da skill e copiar.
                </p>
              </>
            ) : aba === "automacoes" ? (
              <AbaAutomacoes
                automacoes={catalogo?.automacoes || []}
                carregando={carregando}
                aoVivo={aoVivo}
              />
            ) : aba === "prompts" ? (
              <>
                <p className="text-xs text-[var(--text-muted)]">
                  Prompts prontos — cola direto no chat, não é código pra instalar.
                </p>
                {referenciasPrompt.length > 0 ? grade(referenciasPrompt) : (
                  <p className="text-xs text-[var(--text-muted)]">Nenhum prompt guardado ainda.</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-muted)]">
                  Plugins e ferramentas de terceiro (MCP, marketplace de plugins) — referência, nada instalado.
                </p>
                {referenciasPlugin.length > 0 ? gradeAgrupada(referenciasPlugin) : (
                  <p className="text-xs text-[var(--text-muted)]">Nenhum plugin guardado ainda.</p>
                )}
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
              <p className={`text-xs font-medium ${skillAberta.instalado ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}`}>
                {skillAberta.instalado ? "🟢 Instalado no ecossistema" : "⚪ Não instalado — só referência"}
              </p>
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

      {(formAberto || criacaoEditando) && (
        <FormNovaCriacao
          gruposExistentes={gruposExistentes}
          editando={criacaoEditando}
          onFechar={() => {
            setFormAberto(false);
            setCriacaoEditando(null);
          }}
          onSalvo={async () => {
            setFormAberto(false);
            setCriacaoEditando(null);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

// Formulário de criação manual — pra registrar coisas feitas fora da VPS
// (GPT, outra IA) que o Claude não teria como enxergar sozinho. 24/07: também
// serve pra EDITAR uma criação já existente (só as com id, vindas da API).
function FormNovaCriacao({
  onFechar, onSalvo, gruposExistentes, editando,
}: {
  onFechar: () => void;
  onSalvo: () => void;
  gruposExistentes: string[];
  editando: CriacaoUnificada | null;
}) {
  const [nome, setNome] = useState(editando?.nome || "");
  const [descricao, setDescricao] = useState(editando?.descricao || "");
  const [icone, setIcone] = useState(editando?.icone || "✨");
  const [grupo, setGrupo] = useState(editando?.grupo || "Outras criações");
  const [origem, setOrigem] = useState(editando?.origem || ORIGENS[0]);
  const [links, setLinks] = useState<LinkItem[]>(
    editando?.links?.length ? editando.links : [{ rotulo: "", url: "" }]
  );
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
      origem: origem.trim() || "Claude VPS",
      links: links.filter((l) => l.url.trim()).map((l) => ({ rotulo: l.rotulo.trim() || "Abrir", url: l.url.trim() })),
    };
    const resultado = editando?.id
      ? await atualizarCriacao(editando.id, payload)
      : await criarCriacao(payload);
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
          <p className="font-semibold text-[var(--text-primary)]">{editando ? "✏️ Editar criação" : "+ Nova criação"}</p>
          <button onClick={onFechar} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)]">Ícone</label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {ICONES_SUGERIDOS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcone(ic)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base hover:border-[var(--accent)] ${
                    icone === ic ? "border-[var(--accent)] bg-[var(--accent-soft,rgba(45,107,107,0.12))]" : "border-[var(--border)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
            <input
              value={icone}
              onChange={(e) => setIcone(e.target.value)}
              maxLength={4}
              placeholder="ou digite/cole outro emoji"
              className="w-24 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-center"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)]">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
            />
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
                list="grupos-existentes"
                placeholder="escolha ou digite um novo"
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
              <datalist id="grupos-existentes">
                {gruposExistentes.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[var(--text-secondary)]">Origem</label>
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                list="origens-sugeridas"
                placeholder="escolha ou digite"
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
              <datalist id="origens-sugeridas">
                {ORIGENS.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
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
              {salvando ? "salvando…" : editando ? "Salvar alterações" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Aba ⚙️ Automações — o inventário do relógio do ecossistema.
// 24/07/2026: reescrita. Antes era um grid de 4 colunas com o cron cru e o
// comando cortado (não dava pra ler nada). Agora:
//   · o cron vira português, já convertido pra horário de Brasília
//   · lista larga, ordenada da mais frequente pra mais rara
//   · clique abre o detalhe com o comando INTEIRO
//   · botão "ver o fluxo" liga com o desenho em Produção › Fluxos
// =============================================================

function AbaAutomacoes({
  automacoes, carregando, aoVivo,
}: {
  automacoes: AutomacaoApiItem[];
  carregando: boolean;
  aoVivo: boolean;
}) {
  const [aberta, setAberta] = useState<AutomacaoApiItem | null>(null);
  const [legendaAberta, setLegendaAberta] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Interpreta o cron uma vez só por automação.
  const itens = useMemo(
    () => automacoes.map((a) => ({ ...a, cron: interpretaCron(a.agenda) })),
    [automacoes],
  );

  const grupos = useMemo(() => {
    const m = new Map<string, typeof itens>();
    for (const a of itens) {
      const cat = a.categoria || "🩺 Sistema & Saúde";
      m.set(cat, [...(m.get(cat) || []), a]);
    }
    // Dentro de cada categoria: da que roda mais vezes pra que roda menos.
    for (const [, lista] of m) lista.sort((x, y) => x.cron.frequenciaMin - y.cron.frequenciaMin);
    return m;
  }, [itens]);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* clipboard bloqueado — ignora */ }
  }

  const detalhe = aberta ? interpretaCron(aberta.agenda) : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-[var(--text-primary)]">
          Tudo que dispara <strong>sozinho</strong> na VPS — {itens.length} agendamentos.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {carregando ? "carregando…" : aoVivo ? "lido ao vivo do crontab" : "catálogo local"} · horários em Brasília
        </p>
        <button
          onClick={() => setLegendaAberta(!legendaAberta)}
          className="text-xs underline decoration-dotted text-[var(--text-secondary)] cursor-pointer"
        >
          o que são os números com *?
        </button>
      </div>

      {legendaAberta && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] text-sm space-y-2">
          <p className="text-[var(--text-primary)]">
            É <strong>cron</strong>, a linguagem que o Linux usa pra agendar tarefas. São 5 campos,
            sempre nesta ordem — e o <code className="font-mono">*</code> quer dizer
            &ldquo;qualquer&rdquo;, como deixar um campo do formulário em branco:
          </p>
          <pre className="font-mono text-xs bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border)] overflow-x-auto">
{`minuto   hora   dia do mês   mês   dia da semana
  *       *          *         *          *`}
          </pre>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1">
            <li><code className="font-mono">*/5 * * * *</code> → a cada 5 minutos</li>
            <li><code className="font-mono">0 * * * *</code> → de hora em hora, no minuto 0</li>
            <li><code className="font-mono">30 9 * * *</code> → todo dia às 9h30 <em>UTC</em> = 6h30 aqui</li>
            <li><code className="font-mono">0 12 * * 0</code> → domingo ao meio-dia UTC</li>
          </ul>
          <p className="text-xs text-[var(--text-muted)]">
            O crontab da VPS roda em UTC. Nesta tela a tradução já sai em horário de Brasília (UTC−3);
            o cron cru fica ao lado, pra conferência.
          </p>
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          {carregando ? "" : "Nenhuma automação encontrada."}
        </p>
      ) : (
        <div className="space-y-6">
          {[...grupos.keys()].sort().map((cat) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                {cat}{" "}
                <span className="text-[var(--text-muted)] font-normal normal-case">
                  ({grupos.get(cat)!.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {grupos.get(cat)!.map((a, i) => (
                  <button
                    key={`${a.nome}-${i}`}
                    onClick={() => setAberta(a)}
                    className="text-left bg-[var(--bg-secondary)] rounded-xl px-4 py-3 border border-[var(--border)] hover:border-[var(--accent,#2D6B6B)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm text-[var(--text-primary)]">{a.nome}</p>
                      <span
                        className="shrink-0 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
                      >
                        {a.cron.descricao}
                      </span>
                    </div>
                    {a.descricao && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{a.descricao}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[var(--text-muted)]">
                      <span>⏭️ próxima: {formataProxima(a.cron.proxima)}</span>
                      <span className="font-mono">{a.agenda}</span>
                      {a.flow && <span className="text-[var(--accent,#2D6B6B)]">🗺️ tem fluxo desenhado</span>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {aberta && detalhe && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setAberta(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)]">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">{aberta.nome}</p>
                <p className="text-xs text-[var(--text-muted)]">{aberta.categoria}</p>
              </div>
              <button
                onClick={() => setAberta(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none shrink-0 cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {aberta.descricao && (
                <p className="text-sm text-[var(--text-primary)]">{aberta.descricao}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-2">
                <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Quando roda</p>
                  <p className="text-sm text-[var(--text-primary)]">{detalhe.descricao}</p>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                    cron: {aberta.agenda} (UTC)
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Próxima execução</p>
                  <p className="text-sm text-[var(--text-primary)]">{formataProxima(detalhe.proxima)}</p>
                  {aberta.script && (
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 break-all">
                      {aberta.script}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    Comando completo
                  </p>
                  <button
                    onClick={() => copiar(aberta.comando)}
                    className="text-xs px-3 py-1 rounded-full font-medium text-white hover:opacity-90 cursor-pointer"
                    style={{ background: "var(--accent, #2D6B6B)" }}
                  >
                    {copiado ? "copiado!" : "📋 Copiar"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border)]">
                  {aberta.comando}
                </pre>
              </div>

              {aberta.flow ? (
                <a
                  href={`/producao/fluxos?titulo=${encodeURIComponent(aberta.flow)}`}
                  className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full font-medium text-white hover:opacity-90"
                  style={{ background: "var(--accent, #2D6B6B)" }}
                >
                  🗺️ Ver o fluxo: {aberta.flow}
                </a>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Ainda não tem um fluxo desenhado pra essa automação. Peça pro Claude criar em
                  Produção › Fluxos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
