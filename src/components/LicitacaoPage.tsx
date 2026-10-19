"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Mascote from "./Mascote";
import { fetchCatalogo } from "@/lib/biblioteca";
import { ehPessoal } from "@/lib/modo";
import { useRotaAreas, diaMes, hojeBR, type PrazosOutlook } from "@/lib/areas";
import { useUI, Botao, Cartao, Vazio } from "./ui";
import MarkdownLeve from "./MarkdownLeve";
import {
  ARQUIVO_EXEMPLO, NOME_ARQUIVO_EXEMPLO, SQUADS_LICITACAO, STATUS_JOB,
  areaDoProcesso, arquivosDoJob, atribuicaoAproximada, backendDemo, backendReal, dataHoraCurta, estadoDasEtapas,
  nomeAgente, nomeDocx, nomeSquad, numeroProcesso, rotuloArea, rotuloEtapa, secaoDoCaso, tamanho, temDocx,
  type AreaProc, type AreaTipo, type ArquivoLic, type Backend, type EstadoEtapa, type EtapaLic, type JobLic,
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

// Baixar: .docx formatado (Word) para texto/Markdown + link pequeno do original
function BaixarDoc({ backend, job, nome }: { backend: Backend; job: JobLic; nome: string }) {
  const { avisar } = useUI();
  const [convertendo, setConvertendo] = useState(false);
  const original = () => backend.baixarArquivo(job.jobId, nome).then((b) => salvarBlob(b, nome)).catch((e) => avisar(msgErro(e)));
  if (!temDocx(nome)) {
    return <button onClick={original} className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer">⬇️ Baixar</button>;
  }
  const docx = async () => {
    setConvertendo(true);
    try { salvarBlob(await backend.baixarDocx(job.squad, job.jobId, nome), nomeDocx(nome)); }
    catch (e) { avisar(msgErro(e)); }
    finally { setConvertendo(false); }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={docx} disabled={convertendo} className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer disabled:opacity-50">
        {convertendo ? "Convertendo…" : "⬇️ Baixar (Word)"}
      </button>
      <button onClick={original} className="text-[10px] underline text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">baixar original (.md)</button>
    </span>
  );
}

// ── Visor de documento (texto/Markdown) ─────────────────────────────────
function VisorDocumento({ backend, job, arquivos, compacto }: {
  backend: Backend; job: JobLic; arquivos: ArquivoLic[]; compacto?: boolean;
}) {
  const jobId = job.jobId;
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
        <BaixarDoc backend={backend} job={job} nome={atual.name} />
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
      <VisorDocumento backend={backend} job={job} arquivos={arquivos} compacto />

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

// ── Linha do tempo: "onde ESTE processo está agora" ─────────────────────
function LinhaDoTempo({ etapas, estados }: { etapas: EtapaLic[]; estados: EstadoEtapa[] }) {
  const refAtual = useRef<HTMLLIElement>(null);
  const idxAtual = estados.findIndex((e) => e === "agora" || e === "espera" || e === "parou");
  useEffect(() => {
    // rola só a lista de etapas; scrollIntoView arrastava a página inteira
    const li = refAtual.current, lista = li?.parentElement;
    if (li && lista) lista.scrollTop = Math.max(0, li.offsetTop - lista.clientHeight / 2);
  }, [idxAtual]);

  if (etapas.length === 0) return <p className="text-sm text-[var(--text-muted)]">Etapas indisponíveis agora.</p>;
  return (
    <ol className="relative space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
      {etapas.map((e, i) => {
        const est = estados[i];
        const quem = nomeAgente(e.agent);
        const m = {
          feita: { ic: "✓", cls: "text-[var(--text-secondary)]", nota: "" },
          agora: { ic: "⏳", cls: "text-[var(--text-primary)] font-semibold", nota: quem ? `${quem} está trabalhando agora` : "trabalhando agora" },
          espera: { ic: "⏸", cls: "text-[var(--text-primary)] font-semibold", nota: "parada esperando você" },
          parou: { ic: "🛑", cls: "text-red-500 font-semibold", nota: "parou aqui" },
          fila: { ic: "○", cls: "text-[var(--text-muted)]", nota: "" },
        }[est];
        return (
          <li key={String(e.id)} ref={i === idxAtual ? refAtual : undefined} className={`flex gap-2 text-sm items-start ${m.cls}`}>
            <span className="shrink-0 w-5 text-center" aria-label={est}>{m.ic}</span>
            <span className="min-w-0">
              {rotuloEtapa(e)}
              {e.agent && est !== "agora" && <span className="text-[11px] text-[var(--text-muted)] font-normal"> · {quem}</span>}
              {m.nota && <span className={`block text-[11px] font-normal ${est === "espera" ? "text-[#A0583C]" : est === "parou" ? "text-red-500" : "text-[var(--accent)]"}`}>{m.nota}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const Legenda = () => (
  <p className="text-[11px] text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border)]">
    ✓ feita · ⏳ trabalhando agora · ⏸ parada esperando você · ○ a seguir
  </p>
);

// ── Lista de documentos de um processo (Ler / Baixar / Drive) ───────────
function ListaDocumentos({ backend, job, docs, aprox, onDrive }: {
  backend: Backend; job: JobLic; docs: ArquivoLic[]; aprox: boolean; onDrive: () => void;
}) {
  const [lendo, setLendo] = useState<string | null>(null);

  if (docs.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] italic">Este processo ainda não gerou documentos.</p>;
  }
  return (
    <div>
      <ul className="space-y-1">
        {docs.map((d) => (
          <li key={d.name} className="flex flex-wrap items-center gap-2 text-sm bg-[var(--bg-tertiary)] rounded px-2 py-1.5">
            <span className="flex-1 min-w-[10rem] truncate" title={d.name}>📄 {d.name}</span>
            <span className="text-[11px] text-[var(--text-muted)]">{tamanho(d.size)}</span>
            <button
              onClick={() => setLendo(lendo === d.name ? null : d.name)}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
            >{lendo === d.name ? "Fechar" : "Ler"}</button>
            <BaixarDoc backend={backend} job={job} nome={d.name} />
          </li>
        ))}
      </ul>
      {lendo && docs.some((d) => d.name === lendo) && (
        <div className="mt-2">
          <VisorDocumento backend={backend} job={job} arquivos={docs.filter((d) => d.name === lendo)} compacto />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button onClick={onDrive} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer">☁️ Salvar no Drive</button>
        {job.driveFolder && <span className="text-[11px] text-[var(--text-muted)]">já salvo: {job.driveFolder}</span>}
      </div>
      {aprox && (
        <p className="text-[11px] text-[#A0583C] mt-2">
          Atribuição aproximada: a pasta de saída desta squad é compartilhada, então os documentos são separados pelo horário de início e fim do processo.
        </p>
      )}
    </div>
  );
}

// ── Visão completa de um processo (painel à direita) ────
function DetalheProcesso({ backend, job, area, etapas, estados, paradas, docs, aprox, aoVivo, ocupado, onDecidir, onParar, onDrive }: {
  backend: Backend; job: JobLic; area: AreaProc; etapas: EtapaLic[]; estados: EstadoEtapa[]; paradas: ParadaLic[];
  docs: ArquivoLic[]; aprox: boolean; aoVivo: string; ocupado: string | null;
  onDecidir: (p: ParadaLic, aprovado: boolean, comentario: string) => void; onParar: () => void; onDrive: () => void;
}) {
  const st = STATUS_JOB[job.status] || STATUS_JOB.cancelled;
  return (
    <>
      <Cartao className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Processo {numeroProcesso(job)} · {nomeSquad(job.squad)}</h2>
          <span className={`text-[11px] px-2 py-0.5 rounded border ${st.cor}`}>{st.rotulo}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded border ${area.area === "geirh" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[#A0583C] text-[#A0583C]"}`}>{rotuloArea(area)}</span>
          <span className="text-xs text-[var(--text-muted)]">iniciado {dataHoraCurta(job.startedAt)}</span>
          <div className="flex-1" />
          {job.status === "running" && paradas.length === 0 && <Botao tipo="perigo" onClick={onParar}>⏹️ Parar</Botao>}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">{job.topic}</p>
        {job.error?.message && (
          <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded p-2 mt-2">
            {job.error.message}
            {!backend.demo && <span className="block text-[var(--text-secondary)] mt-1">Para retomar de onde parou, use a barra de execuções no topo do painel.</span>}
          </p>
        )}
      </Cartao>

      {paradas.map((p) => (
        <CartaoParada
          key={`${p.jobId}:${p.stepId}`}
          backend={backend}
          job={job}
          parada={p}
          arquivos={docs.length > 0 ? docs : p.producedFiles.map((f) => ({ ...f, mtime: p.createdAt })).reverse()}
          ocupado={ocupado === `${p.jobId}:${p.stepId}`}
          onDecidir={(aprovado, comentario) => onDecidir(p, aprovado, comentario)}
          onParar={onParar}
        />
      ))}

      <div className="grid gap-4 2xl:grid-cols-[minmax(16rem,20rem)_1fr] items-start">
        <Cartao>
          <h2 className="font-semibold">Onde este processo está agora</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2">
            Processo {numeroProcesso(job)} · {nomeSquad(job.squad)} · iniciado {dataHoraCurta(job.startedAt)}
          </p>
          <LinhaDoTempo etapas={etapas} estados={estados} />
          <Legenda />
        </Cartao>

        <div className="space-y-4 min-w-0">
          <Cartao>
            <h2 className="font-semibold mb-2">Documentos deste processo ({docs.length})</h2>
            {docs.length > 0 && <VisorDocumento backend={backend} job={job} arquivos={docs} />}
            <div className="mt-3">
              <ListaDocumentos backend={backend} job={job} docs={docs} aprox={aprox} onDrive={onDrive} />
            </div>
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
  );
}


// ═══ Igam (redesenho 19/10/2026): cartões de processo + gaveta de novo processo ═══

/** Primeira linha útil do pedido, sem marcação, como título do cartão. */
function tituloDe(topic: string): string {
  const linha = (topic || "").split("\n").map((l) => l.replace(/^[#>*\-\s]+/, "").trim()).find((l) => l.length > 3) || "Processo sem título";
  return linha.length > 90 ? linha.slice(0, 87) + "…" : linha;
}

const NUMERO_DE_PASSOS = (estados: EstadoEtapa[]) => {
  const i = estados.findIndex((e) => e !== "feita");
  return i === -1 ? estados.length : i + 1;
};

function BarraEtapas({ estados }: { estados: EstadoEtapa[] }) {
  if (estados.length === 0) return <div className="h-1.5 rounded-full bg-[var(--border)] opacity-60" aria-hidden />;
  return (
    <div className="flex gap-1" role="img" aria-label={`etapa ${NUMERO_DE_PASSOS(estados)} de ${estados.length}`}>
      {estados.map((e, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: e === "feita" ? "var(--af-teal)" : e === "fila" ? "var(--border)" : "var(--ouro)" }}
        />
      ))}
    </div>
  );
}

function CartaoProcesso({
  backend, job, area, onArea, docs, etapas, estados, paradas, aberto, onAlternar, children,
}: {
  backend: Backend; job: JobLic; area: AreaProc; onArea: (a: AreaTipo, setor: string) => Promise<void>;
  docs: ArquivoLic[]; etapas: EtapaLic[]; estados: EstadoEtapa[]; paradas: ParadaLic[];
  aberto: boolean; onAlternar: () => void; children?: React.ReactNode;
}) {
  const [editandoArea, setEditandoArea] = useState(false);
  const [areaTmp, setAreaTmp] = useState<AreaTipo>(area.area);
  const [setorTmp, setSetorTmp] = useState(area.setor);
  const [gravando, setGravando] = useState(false);
  const st = STATUS_JOB[job.status] || STATUS_JOB.cancelled;
  const concluido = job.status === "completed";
  const espera = paradas[0];
  const idx = estados.findIndex((e) => e !== "feita");
  const etapaAtual = idx >= 0 ? etapas[idx] : undefined;
  const total = etapas.length;
  const n = NUMERO_DE_PASSOS(estados);
  const pacote = docs.find((d) => /pacote/i.test(d.name) && temDocx(d.name)) || docs.find((d) => temDocx(d.name));

  const ultimaLinha = () => {
    if (espera) {
      const oque = espera.stepName.replace(/^checkpoint-/, "").replace(/-/g, " ");
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "var(--ouro)", color: "var(--on-ac)" }} aria-hidden>AF</span>
          <p className="text-sm min-w-0"><b>Esperando você:</b> <span className="text-[var(--text-secondary)]">{oque}</span></p>
          <button onClick={aberto ? undefined : onAlternar} className="ml-auto shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer" style={{ background: "var(--ac)", color: "var(--on-ac)" }}>
            {aberto ? "Aberto abaixo" : "Revisar"}
          </button>
        </div>
      );
    }
    if (concluido) {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>✅ Pronto</span>
          {pacote
            ? <BaixarDoc backend={backend} job={job} nome={pacote.name} />
            : <span className="text-[var(--text-muted)] text-xs">{docs.length === 0 ? "sem documentos" : "pacote em formato não convertível"}</span>}
        </div>
      );
    }
    if (job.status === "running") {
      const quem = nomeAgente(etapaAtual?.agent);
      return (
        <div className="flex items-center gap-2.5 min-w-0 text-sm">
          <Mascote nome={etapaAtual?.agent} emoji="🤖" tamanho={30} />
          <span className="min-w-0 truncate">{quem || "A squad"} trabalhando{etapaAtual ? <span className="text-[var(--text-secondary)]">: {rotuloEtapa(etapaAtual)}</span> : null}</span>
        </div>
      );
    }
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        <span className={`text-[11px] px-1.5 py-0.5 rounded border mr-2 ${st.cor}`}>{st.rotulo}</span>
        {etapaAtual ? `parou em: ${rotuloEtapa(etapaAtual)}` : "encerrado"}
      </p>
    );
  };

  return (
    <li className={`rounded-xl border ${espera ? "border-[var(--ouro)]" : "border-[var(--border)]"} bg-[var(--bg-secondary)]`} style={{ boxShadow: "0 1px 2px var(--sombra)" }}>
      <div className="p-4">
        <div className="flex items-start gap-2">
          <h3 className="text-[15px] md:text-base font-bold leading-snug min-w-0 flex-1 break-words">{tituloDe(job.topic)}</h3>
          <button
            onClick={() => { setAreaTmp(area.area); setSetorTmp(area.setor); setEditandoArea(!editandoArea); }}
            aria-expanded={editandoArea}
            title="De quem é este processo?"
            className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--ac)] cursor-pointer shrink-0"
          >🏷️ {rotuloArea(area)}</button>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          {nomeSquad(job.squad)} · aberto em {dataHoraCurta(job.startedAt).slice(0, 5)}
          {total > 0 ? ` · ${concluido ? `${total} etapas` : `etapa ${n} de ${total}`}` : ""}
        </p>
        <div className="mt-2.5"><BarraEtapas estados={estados} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[12rem]">{ultimaLinha()}</div>
          {!(espera && !aberto) && (
            <button
              onClick={onAlternar}
              aria-expanded={aberto}
              className="text-[13px] px-3 py-1.5 rounded-full border border-[var(--border-light)] hover:border-[var(--ac)] font-semibold cursor-pointer"
            >{aberto ? "▾ Fechar processo" : espera ? "Abrir processo" : "Ver documentos"}</button>
          )}
        </div>
        {editandoArea && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap items-end gap-2">
            <label className="text-xs">
              <span className="block text-[var(--text-secondary)] mb-0.5">De quem é este processo?</span>
              <select value={areaTmp} onChange={(e) => setAreaTmp(e.target.value as AreaTipo)} className="text-sm px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <option value="geirh">Geirh</option>
                <option value="outras">Outras áreas</option>
              </select>
            </label>
            {areaTmp === "outras" && (
              <label className="text-xs">
                <span className="block text-[var(--text-secondary)] mb-0.5">Setor (opcional)</span>
                <input value={setorTmp} onChange={(e) => setSetorTmp(e.target.value)} maxLength={60} placeholder="ex.: GERUR" className="text-sm px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] w-32" />
              </label>
            )}
            <Botao
              disabled={gravando}
              onClick={async () => { setGravando(true); try { await onArea(areaTmp, setorTmp); setEditandoArea(false); } finally { setGravando(false); } }}
            >{gravando ? "Gravando…" : "Salvar"}</Botao>
          </div>
        )}
      </div>
      {aberto && <div className="border-t border-[var(--border)] p-3 md:p-4 bg-[var(--bg-primary)] rounded-b-xl">{children}</div>}
    </li>
  );
}

// ── Coluna da direita ───────────────────────────────────────────────────
const TituloCartao = ({ children, direita }: { children: React.ReactNode; direita?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-2 mb-3">
    <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">{children}</h2>
    {direita}
  </div>
);

function PrazosOutlook() {
  const { dados, erro, carregando } = useRotaAreas<PrazosOutlook>("/api/areas/prazos-outlook");
  const hoje = hojeBR();
  const quando = dados?.atualizado_em
    ? (() => {
        const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(dados.atualizado_em));
        return `${d === hoje ? "hoje" : diaMes(d)} ${dataHoraCurta(dados.atualizado_em).split(" ")[1]}`;
      })()
    : "";
  return (
    <Cartao>
      <TituloCartao direita={quando && <span className="text-[11px] font-bold text-[var(--ac)] text-right">pela ponte do ChatGPT · {quando}</span>}>Prazos do Outlook</TituloCartao>
      {carregando ? <p className="text-sm text-[var(--text-muted)]">carregando…</p>
        : erro || dados?.erro ? <p className="text-sm text-[var(--text-secondary)]">Não consegui ler os prazos agora. Os que já viraram tarefa continuam no Notion.</p>
        : !dados || dados.itens.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhum prazo novo.</p>
        : (
          <ul>
            {dados.itens.map((p) => (
              <li key={p.url} className="grid grid-cols-[3.2rem_1fr_auto] gap-x-2 items-start py-2 border-b border-dashed border-[var(--border)] last:border-0">
                <span className="text-sm font-bold" style={{ color: p.prazo < hoje ? "var(--danger)" : "var(--uau)" }}>{diaMes(p.prazo)}</span>
                <span className="text-sm min-w-0">
                  {p.assunto}
                  {p.fazer && <span className="block text-xs text-[var(--text-secondary)]">{p.fazer}</span>}
                </span>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--ac)] whitespace-nowrap">Notion ↗</a>
              </li>
            ))}
          </ul>
        )}
    </Cartao>
  );
}

const ehDoIgam = (...t: (string | undefined)[]) => /igam|seirh|infohidro|geoportal|geirh|licita|norma|outorga|hidric|hídric/i.test(t.filter(Boolean).join(" "));

function AtalhosIgam() {
  const [lista, setLista] = useState<{ rotulo: string; url: string; icone: string }[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetchCatalogo().then((c) => {
      if (!vivo) return;
      const itens: { rotulo: string; url: string; icone: string }[] = [];
      for (const cr of c?.criacoes || []) {
        for (const l of cr.links) {
          if (!ehDoIgam(cr.nome, cr.descricao, l.rotulo, l.url)) continue;
          if (ehPessoal(cr.nome, cr.descricao, l.rotulo)) continue;
          const nome = /^igam$/i.test(cr.nome.trim()) ? l.rotulo : cr.nome + (l.rotulo && l.rotulo !== "Abrir" ? ` · ${l.rotulo}` : "");
          itens.push({ rotulo: nome, url: l.url, icone: cr.icone });
        }
      }
      setLista(itens);
    });
    return () => { vivo = false; };
  }, []);
  return (
    <Cartao>
      <TituloCartao direita={<Link href="/config" className="text-[11px] font-bold text-[var(--ac)]">editar em Ajustes ›</Link>}>Atalhos do Igam</TituloCartao>
      {lista === null ? <p className="text-sm text-[var(--text-muted)]">carregando…</p>
        : lista.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhum atalho do Igam cadastrado ainda. Eles vêm de Ajustes › Atalhos.</p>
        : (
          <div className="flex flex-wrap gap-2">
            {lista.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 rounded-full border border-[var(--border-light)] text-[13px] font-semibold hover:border-[var(--ac)]">{l.icone} {l.rotulo}</a>
            ))}
          </div>
        )}
    </Cartao>
  );
}

