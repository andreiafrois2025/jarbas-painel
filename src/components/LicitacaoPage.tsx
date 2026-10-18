"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUI, Botao, Cartao, Vazio } from "./ui";
import MarkdownLeve from "./MarkdownLeve";
import {
  ARQUIVO_EXEMPLO, NOME_ARQUIVO_EXEMPLO, SQUADS_LICITACAO, STATUS_JOB,
  arquivosDoJob, backendDemo, backendReal, dataHora, estadoDasEtapas, nomeAgente,
  rotuloEtapa, secaoDoCaso, tamanho,
  type ArquivoLic, type Backend, type EstadoEtapa, type EtapaLic, type JobLic,
  type ParadaLic, type SquadId,
} from "@/lib/licitacao";

const INTERVALO_MS = 5000;
const LIMITE_ANEXO = 50 * 1024 * 1024; // mesmo teto da squad-api
const TIPOS_ANEXO = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.zip";

function salvarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const msgErro = (e: unknown) => (e instanceof Error ? e.message : "erro desconhecido");

// ── Visor de documento (texto/Markdown) ─────────────────────────────────
function VisorDocumento({ backend, jobId, arquivos, compacto }: {
  backend: Backend; jobId: string; arquivos: ArquivoLic[]; compacto?: boolean;
}) {
  const { avisar } = useUI();
  const [nome, setNome] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // se o escolhido sumiu (ou ainda não há escolha), vale o mais recente
  const atual = arquivos.find((a) => a.name === nome) || arquivos[0];
  const chave = atual ? `${atual.name}@${atual.mtime}` : "";

  useEffect(() => {
    if (!atual) { setTexto(null); return; }
    let vivo = true;
    setErro(null);
    backend.lerArquivo(jobId, atual.name)
      .then((t) => { if (vivo) setTexto(t); })
      .catch((e) => { if (vivo) { setTexto(null); setErro(msgErro(e)); } });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, jobId, chave]);

  if (!atual) {
    return <p className="text-sm text-[var(--text-muted)] italic">Nenhum documento gerado ainda.</p>;
  }

  const ehTexto = /\.(md|txt|csv|yaml|yml|json)$/i.test(atual.name);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select
          value={atual.name}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Documento"
          className="text-sm px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] max-w-full"
        >
          {arquivos.map((a) => <option key={a.name} value={a.name}>{a.name} ({tamanho(a.size)})</option>)}
        </select>
        <button
          onClick={() => backend.baixarArquivo(jobId, atual.name).then((b) => salvarBlob(b, atual.name)).catch((e) => avisar(msgErro(e)))}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
        >⬇️ Baixar</button>
      </div>
      <div className={`rounded-lg border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] p-4 overflow-auto ${compacto ? "max-h-[28rem]" : "max-h-[40rem]"}`}>
        {erro ? <p className="text-sm text-red-500">{erro}</p>
          : texto == null ? <p className="text-sm text-[var(--text-muted)]">abrindo…</p>
          : !ehTexto ? <p className="text-sm text-[var(--text-secondary)]">Este tipo de arquivo não tem visualização aqui. Use Baixar.</p>
          : /\.md$/i.test(atual.name) ? <MarkdownLeve texto={texto} />
          : <pre className="text-xs whitespace-pre-wrap break-words">{texto}</pre>}
      </div>
    </div>
  );
}

