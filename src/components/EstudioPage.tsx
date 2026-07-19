"use client";

// 🎬 Estúdio — Andréia revisa a edição automática dos reels: vê o vídeo,
// restaura/corta blocos de fala, ajusta zooms, corrige legendas e
// re-renderiza. Dados vêm da squad-api (contrato combinado com outro agente).

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  listarProjetos,
  buscarProjeto,
  rerenderizar,
  statusRerender,
  urlVideo,
  formatarMMSS,
  type ProjetoResumo,
  type ProjetoDetalhe,
  type Bloco,
  type Punch,
  type Correcao,
} from "@/lib/estudio";
import { tempoRelativo } from "@/lib/metrics";

// ---------- Lista de projetos ----------

function ListaProjetos({
  projetos,
  selecionado,
  onSelecionar,
}: {
  projetos: ProjetoResumo[];
  selecionado: string | null;
  onSelecionar: (name: string) => void;
}) {
  if (projetos.length === 0) {
    return (
      <div className="p-6 text-sm text-[var(--text-secondary)]">
        Nenhum projeto ainda. Edite um reel pelo bot do Telegram que ele aparece aqui.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto">
      {projetos.map((p) => (
        <button
          key={p.name}
          onClick={() => onSelecionar(p.name)}
          className={`text-left rounded-lg px-3 py-2 border transition-colors ${
            selecionado === p.name
              ? "border-[var(--accent)] bg-[var(--bg-secondary)]"
              : "border-transparent hover:bg-[var(--bg-secondary)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</span>
            {p.renderizando && <span className="text-xs animate-pulse">⏳</span>}
          </div>
          <span className="text-xs text-[var(--text-muted)]">editado {tempoRelativo(p.criado_em)}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Blocos de fala ----------

function BlocoCard({ bloco, onToggle }: { bloco: Bloco; onToggle: (i: number) => void }) {
  const duracao = Math.max(0, bloco.fim - bloco.ini);
  return (
    <button
      onClick={() => onToggle(bloco.i)}
      className={`text-left w-full rounded-lg p-2.5 border transition-all ${
        bloco.mantido
          ? "border-[var(--border)] bg-[var(--bg-secondary)]"
          : "border-[var(--border)] bg-[var(--bg-secondary)] opacity-45"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          {formatarMMSS(bloco.ini)}–{formatarMMSS(bloco.fim)} · {duracao.toFixed(1)}s
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
            bloco.mantido ? "bg-[#2D6B6B]" : "bg-[var(--text-muted)]"
          }`}
        >
          {bloco.mantido ? "mantido" : "cortado"}
        </span>
      </div>
      <p
        className={`text-sm text-[var(--text-primary)] ${
          bloco.mantido ? "" : "line-through text-[var(--text-muted)]"
        }`}
      >
        {bloco.texto}
      </p>
      {!bloco.mantido && bloco.motivo && (
        <p className="text-xs text-[var(--text-muted)] italic mt-1">motivo: {bloco.motivo}</p>
      )}
    </button>
  );
}

// ---------- Zooms (punches) ----------

function PunchesEditor({
  punches,
  onRemover,
  onAdicionar,
}: {
  punches: Punch[];
  onRemover: (t: number) => void;
  onAdicionar: (t: number) => void;
}) {
  const [novoT, setNovoT] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {punches.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">nenhum zoom extra</span>
        )}
        {punches.map((p) => (
          <span
            key={p.t}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
          >
            {p.t.toFixed(1)}s{p.motivo ? ` · ${p.motivo}` : ""}
            <button
              onClick={() => onRemover(p.t)}
              className="text-[var(--text-muted)] hover:text-red-500 font-bold"
              aria-label="remover zoom"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          value={novoT}
          onChange={(e) => setNovoT(e.target.value)}
          placeholder="segundos"
          className="w-24 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
        />
        <button
          onClick={() => {
            const t = parseFloat(novoT);
            if (!isNaN(t) && t >= 0) {
              onAdicionar(t);
              setNovoT("");
            }
          }}
          className="text-xs px-3 py-1.5 rounded-lg font-medium border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
        >
          + adicionar zoom em {novoT || "…"}s
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)] italic mt-2">
        o zoom do gancho (3s iniciais) é fixo
      </p>
    </div>
  );
}

// ---------- Correções de legenda ----------

function CorrecoesEditor({
  correcoes,
  onMudar,
  onAdicionar,
  onRemover,
}: {
  correcoes: Correcao[];
  onMudar: (i: number, campo: "de" | "para", valor: string) => void;
  onAdicionar: () => void;
  onRemover: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {correcoes.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={c.de}
            onChange={(e) => onMudar(i, "de", e.target.value)}
            placeholder="trocar"
            className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-muted)]">por</span>
          <input
            value={c.para}
            onChange={(e) => onMudar(i, "para", e.target.value)}
            placeholder="por"
            className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
          <button
            onClick={() => onRemover(i)}
            className="text-[var(--text-muted)] hover:text-red-500 font-bold text-sm px-1"
            aria-label="remover correção"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={onAdicionar}
        className="self-start text-xs px-3 py-1.5 rounded-lg font-medium border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
      >
        + adicionar correção
      </button>
    </div>
  );
}

// ---------- Detalhe do projeto ----------

function DetalheProjeto({ name, onAtualizadoLista }: { name: string; onAtualizadoLista: () => void }) {
  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [blocosMantidos, setBlocosMantidos] = useState<Set<number>>(new Set());
  const [punches, setPunches] = useState<Punch[]>([]);
  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroRender, setErroRender] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const p = await buscarProjeto(name);
      setProjeto(p);
      setBlocosMantidos(new Set(p.blocks.filter((b) => b.mantido).map((b) => b.i)));
      setPunches(p.punches || []);
      setCorrecoes([]);
      setErroRender(null);
    } catch {
      setErro("Não consegui carregar este projeto.");
    }
  }, [name]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // polling enquanto renderiza
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (projeto?.renderizando) {
      pollRef.current = setInterval(async () => {
        try {
          const s = await statusRerender(name);
          if (!s.renderizando) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (s.lastExit && s.lastExit !== 0) {
              setErroRender(s.erro || `Renderização falhou (código ${s.lastExit}).`);
              setProjeto((p) => (p ? { ...p, renderizando: false } : p));
            } else {
              await carregar();
              onAtualizadoLista();
            }
          }
        } catch {
          // tenta de novo no próximo tick
        }
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto?.renderizando, name]);

  const toggleBloco = (i: number) => {
    setBlocosMantidos((s) => {
      const novo = new Set(s);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  };

  const removerPunch = (t: number) => setPunches((ps) => ps.filter((p) => p.t !== t));
  const adicionarPunch = (t: number) => setPunches((ps) => [...ps, { t }].sort((a, b) => a.t - b.t));

  const mudarCorrecao = (i: number, campo: "de" | "para", valor: string) =>
    setCorrecoes((cs) => cs.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  const adicionarCorrecao = () => setCorrecoes((cs) => [...cs, { de: "", para: "" }]);
  const removerCorrecao = (i: number) => setCorrecoes((cs) => cs.filter((_, idx) => idx !== i));

  // segundos mantidos no reel final
  const segundosNoReel = useMemo(() => {
    if (!projeto) return 0;
    return projeto.blocks
      .filter((b) => blocosMantidos.has(b.i))
      .reduce((acc, b) => acc + Math.max(0, b.fim - b.ini), 0);
  }, [projeto, blocosMantidos]);

  const houveMudanca = useMemo(() => {
    if (!projeto) return false;
    const mantidosOriginais = new Set(projeto.blocks.filter((b) => b.mantido).map((b) => b.i));
    const mesmosBlocos =
      mantidosOriginais.size === blocosMantidos.size &&
      [...mantidosOriginais].every((i) => blocosMantidos.has(i));
    const mesmosPunches =
      (projeto.punches || []).length === punches.length &&
      (projeto.punches || []).every((p, idx) => p.t === punches[idx]?.t);
    const correcoesValidas = correcoes.filter((c) => c.de.trim() || c.para.trim());
    return !mesmosBlocos || !mesmosPunches || correcoesValidas.length > 0;
  }, [projeto, blocosMantidos, punches, correcoes]);

  const reRenderizar = async () => {
    if (!projeto) return;
    setEnviando(true);
    setErroRender(null);
    try {
      const correcoesValidas = correcoes.filter((c) => c.de.trim() && c.para.trim());
      const resultado = await rerenderizar(
        name,
        [...blocosMantidos],
        punches.map((p) => ({ t: p.t })),
        correcoesValidas
      );
      if (resultado.ok) {
        setProjeto((p) => (p ? { ...p, renderizando: true } : p));
        onAtualizadoLista();
      } else if (resultado.status === 410) {
        setErroRender(resultado.erro || "O vídeo bruto deste projeto não existe mais.");
      } else if (resultado.status === 409) {
        setErroRender(resultado.erro || "Já existe uma renderização em andamento.");
      } else {
        setErroRender(resultado.erro || "Não consegui pedir a re-renderização.");
      }
    } finally {
      setEnviando(false);
    }
  };

  if (erro) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">{erro}</div>;
  }
  if (!projeto) {
    return <div className="p-6 text-sm text-[var(--text-secondary)] animate-pulse">Carregando projeto…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* player */}
        <div className="shrink-0 mx-auto lg:mx-0" style={{ maxWidth: 380, width: "100%" }}>
          <video
            key={`${projeto.reelUrl}-${projeto.reelMtime}`}
            controls
            playsInline
            className="w-full rounded-xl border border-[var(--border)] bg-black"
            src={urlVideo(projeto.reelUrl, projeto.reelMtime)}
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {segundosNoReel.toFixed(1)}s no reel final (bruto: {formatarMMSS(projeto.duracao_bruta)})
          </p>

          <div className="mt-4">
            <button
              disabled={!houveMudanca || enviando || projeto.renderizando}
              onClick={reRenderizar}
              className="w-full text-sm px-4 py-2.5 rounded-lg font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: "#2D6B6B" }}
            >
              {projeto.renderizando || enviando ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <span className="animate-spin">⏳</span> Renderizando…
                </span>
              ) : (
                "🎬 Re-renderizar"
              )}
            </button>
            {erroRender && (
              <p className="text-xs text-red-500 mt-2">{erroRender}</p>
            )}
          </div>
        </div>

        {/* editor */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🗣 Blocos de fala</h2>
            <div className="flex flex-col gap-2">
              {projeto.blocks.map((b) => (
                <BlocoCard
                  key={b.i}
                  bloco={{ ...b, mantido: blocosMantidos.has(b.i) }}
                  onToggle={toggleBloco}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🔍 Zooms</h2>
            <PunchesEditor punches={punches} onRemover={removerPunch} onAdicionar={adicionarPunch} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">✏️ Correções de legenda</h2>
            <CorrecoesEditor
              correcoes={correcoes}
              onMudar={mudarCorrecao}
              onAdicionar={adicionarCorrecao}
              onRemover={removerCorrecao}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- Página principal ----------

export default function EstudioPage() {
  const [projetos, setProjetos] = useState<ProjetoResumo[] | null>(null);
  const [erro, setErro] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const carregarLista = useCallback(async () => {
    try {
      const lista = await listarProjetos();
      lista.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      setProjetos(lista);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  if (erro) {
    return (
      <div className="p-6 text-sm text-[var(--text-secondary)]">
        Não consegui carregar os projetos do Estúdio. (Precisa da squad-api ativa na VPS.)
      </div>
    );
  }
  if (!projetos) {
    return <div className="p-6 text-sm text-[var(--text-secondary)] animate-pulse">Carregando projetos…</div>;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-64 shrink-0 border-r border-[var(--border)] overflow-y-auto">
        <ListaProjetos projetos={projetos} selecionado={selecionado} onSelecionar={setSelecionado} />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {selecionado ? (
          <DetalheProjeto name={selecionado} onAtualizadoLista={carregarLista} />
        ) : (
          <div className="p-6 text-sm text-[var(--text-secondary)]">
            {projetos.length === 0
              ? "Nenhum projeto ainda. Edite um reel pelo bot do Telegram que ele aparece aqui."
              : "Selecione um projeto na lista ao lado."}
          </div>
        )}
      </div>
    </div>
  );
}