const EQUIPE_IGAM = ["donna", "katrina", "harvey", "mike", "louis", "eric"];
function EquipeQueCuida() {
  return (
    <Cartao>
      <TituloCartao>Equipe que cuida</TituloCartao>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-1.5">
          {EQUIPE_IGAM.map((id) => (
            <span key={id} title={nomeAgente(id) || id}><Mascote nome={id} emoji="🤖" tamanho={44} /></span>
          ))}
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] flex-1 min-w-[10rem]">documentos, parecer, parte técnica, normas e preços</p>
      </div>
    </Cartao>
  );
}

// ── Gaveta lateral (novo processo) ──────────────────────────────────────
function Gaveta({ titulo, onFechar, children }: { titulo: React.ReactNode; onFechar: () => void; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onFechar(); } };
    document.addEventListener("keydown", aoTeclar);
    caixa.current?.querySelector<HTMLElement>("textarea, button")?.focus();
    return () => { document.removeEventListener("keydown", aoTeclar); document.body.style.overflow = antes; };
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex justify-end" onClick={onFechar} role="presentation">
      <div ref={caixa} role="dialog" aria-modal="true" aria-label="Novo processo" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg h-full bg-[var(--bg-primary)] border-l border-[var(--border)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="font-bold">{titulo}</h2>
          <button onClick={onFechar} aria-label="Fechar (Esc)" className="text-xl leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────
export default function LicitacaoPage({ pedidoNovo = 0 }: { pedidoNovo?: number }) {
  const { confirmar, avisar } = useUI();
  const [demo, setDemo] = useState(false);
  const backend = demo ? backendDemo : backendReal;

  const [jobs, setJobs] = useState<JobLic[]>([]);
  const [paradas, setParadas] = useState<Record<string, ParadaLic[]>>({});
  const [etapasPorSquad, setEtapasPorSquad] = useState<Record<string, EtapaLic[]>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  // arquivos da pasta de saída: por squad (compartilhada) ou, na demonstração, por processo
  const [arquivosGrupo, setArquivosGrupo] = useState<Record<string, ArquivoLic[]>>({});
  const [semResposta, setSemResposta] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState("");
  const [areas, setAreas] = useState<Record<string, AreaProc>>({});
  const [filtroArea, setFiltroArea] = useState<"todas" | AreaTipo>("todas");
  const [verConcluidos, setVerConcluidos] = useState(false);
  const [gaveta, setGaveta] = useState(false);

  // formulário (mesmo de antes, agora dentro da gaveta)
  const [squad, setSquad] = useState<SquadId>("apoio-licitacao-outro-setor");
  const [topic, setTopic] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [exemploCarregado, setExemploCarregado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const grupoDe = useCallback((j: JobLic) => (demo ? j.jobId : j.squad), [demo]);

  // o botão "Nova licitação" da faixa Fazer agora abre a gaveta
  useEffect(() => { if (pedidoNovo > 0) setGaveta(true); }, [pedidoNovo]);

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
      backend.areas().then(setAreas).catch(() => {});
      const grupos = new Map<string, string>();
      lista.forEach((j) => { const g = backend.demo ? j.jobId : j.squad; if (!grupos.has(g)) grupos.set(g, j.jobId); });
      const novos: Record<string, ArquivoLic[]> = {};
      await Promise.all([...grupos].map(async ([g, jobId]) => {
        try { novos[g] = await backend.arquivos(jobId); } catch { /* mantém o que já havia */ }
      }));
      setArquivosGrupo((a) => ({ ...a, ...novos }));
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

  useEffect(() => {
    setJobs([]); setParadas({}); setSelecionado(null); setArquivosGrupo({}); setAreas({}); setCarregou(false); setAoVivo("");
  }, [demo]);

  // etapas do pipeline de cada squad que aparece na lista (precisa para "etapa N de M")
  const squadsNaLista = useMemo(() => [...new Set(jobs.map((j) => j.squad))], [jobs]);
  useEffect(() => {
    squadsNaLista.forEach((sq) => {
      if (etapasPorSquad[sq]) return;
      backend.etapas(sq).then((e) => setEtapasPorSquad((p) => ({ ...p, [sq]: e }))).catch(() => {});
    });
  }, [backend, squadsNaLista, etapasPorSquad]);

  // ?processo=<jobId> (botão "Abrir processo" do Esperando você): abre esse processo uma vez
  const processoUrl = useSearchParams().get("processo");
  const abertoPorUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!processoUrl || abertoPorUrl.current === processoUrl) return;
    if (!jobs.some((j) => j.jobId === processoUrl)) return;
    abertoPorUrl.current = processoUrl;
    setSelecionado(processoUrl);
  }, [processoUrl, jobs]);

  const job = jobs.find((j) => j.jobId === selecionado) || null;
  const statusSel = job?.status;
  const jobSel = job?.jobId;
  useEffect(() => {
    setAoVivo("");
    if (!jobSel || statusSel !== "running") return;
    return backend.acompanhar(jobSel, (t) => setAoVivo((a) => (a + t).slice(-4000)));
  }, [backend, jobSel, statusSel]);

  const docsDe = useCallback(
    (j: JobLic) => arquivosDoJob(arquivosGrupo[grupoDe(j)] || [], j),
    [arquivosGrupo, grupoDe],
  );

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
      setSelecionado(id); setGaveta(false);
      await atualizar();
    } catch (e) {
      avisar(msgErro(e));
    } finally {
      setIniciando(false);
    }
  }

  const areaDe = (j: JobLic) => areaDoProcesso(j, areas);
  const filtrados = filtroArea === "todas" ? jobs : jobs.filter((j) => areaDe(j).area === filtroArea);
  const emAndamento = filtrados.filter((j) => ["running", "paused", "interrupted", "failed"].includes(j.status));
  const encerrados = filtrados.filter((j) => !["running", "paused", "interrupted", "failed"].includes(j.status));
  const [recente, ...maisConcluidos] = encerrados;

  async function definirArea(j: JobLic, area: AreaTipo, setor: string) {
    try {
      await backend.definirArea(j.jobId, area, setor);
      setAreas((a) => ({ ...a, [j.jobId]: { area, setor: area === "outras" ? setor.trim() : "" } }));
    } catch (e) {
      avisar(msgErro(e));
      throw e;
    }
  }

  // ── ações sobre um processo ───────────────────────────────────────────
  async function decidir(p: ParadaLic, aprovado: boolean, comentario: string) {
    setOcupado(`${p.jobId}:${p.stepId}`);
    try {
      await backend.decidir(p.jobId, p.stepId, aprovado, comentario);
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

  const cartao = (j: JobLic) => {
    const etapas = etapasPorSquad[j.squad] || [];
    const pj = paradas[j.jobId] || [];
    const estados = estadoDasEtapas(etapas, j, pj);
    const aberto = selecionado === j.jobId;
    return (
      <CartaoProcesso
        key={j.jobId}
        backend={backend} job={j} area={areaDe(j)} onArea={(a, st) => definirArea(j, a, st)}
        docs={docsDe(j)} etapas={etapas} estados={estados} paradas={pj}
        aberto={aberto}
        onAlternar={() => setSelecionado(aberto ? null : j.jobId)}
      >
        {aberto && (
          <DetalheProcesso
            backend={backend} job={j} area={areaDe(j)} etapas={etapas} estados={estados} paradas={pj}
            docs={docsDe(j)} aprox={atribuicaoAproximada(j, jobs) && !demo}
            aoVivo={aoVivo} ocupado={ocupado}
            onDecidir={decidir} onParar={() => parar(j)} onDrive={() => salvarNoDrive(j)}
          />
        )}
      </CartaoProcesso>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {demo && (
        <div className="px-3 md:px-5 py-2 bg-[#C4A460]/25 border-b border-[#C4A460] text-sm flex flex-wrap items-center gap-2" role="status">
          <b>Demonstração simulada.</b>
          <span>Nada vai para a VPS, nenhuma squad roda de verdade e todo o conteúdo é EXEMPLO FICTÍCIO.</span>
          <button onClick={() => setDemo(false)} className="underline cursor-pointer">sair da demonstração</button>
        </div>
      )}
      {semResposta && !demo && (
        <div className="px-3 md:px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] text-xs flex items-center gap-2" role="status">
          <span>🟡</span>
          <span className="text-[var(--text-secondary)]">Não consegui falar com a VPS agora, então <b>não sei dizer</b> o andamento dos processos.</span>
        </div>
      )}

      <div className="p-3 md:p-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] items-start">
        {/* ── processos ── */}
        <Cartao className="min-w-0 !p-4 md:!p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">Processos em andamento</h2>
            <button onClick={() => setGaveta(true)} className="px-4 py-2 rounded-full text-[13px] font-bold uppercase tracking-wide cursor-pointer" style={{ background: "var(--ac)", color: "var(--on-ac)" }}>
              + Novo processo
            </button>
          </div>
          {jobs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filtrar por área">
              {([["todas", "Todas"], ["geirh", "Geirh"], ["outras", "Outras áreas"]] as const).map(([v, r]) => (
                <button key={v} onClick={() => setFiltroArea(v)} aria-pressed={filtroArea === v}
                  className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${filtroArea === v ? "bg-[var(--ac)] border-[var(--ac)] text-[var(--on-ac)]" : "border-[var(--border-light)] hover:border-[var(--ac)]"}`}>{r}</button>
              ))}
            </div>
          )}
          {!carregou ? (
            <p className="text-sm text-[var(--text-muted)]">carregando…</p>
          ) : jobs.length === 0 ? (
            <Vazio icone="🗂️" titulo="Nenhum processo ainda"
              descricao="Use “+ Novo processo” para abrir o primeiro. Cada processo é uma execução da squad, com paradas para você aprovar."
              acao={<button onClick={() => setGaveta(true)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer mt-1">+ Novo processo</button>} />
          ) : (
            <>
              {emAndamento.length === 0 && <p className="text-sm text-[var(--text-secondary)] mb-3">Nada em andamento agora.</p>}
              <ul className="space-y-3">
                {emAndamento.map(cartao)}
                {recente && cartao(recente)}
              </ul>
              {maisConcluidos.length > 0 && (
                <>
                  <button onClick={() => setVerConcluidos(!verConcluidos)} aria-expanded={verConcluidos}
                    className="mt-3 w-full text-left text-sm text-[var(--text-secondary)] rounded-xl border border-dashed border-[var(--border-light)] px-4 py-3 hover:border-[var(--ac)] cursor-pointer">
                    {verConcluidos ? "▾ Esconder os concluídos" : `Mais ${maisConcluidos.length} ${maisConcluidos.length === 1 ? "concluído" : "concluídos"} ›`}
                  </button>
                  {verConcluidos && <ul className="space-y-3 mt-3">{maisConcluidos.map(cartao)}</ul>}
                </>
              )}
            </>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-3">Mostra os últimos 20 processos registrados na squad-api.</p>
        </Cartao>

        {/* ── coluna da direita ── */}
        <div className="space-y-4 min-w-0">
          <PrazosOutlook />
          <AtalhosIgam />
          <EquipeQueCuida />
        </div>
      </div>

      {gaveta && (
        <Gaveta titulo="Novo processo" onFechar={() => setGaveta(false)}>
          <label className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer mb-3">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            demonstração simulada
          </label>

          <div className="space-y-2 mb-3" role="radiogroup" aria-label="Qual squad">
            {SQUADS_LICITACAO.map((s) => (
              <label key={s.id}
                className={`block rounded-lg border p-3 cursor-pointer transition-colors ${squad === s.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}>
                <input type="radio" name="squad-licitacao" className="sr-only" checked={squad === s.id} onChange={() => setSquad(s.id)} />
                <div className="text-sm font-medium">{s.icone} {s.nome}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{s.resumo}</div>
              </label>
            ))}
          </div>

          <label className="block text-sm font-medium mb-1" htmlFor="topic-licitacao">Pedido / demanda</label>
          <textarea id="topic-licitacao" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Cole aqui o pedido do setor, o objeto, o nº do SEI, a modalidade e o que já se sabe."
            className="w-full min-h-[160px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />

          <div
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            role="button" tabIndex={0}
            className={`mt-3 rounded-lg border-2 border-dashed p-3 text-center text-xs cursor-pointer transition-colors ${arrastando ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}
          >
            📎 Arraste os anexos aqui ou clique para escolher
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">ofício, carta de exclusividade, proposta, planilhas… ficam na VPS, protegidos por login</div>
            <input ref={inputRef} type="file" multiple accept={TIPOS_ANEXO} className="hidden"
              onChange={(e) => { if (e.target.files) adicionarArquivos(e.target.files); e.target.value = ""; }} />
          </div>

          {anexos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {anexos.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 text-xs bg-[var(--bg-tertiary)] rounded px-2 py-1">
                  <span className="flex-1 truncate" title={f.name}>{f.name}</span>
                  <span className="text-[var(--text-muted)] shrink-0">{tamanho(f.size)}</span>
                  <button aria-label={`Remover ${f.name}`} onClick={() => setAnexos((a) => a.filter((x) => x !== f))}
                    className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer">×</button>
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
        </Gaveta>
      )}
    </div>
  );
}