// ── Parada: "parado esperando você" ─────────────────────────────────────
function CartaoParada({ backend, job, parada, arquivos, onDecidir, onParar, ocupado }: {
  backend: Backend; job: JobLic; parada: ParadaLic; arquivos: ArquivoLic[];
  onDecidir: (aprovado: boolean, comentario: string) => void; onParar: () => void; ocupado: boolean;
}) {
  const [pedindo, setPedindo] = useState(false);
  const [comentario, setComentario] = useState("");

  return (
    <div className="rounded-xl border-2 border-[#C4A460] bg-[#C4A460]/10 p-4 mb-4" role="region" aria-label="Parada esperando você">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-lg">⏸️</span>
        <h2 className="font-semibold">Parado esperando você</h2>
        <span className="text-xs text-[var(--text-secondary)]">{rotuloEtapa({ id: parada.stepId, name: parada.stepName, type: "checkpoint" })}</span>
      </div>
      <p className="text-sm mb-3">{parada.stepPrompt}</p>

      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Documento para revisar</p>
      <VisorDocumento backend={backend} jobId={job.jobId} arquivos={arquivos} compacto />

      {pedindo ? (
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1" htmlFor="pedido-ajuste">O que precisa mudar?</label>
          <textarea
            id="pedido-ajuste"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ex.: inclui a justificativa do preço e marca o que ainda está [CONFIRMAR]."
            className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            autoFocus
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            A squad volta para a etapa anterior, refaz o documento com o seu texto e para de novo aqui para você conferir.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Botao tipo="secundario" onClick={() => setPedindo(false)} disabled={ocupado}>Voltar</Botao>
            <Botao
              onClick={() => onDecidir(false, comentario.trim())}
              disabled={ocupado || comentario.trim().length < 5}
            >{ocupado ? "Enviando…" : "Enviar pedido de ajuste"}</Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          <Botao onClick={() => onDecidir(true, "")} disabled={ocupado}>{ocupado ? "Enviando…" : "✅ Aprovar"}</Botao>
          <Botao tipo="secundario" onClick={() => setPedindo(true)} disabled={ocupado}>✏️ Pedir ajuste</Botao>
          <Botao tipo="perigo" onClick={onParar} disabled={ocupado}>⏹️ Parar</Botao>
        </div>
      )}
    </div>
  );
}

// ── Linha do tempo ──────────────────────────────────────────────────────
const MARCA: Record<EstadoEtapa, { icone: string; cls: string }> = {
  feita: { icone: "✅", cls: "text-[var(--text-secondary)]" },
  agora: { icone: "⏳", cls: "text-[var(--text-primary)] font-semibold" },
  espera: { icone: "⏸️", cls: "text-[var(--text-primary)] font-semibold" },
  fila: { icone: "◻️", cls: "text-[var(--text-muted)]" },
  parou: { icone: "🛑", cls: "text-red-500 font-semibold" },
};

function LinhaDoTempo({ etapas, estados }: { etapas: EtapaLic[]; estados: EstadoEtapa[] }) {
  const refAtual = useRef<HTMLLIElement>(null);
  const idxAtual = estados.findIndex((e) => e === "agora" || e === "espera" || e === "parou");
  useEffect(() => {
    refAtual.current?.scrollIntoView({ block: "nearest" });
  }, [idxAtual]);

  if (etapas.length === 0) return <p className="text-sm text-[var(--text-muted)]">Etapas indisponíveis agora.</p>;
  return (
    <ol className="space-y-1 max-h-[26rem] overflow-y-auto pr-1">
      {etapas.map((e, i) => {
        const m = MARCA[estados[i]];
        return (
          <li key={String(e.id)} ref={i === idxAtual ? refAtual : undefined} className={`flex gap-2 text-sm items-start ${m.cls}`}>
            <span className="shrink-0" aria-label={estados[i]}>{m.icone}</span>
            <span className="min-w-0">
              {rotuloEtapa(e)}
              {e.agent && <span className="text-[11px] text-[var(--text-muted)]"> · {nomeAgente(e.agent)}</span>}
              {estados[i] === "espera" && <span className="text-[11px] text-[#A0583C]"> · espera você</span>}
              {estados[i] === "agora" && <span className="text-[11px] text-[var(--accent)]"> · trabalhando</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Página ──────────────────────────────────────────────────────────────
export default function LicitacaoPage() {
  const { confirmar, avisar } = useUI();
  const [demo, setDemo] = useState(false);
  const backend = demo ? backendDemo : backendReal;

  const [jobs, setJobs] = useState<JobLic[]>([]);
  const [paradas, setParadas] = useState<Record<string, ParadaLic[]>>({});
  const [etapasPorSquad, setEtapasPorSquad] = useState<Record<string, EtapaLic[]>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoLic[]>([]);
  const [semResposta, setSemResposta] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState("");

  // formulário
  const [squad, setSquad] = useState<SquadId>("apoio-licitacao-outro-setor");
  const [topic, setTopic] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [exemploCarregado, setExemploCarregado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const job = jobs.find((j) => j.jobId === selecionado) || null;

  // ── atualização periódica ─────────────────────────────────────────────
  const atualizar = useCallback(async () => {
    try {
      const lista = await backend.listarJobs();
      setSemResposta(false);
      setJobs(lista);
      const mapa: Record<string, ParadaLic[]> = {};
      await Promise.all(lista.filter((j) => j.status === "running").map(async (j) => {
        try {
          const p = await backend.paradas(j.jobId);
          if (p.length > 0) mapa[j.jobId] = p;
        } catch { /* falha pontual: tenta de novo no próximo ciclo */ }
      }));
      setParadas(mapa);
    } catch (e) {
      console.warn("Licitação: a squad-api não respondeu", e);
      setSemResposta(true);
    } finally {
      setCarregou(true);
    }
  }, [backend]);

  useEffect(() => {
    atualizar();
    const id = setInterval(atualizar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [atualizar]);

  // trocar entre real e demonstração zera a seleção
  useEffect(() => {
    setJobs([]); setParadas({}); setSelecionado(null); setArquivos([]); setCarregou(false); setAoVivo("");
  }, [demo]);

  // sem nada escolhido: vai direto para o que está esperando por ela, ou para a mais recente
  useEffect(() => {
    if (selecionado || jobs.length === 0) return;
    const esperando = jobs.find((j) => paradas[j.jobId]);
    setSelecionado((esperando || jobs[0]).jobId);
  }, [jobs, paradas, selecionado]);

  // etapas do pipeline da squad escolhida (uma vez por squad)
  const squadSel = job?.squad;
  useEffect(() => {
    if (!squadSel || etapasPorSquad[squadSel]) return;
    backend.etapas(squadSel).then((e) => setEtapasPorSquad((p) => ({ ...p, [squadSel]: e }))).catch(() => {});
  }, [backend, squadSel, etapasPorSquad]);

  // arquivos do job escolhido: a cada ciclo enquanto roda, uma vez nos demais
  const statusSel = job?.status;
  const jobSel = job?.jobId;
  useEffect(() => {
    if (!jobSel) { setArquivos([]); return; }
    let vivo = true;
    const buscar = () => backend.arquivos(jobSel).then((a) => { if (vivo) setArquivos(a); }).catch(() => {});
    buscar();
    if (statusSel !== "running") return () => { vivo = false; };
    const id = setInterval(buscar, INTERVALO_MS);
    return () => { vivo = false; clearInterval(id); };
  }, [backend, jobSel, statusSel]);

  // acompanhamento ao vivo
  useEffect(() => {
    setAoVivo("");
    if (!jobSel || statusSel !== "running") return;
    const fechar = backend.acompanhar(jobSel, (t) => setAoVivo((a) => (a + t).slice(-4000)));
    return fechar;
  }, [backend, jobSel, statusSel]);

  const docsDoJob = useMemo(() => (job ? arquivosDoJob(arquivos, job) : []), [arquivos, job]);
  const etapas = job ? etapasPorSquad[job.squad] || [] : [];
  const paradasDoJob = job ? paradas[job.jobId] || [] : [];
  const estados = job ? estadoDasEtapas(etapas, job, paradasDoJob) : [];
  const totalParadas = Object.values(paradas).reduce((n, p) => n + p.length, 0);

  // ── formulário ────────────────────────────────────────────────────────
  function adicionarArquivos(lista: FileList | File[]) {
    const novos: File[] = [];
    for (const f of Array.from(lista)) {
      if (f.size > LIMITE_ANEXO) { avisar(`"${f.name}" passa de 50 MB e não foi anexado.`); continue; }
      novos.push(f);
    }
    setAnexos((a) => [...a, ...novos.filter((n) => !a.some((x) => x.name === n.name && x.size === n.size))]);
  }

  async function carregarExemplo() {
    try {
      const r = await fetch(ARQUIVO_EXEMPLO, { cache: "no-store" });
      if (!r.ok) throw new Error("exemplo indisponível");
      const md = await r.text();
      const sec = SQUADS_LICITACAO.find((s) => s.id === squad)!;
      setTopic(secaoDoCaso(md, sec.secaoExemplo) || md);
      const arq = new File([md], NOME_ARQUIVO_EXEMPLO, { type: "text/markdown" });
      setAnexos((a) => (a.some((x) => x.name === arq.name) ? a : [...a, arq]));
      setExemploCarregado(true);
    } catch (e) {
      avisar(`Não consegui carregar o exemplo: ${msgErro(e)}`);
    }
  }

  async function iniciar() {
    if (!topic.trim() || iniciando) return;
    setIniciando(true);
    try {
      const id = await backend.iniciar(squad, topic, anexos);
      setTopic(""); setAnexos([]); setExemploCarregado(false);
      setSelecionado(id);
      await atualizar();
    } catch (e) {
      avisar(msgErro(e));
    } finally {
      setIniciando(false);
    }
  }

  // ── ações sobre a execução escolhida ──────────────────────────────────
  async function decidir(p: ParadaLic, aprovado: boolean, comentario: string) {
    setOcupado(`${p.jobId}:${p.stepId}`);
    try {
      await backend.decidir(p.jobId, p.stepId, aprovado, comentario);
      // some o cartão na hora; o próximo ciclo traz a parada seguinte, se houver
      setParadas((m) => ({ ...m, [p.jobId]: (m[p.jobId] || []).filter((x) => x.stepId !== p.stepId) }));
      avisar(aprovado ? "Aprovado. A squad segue." : "Pedido de ajuste enviado. A squad vai refazer a etapa.");
      setTimeout(atualizar, 1500);
    } catch (e) {
      avisar(msgErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function parar(j: JobLic) {
    if (!(await confirmar({ titulo: "Parar esta squad?", descricao: "Ela é interrompida onde está. O que já foi produzido continua salvo.", acao: "Parar", destrutivo: true }))) return;
    try { await backend.parar(j.jobId); await atualizar(); } catch (e) { avisar(msgErro(e)); }
  }

  async function salvarNoDrive(j: JobLic) {
    if (!(await confirmar({ titulo: "Salvar os documentos no Drive?", descricao: "Eles sobem para a pasta Squads do Drive do Jarbas. Só acontece quando você clica aqui.", acao: "Salvar no Drive" }))) return;
    try { await backend.salvarNoDrive(j.jobId); avisar(demo ? "Na demonstração não há Drive." : "Enviando ao Drive. Confira em cerca de 30 segundos."); } catch (e) { avisar(msgErro(e)); }
  }

  const squadDe = (id: string) => SQUADS_LICITACAO.find((s) => s.id === id);

  return (
    <div className="flex-1 overflow-y-auto">
      {demo && (
        <div className="px-3 md:px-5 py-2 bg-[#C4A460]/25 border-b border-[#C4A460] text-sm flex flex-wrap items-center gap-2" role="status">
          <b>Demonstração simulada.</b>
          <span>Nada vai para a VPS, nenhuma squad roda de verdade e todo o conteúdo é EXEMPLO FICTÍCIO.</span>
        </div>
      )}
      {semResposta && !demo && (
        <div className="px-3 md:px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] text-xs flex items-center gap-2" role="status">
          <span>🟡</span>
          <span className="text-[var(--text-secondary)]">Não consegui falar com a VPS agora, então <b>não sei dizer</b> o andamento das execuções.</span>
        </div>
      )}
      {totalParadas > 0 && (
        <button
          onClick={() => setSelecionado(Object.keys(paradas)[0])}
          className="w-full text-left px-3 md:px-5 py-2 bg-[#C4A460]/20 border-b border-[#C4A460] text-sm cursor-pointer"
        >
          ⏸️ <b>{totalParadas} {totalParadas === 1 ? "parada esperando" : "paradas esperando"} você.</b> Clique para ver.
        </button>
      )}

      <div className="p-3 md:p-5 grid gap-4 lg:grid-cols-[minmax(20rem,26rem)_1fr] items-start">
        {/* ── coluna da esquerda: nova execução + histórico ── */}
        <div className="space-y-4 min-w-0">
          <Cartao>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">Nova execução</h2>
              <label className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                demonstração simulada
              </label>
            </div>

            <div className="space-y-2 mb-3" role="radiogroup" aria-label="Qual squad">
              {SQUADS_LICITACAO.map((s) => (
                <label
                  key={s.id}
                  className={`block rounded-lg border p-3 cursor-pointer transition-colors ${squad === s.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
                >
                  <input type="radio" name="squad-licitacao" className="sr-only" checked={squad === s.id} onChange={() => setSquad(s.id)} />
                  <div className="text-sm font-medium">{s.icone} {s.nome}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{s.resumo}</div>
                </label>
              ))}
            </div>

            <label className="block text-sm font-medium mb-1" htmlFor="topic-licitacao">Pedido / demanda</label>
            <textarea
              id="topic-licitacao"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Cole aqui o pedido do setor, o objeto, o nº do SEI, a modalidade e o que já se sabe."
              className="w-full min-h-[130px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
              role="button"
              tabIndex={0}
              className={`mt-3 rounded-lg border-2 border-dashed p-3 text-center text-xs cursor-pointer transition-colors ${arrastando ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}
            >
              📎 Arraste os anexos aqui ou clique para escolher
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">ofício, carta de exclusividade, proposta, planilhas… ficam na VPS, protegidos por login</div>
              <input
                ref={inputRef} type="file" multiple accept={TIPOS_ANEXO} className="hidden"
                onChange={(e) => { if (e.target.files) adicionarArquivos(e.target.files); e.target.value = ""; }}
              />
            </div>

            {anexos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {anexos.map((f) => (
                  <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 text-xs bg-[var(--bg-tertiary)] rounded px-2 py-1">
                    <span className="flex-1 truncate" title={f.name}>{f.name}</span>
                    <span className="text-[var(--text-muted)] shrink-0">{tamanho(f.size)}</span>
                    <button
                      aria-label={`Remover ${f.name}`}
                      onClick={() => setAnexos((a) => a.filter((x) => x !== f))}
                      className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                    >×</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <Botao tipo="secundario" onClick={carregarExemplo} disabled={iniciando}>🎓 Carregar exemplo do curso</Botao>
              <Botao onClick={iniciar} disabled={iniciando || !topic.trim()} className="flex-1">
                {iniciando ? "Iniciando…" : "▶️ Iniciar"}
              </Botao>
            </div>
            {exemploCarregado && (
              <p className="text-[11px] text-[#A0583C] mt-2">
                Exemplo FICTÍCIO da Geirh carregado (software e empresa inventados). Pode editar o texto antes de iniciar.
              </p>
            )}
          </Cartao>

          <Cartao>
            <h2 className="font-semibold mb-2">Execuções recentes</h2>
            {!carregou ? (
              <p className="text-sm text-[var(--text-muted)]">carregando…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Nenhuma execução ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {jobs.map((j) => {
                  const st = STATUS_JOB[j.status] || STATUS_JOB.cancelled;
                  const espera = !!paradas[j.jobId];
                  return (
                    <li key={j.jobId}>
                      <button
                        onClick={() => setSelecionado(j.jobId)}
                        aria-current={selecionado === j.jobId ? "true" : undefined}
                        className={`w-full text-left rounded-lg border p-2.5 cursor-pointer transition-colors ${selecionado === j.jobId ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                          <span>{squadDe(j.squad)?.icone} {squadDe(j.squad)?.nome}</span>
                          <span className="ml-auto">{dataHora(j.startedAt)}</span>
                        </div>
                        <div className="text-sm line-clamp-2 mt-0.5">{j.topic}</div>
                        <div className="mt-1 flex gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cor}`}>{st.rotulo}</span>
                          {espera && <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#C4A460] bg-[#C4A460]/20">⏸️ espera você</span>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[10px] text-[var(--text-muted)] mt-2">Mostra as últimas 20 execuções da squad-api.</p>
          </Cartao>
        </div>

        {/* ── coluna da direita: a execução escolhida ── */}
        <div className="min-w-0">
          {!job ? (
            <Cartao>
              <Vazio
                icone="⚖️"
                titulo="Escolha uma execução ou inicie uma nova"
                descricao="Aqui você acompanha as etapas, aprova as paradas e lê os documentos que a squad vai gerando."
              />
            </Cartao>
          ) : (
            <>
              <Cartao className="mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{squadDe(job.squad)?.icone} {squadDe(job.squad)?.nome}</h2>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${(STATUS_JOB[job.status] || STATUS_JOB.cancelled).cor}`}>
                    {(STATUS_JOB[job.status] || STATUS_JOB.cancelled).rotulo}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">início {dataHora(job.startedAt)}</span>
                  <div className="flex-1" />
                  {job.status === "running" && paradasDoJob.length === 0 && (
                    <Botao tipo="perigo" onClick={() => parar(job)}>⏹️ Parar</Botao>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">{job.topic}</p>
                {job.error?.message && (
                  <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded p-2 mt-2">
                    {job.error.message}
                    {!demo && <span className="block text-[var(--text-secondary)] mt-1">Para retomar de onde parou, use a barra de execuções no topo do painel.</span>}
                  </p>
                )}
              </Cartao>

              {paradasDoJob.map((p) => (
                <CartaoParada
                  key={`${p.jobId}:${p.stepId}`}
                  backend={backend}
                  job={job}
                  parada={p}
                  arquivos={docsDoJob.length > 0 ? docsDoJob : p.producedFiles.map((f) => ({ ...f, mtime: p.createdAt })).reverse()}
                  ocupado={ocupado === `${p.jobId}:${p.stepId}`}
                  onDecidir={(aprovado, comentario) => decidir(p, aprovado, comentario)}
                  onParar={() => parar(job)}
                />
              ))}

              <div className="grid gap-4 xl:grid-cols-[minmax(16rem,20rem)_1fr] items-start">
                <Cartao>
                  <h2 className="font-semibold mb-2">Etapas</h2>
                  <LinhaDoTempo etapas={etapas} estados={estados} />
                </Cartao>

                <div className="space-y-4 min-w-0">
                  <Cartao>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="font-semibold">Documentos gerados ({docsDoJob.length})</h2>
                      <div className="flex-1" />
                      {docsDoJob.length > 0 && (
                        <button
                          onClick={() => salvarNoDrive(job)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
                        >☁️ Salvar no Drive</button>
                      )}
                    </div>
                    {job.driveFolder && <p className="text-[11px] text-[var(--text-muted)] mb-2">Já salvo no Drive: {job.driveFolder}</p>}
                    <VisorDocumento backend={backend} jobId={job.jobId} arquivos={docsDoJob} />
                    {job.squad === "licitacao-igam" && !demo && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">
                        Esta squad grava numa pasta única. A lista mostra só o que foi alterado durante esta execução.
                      </p>
                    )}
                  </Cartao>

                  {job.status === "running" && (
                    <Cartao>
                      <details>
                        <summary className="cursor-pointer text-sm font-semibold">O que está acontecendo (ao vivo)</summary>
                        <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words max-h-64 overflow-auto bg-[var(--bg-tertiary)] rounded p-2">
                          {aoVivo || "aguardando as primeiras linhas…"}
                        </pre>
                      </details>
                    </Cartao>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
