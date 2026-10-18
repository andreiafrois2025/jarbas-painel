"use client";

// 💬 Chat do painel: conversa com o Jarbas e com cada funcionário.
// Backend: squad-api /api/chat/* (Claude só leitura; ações só com o botão Confirmar).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatApi, dividirResposta, enviarMensagem, type Acao, type Agente, type ConversaResumo, type Mensagem, type Uso } from "@/lib/chat";
import TextoSeguro from "./chat/TextoSeguro";
import Visuais from "./chat/Visuais";

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const minuscula = (s: string) => (s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s);

export default function ChatPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteId, setAgenteId] = useState("jarbas");
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [fluxo, setFluxo] = useState(""); // resposta chegando aos poucos
  const [status, setStatus] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [uso, setUso] = useState<Uso | null>(null);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<{ id: string; nome: string }[]>([]);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const ctl = useRef<AbortController | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const agente = useMemo(() => agentes.find((a) => a.id === agenteId), [agentes, agenteId]);

  // inicial: lista de pessoas, uso e o último funcionário usado neste aparelho
  useEffect(() => {
    try { const s = window.localStorage.getItem("chatAgente"); if (s) setAgenteId(s); } catch { /* sem storage */ }
    chatApi.agentes().then(setAgentes).catch((e) => setErro(e.message));
    chatApi.uso().then(setUso).catch(() => {});
  }, []);

  const abrirConversa = useCallback(async (id: string) => {
    try { const c = await chatApi.conversa(id); setConversaId(id); setMsgs(c.mensagens); setErro(""); } catch (e) { setErro((e as Error).message); }
  }, []);

  // ao trocar de pessoa: abre a conversa mais recente dela (ou uma em branco)
  useEffect(() => {
    if (!agentes.length) return;
    try { window.localStorage.setItem("chatAgente", agenteId); } catch { /* sem storage */ }
    setConversaId(null); setMsgs([]); setFluxo(""); setErro(""); setAnexos([]);
    chatApi.conversas(agenteId).then((cs) => { setConversas(cs); if (cs[0]) abrirConversa(cs[0].id); }).catch((e) => setErro(e.message));
  }, [agenteId, agentes.length, abrirConversa]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, fluxo, status]);

  const enviar = useCallback(async (conteudo: string) => {
    const m = conteudo.trim();
    if (!m || ocupado) return;
    setErro(""); setOcupado(true); setFluxo(""); setStatus("pensando…");
    const idsAnexos = anexos.map((a) => a.id);
    setMsgs((x) => [...x, { id: "tmp-" + Date.now(), papel: "user", texto: m, ts: new Date().toISOString(), anexos }]);
    setTexto(""); setAnexos([]);
    ctl.current = new AbortController();
    let acumulado = "";
    await enviarMensagem({ agente: agenteId, conversaId: conversaId ?? undefined, mensagem: m, anexos: idsAnexos }, {
      onMeta: (meta) => setConversaId(meta.conversaId),
      onDelta: (t) => { acumulado += t; setFluxo(acumulado); setStatus(""); },
      onStatus: setStatus,
      onDone: (d) => { setMsgs((x) => [...x, d.mensagem]); setFluxo(""); setUso(d.uso); },
      onErro: (e) => { setErro(e); setUso((u) => u); },
    }, ctl.current.signal);
    // se foi interrompida, guarda o que já chegou como mensagem local
    if (ctl.current.signal.aborted && acumulado) {
      setMsgs((x) => [...x, { id: "parcial-" + Date.now(), papel: "assistant", texto: acumulado + "\n\n(interrompida)", ts: new Date().toISOString() }]);
    }
    setFluxo(""); setStatus(""); setOcupado(false); ctl.current = null;
    chatApi.conversas(agenteId).then(setConversas).catch(() => {});
    chatApi.uso().then(setUso).catch(() => {});
  }, [ocupado, anexos, agenteId, conversaId]);

  const parar = () => ctl.current?.abort();

  const nova = () => { setConversaId(null); setMsgs([]); setFluxo(""); setErro(""); setAnexos([]); setHistoricoAberto(false); };

  const apagar = async (id: string) => {
    if (!window.confirm("Apagar esta conversa? Não dá para desfazer.")) return;
    try { await chatApi.apagar(id); setConversas((c) => c.filter((x) => x.id !== id)); if (id === conversaId) nova(); } catch (e) { setErro((e as Error).message); }
  };

  // ações: só o clique chama o servidor; o servidor executa os parâmetros guardados
  const decidir = async (m: Mensagem, indice: number, cancelar: boolean) => {
    if (!conversaId) return;
    const marcar = (patch: Partial<Acao>) => setMsgs((x) => x.map((y) => y.id === m.id ? { ...y, acoes: y.acoes?.map((a, i) => i === indice ? { ...a, ...patch } : a) } : y));
    marcar({ estado: cancelar ? "cancelada" : "executando" });
    try {
      const r = await chatApi.acao(conversaId, m.id, indice, cancelar);
      marcar({ estado: r.estado, resultado: r.resultado });
    } catch (e) { marcar({ estado: "erro", resultado: { ok: false, texto: (e as Error).message } }); }
  };

  const anexar = async (arqs: FileList | null) => {
    if (!arqs) return;
    for (const f of Array.from(arqs).slice(0, 3 - anexos.length)) {
      if (f.size > 10 * 1024 * 1024) { setErro(`"${f.name}" passa de 10 MB.`); continue; }
      try { const [a] = await chatApi.anexo(f); setAnexos((x) => [...x, { id: a.id, nome: a.nome }]); } catch (e) { setErro((e as Error).message); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const alternarGravacao = async () => {
    if (gravando) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mime = tipos.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const partes: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); setGravando(false); setTranscrevendo(true);
        try { const t = await chatApi.audio(new Blob(partes, { type: r.mimeType || "audio/webm" })); setTexto((x) => (x ? x + " " : "") + t); }
        catch (e) { setErro((e as Error).message); } finally { setTranscrevendo(false); }
      };
      rec.current = r; r.start(); setGravando(true);
    } catch { setErro("Não consegui usar o microfone. Confira a permissão do navegador."); }
  };

  const limiteBatido = !!uso && (uso.hora.usadas >= uso.hora.limite || uso.dia.usadas >= uso.dia.limite);

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* ===== LISTA DE PESSOAS ===== */}
      <aside className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col min-h-0 md:max-h-none">
        <button className="md:hidden flex items-center justify-between px-4 py-2 text-sm cursor-pointer" onClick={() => setListaAberta(!listaAberta)} aria-expanded={listaAberta}>
          <span>{agente ? `${agente.emoji} ${agente.nome}` : "Escolher"}</span><span>{listaAberta ? "▲" : "▼ trocar"}</span>
        </button>
        <ul className={`${listaAberta ? "block" : "hidden"} md:block overflow-y-auto max-h-[50vh] md:max-h-none p-2 space-y-1`} aria-label="Pessoas da equipe">
          {agentes.map((a) => (
            <li key={a.id}>
              <button onClick={() => { setAgenteId(a.id); setListaAberta(false); }} aria-current={a.id === agenteId ? "true" : undefined}
                className={`w-full text-left flex gap-3 items-start p-2 rounded-xl cursor-pointer transition-colors ${a.id === agenteId ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)]"}`}>
                <span className="text-2xl leading-none w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0" aria-hidden>{a.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">{a.nome} <span className="font-normal text-[10px] text-[var(--text-muted)]">· {a.modelo}</span></span>
                  <span className="block text-xs text-[var(--text-secondary)]">{a.cargo}</span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">Chame quando: {minuscula(a.quando)}</span>
                </span>
              </button>
            </li>
          ))}
          {!agentes.length && !erro && <li className="p-3 text-sm text-[var(--text-muted)]">Carregando equipe…</li>}
        </ul>
      </aside>

      {/* ===== CONVERSA ===== */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-3 flex-wrap bg-[var(--bg-secondary)]">
          <span className="text-2xl" aria-hidden>{agente?.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">{agente?.nome ?? "Chat"}</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate">{agente?.cargo}</p>
          </div>
          {uso && (
            <span className={`text-xs px-2 py-1 rounded-lg border ${uso.aviso ? "border-[var(--warning)] bg-[var(--warning)]/15" : "border-[var(--border)]"} text-[var(--text-secondary)]`}
              title="Cada mensagem gasta uma parte da assinatura do Claude">
              Hora {uso.hora.usadas}/{uso.hora.limite} · Hoje {uso.dia.usadas}/{uso.dia.limite}
            </span>
          )}
          <div className="relative">
            <button onClick={() => setHistoricoAberto(!historicoAberto)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">Conversas ({conversas.length})</button>
            {historicoAberto && (
              <div className="absolute right-0 top-full mt-1 z-20 w-72 max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-1">
                <button onClick={nova} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer font-medium text-[var(--accent)]">+ Nova conversa</button>
                {conversas.map((c) => (
                  <div key={c.id} className={`flex items-center gap-1 rounded-lg ${c.id === conversaId ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)]"}`}>
                    <button onClick={() => { abrirConversa(c.id); setHistoricoAberto(false); }} className="flex-1 min-w-0 text-left px-3 py-2 cursor-pointer">
                      <span className="block text-sm truncate">{c.titulo}</span><span className="block text-[11px] text-[var(--text-muted)]">{hora(c.atualizada)} · {c.mensagens} msgs</span>
                    </button>
                    <button onClick={() => apagar(c.id)} className="px-2 text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer" aria-label={`Apagar conversa ${c.titulo}`}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {uso?.aviso && <div role="status" className="px-4 py-2 text-sm bg-[var(--warning)]/20 text-[var(--text-primary)] border-b border-[var(--warning)]">⚠️ {uso.aviso}</div>}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
          {!msgs.length && !ocupado && agente && (
            <div className="max-w-xl mx-auto text-center text-[var(--text-secondary)] mt-10">
              <p className="text-5xl mb-2" aria-hidden>{agente.emoji}</p>
              <p className="font-semibold text-[var(--text-primary)]">Converse com {agente.nome}</p>
              <p className="text-sm mt-1">Chame quando: {minuscula(agente.quando)}.</p>
              <p className="text-xs mt-3 text-[var(--text-muted)]">Aqui ele só conversa e lê. Se algo precisar mudar alguma coisa (lembrete, tarefa, mapa, imagem), aparece um botão Confirmar antes.</p>
            </div>
          )}
          {msgs.map((m) => (
            <Balao key={m.id} m={m} agente={agente} ocupado={ocupado} onEscolha={enviar} onAcao={(i, c) => decidir(m, i, c)} />
          ))}
          {(ocupado || fluxo) && (
            <div className="flex gap-2 items-start">
              <span className="text-xl mt-1" aria-hidden>{agente?.emoji}</span>
              <div className="max-w-[min(48rem,100%)] rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2.5">
                {fluxo ? <Resposta texto={fluxo} andamento onEscolha={enviar} desativado /> : <p className="text-sm text-[var(--text-muted)] animate-pulse">{status || "pensando…"}</p>}
                {fluxo && status && <p className="text-xs text-[var(--text-muted)] mt-1 animate-pulse">{status}</p>}
              </div>
            </div>
          )}
          {erro && <p role="alert" className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">{erro}</p>}
          <div ref={fim} />
        </div>

        {/* ===== CAIXA DE ENVIO ===== */}
        <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {anexos.map((a) => (
                <span key={a.id} className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] flex items-center gap-1">📎 {a.nome}
                  <button onClick={() => setAnexos((x) => x.filter((y) => y.id !== a.id))} aria-label={`Remover ${a.nome}`} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--danger)]">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json" onChange={(e) => anexar(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={anexos.length >= 3} title="Anexar PDF, imagem, texto ou planilha CSV (até 10 MB)" aria-label="Anexar arquivo"
              className="h-10 w-10 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-tertiary)] disabled:opacity-40 cursor-pointer">📎</button>
            <button onClick={alternarGravacao} disabled={transcrevendo} title={gravando ? "Parar e transcrever" : "Gravar áudio"} aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
              className={`h-10 w-10 rounded-xl border cursor-pointer ${gravando ? "bg-[var(--danger)] text-white border-[var(--danger)] animate-pulse" : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]"} disabled:opacity-40`}>{gravando ? "⏹" : "🎙"}</button>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={8000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
              placeholder={transcrevendo ? "Transcrevendo o áudio…" : gravando ? "Gravando… clique no quadrado para parar" : limiteBatido ? "Limite de mensagens atingido" : `Mensagem para ${agente?.nome ?? ""} (Enter envia, Shift+Enter quebra a linha)`}
              disabled={limiteBatido}
              className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" aria-label="Mensagem" />
            {ocupado
              ? <button onClick={parar} className="h-10 px-4 rounded-xl bg-[var(--danger)] text-white text-sm font-medium cursor-pointer">Parar</button>
              : <button onClick={() => enviar(texto)} disabled={!texto.trim() || limiteBatido} className="h-10 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium disabled:opacity-40 cursor-pointer">Enviar</button>}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Uma conversa por vez · 20 mensagens por hora e 100 por dia · o áudio vira texto na caixa para você conferir antes de enviar.</p>
        </footer>
      </section>
    </div>
  );
}

function Resposta({ texto, andamento, onEscolha, desativado }: { texto: string; andamento?: boolean; onEscolha: (m: string) => void; desativado: boolean }) {
  const pedacos = useMemo(() => dividirResposta(texto, andamento), [texto, andamento]);
  return (
    <>
      {pedacos.map((p, i) =>
        p.k === "texto" ? <TextoSeguro key={i} texto={p.v} />
        : p.k === "visual" ? <Visuais key={i} v={p.v} onEscolha={onEscolha} desativado={desativado} />
        : <p key={i} className="text-xs text-[var(--text-muted)] animate-pulse my-2">montando o visual…</p>)}
    </>
  );
}

function Balao({ m, agente, ocupado, onEscolha, onAcao }: { m: Mensagem; agente?: Agente; ocupado: boolean; onEscolha: (t: string) => void; onAcao: (i: number, cancelar: boolean) => void }) {
  if (m.papel === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(40rem,90%)] rounded-2xl rounded-tr-sm bg-[var(--accent)] text-white px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>
          {m.anexos?.map((a) => <p key={a.id} className="text-xs opacity-80 mt-1">📎 {a.nome}</p>)}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-start">
      <span className="text-xl mt-1" aria-hidden>{agente?.emoji}</span>
      <div className="max-w-[min(48rem,100%)] min-w-0 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2.5">
        <Resposta texto={m.texto} onEscolha={onEscolha} desativado={ocupado} />
        {m.acoes?.map((a, i) => <CartaoAcao key={i} a={a} ocupado={ocupado} onDecidir={(c) => onAcao(i, c)} />)}
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{hora(m.ts)}</p>
      </div>
    </div>
  );
}

function CartaoAcao({ a, ocupado, onDecidir }: { a: Acao; ocupado: boolean; onDecidir: (cancelar: boolean) => void }) {
  return (
    <div className="my-2 rounded-xl border border-[var(--af-gold)] bg-[var(--af-gold)]/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Ação proposta</p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5">{a.resumo}</p>
      {a.estado === "pendente" && (
        <div className="flex gap-2 mt-2">
          <button disabled={ocupado} onClick={() => onDecidir(false)} className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm disabled:opacity-40 cursor-pointer">Confirmar</button>
          <button disabled={ocupado} onClick={() => onDecidir(true)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-40 cursor-pointer">Cancelar</button>
        </div>
      )}
      {a.estado === "executando" && <p className="text-sm mt-2 animate-pulse">Executando… (mapa e imagem podem levar até 2 minutos)</p>}
      {a.estado === "cancelada" && <p className="text-sm mt-2 text-[var(--text-muted)]">Cancelada.</p>}
      {(a.estado === "feita" || a.estado === "erro") && a.resultado && (
        <div className="mt-2">
          <p className={`text-sm ${a.resultado.ok ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>{a.resultado.ok ? "✓ " : "✗ "}{a.resultado.texto}</p>
          {a.resultado.arquivos?.map((f) => <ArquivoGerado key={f.arquivo} f={f} />)}
        </div>
      )}
    </div>
  );
}

function ArquivoGerado({ f }: { f: { nome: string; tipo: string; arquivo: string } }) {
  const [url, setUrl] = useState("");
  useEffect(() => { chatApi.urlArquivo(f.arquivo).then(setUrl).catch(() => {}); }, [f.arquivo]);
  if (!url) return null;
  return f.tipo === "imagem"
    // eslint-disable-next-line @next/next/no-img-element
    ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={f.nome} className="mt-2 max-h-80 rounded-lg border border-[var(--border)]" /></a>
    : <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm underline text-[var(--accent)]">Abrir {f.nome}</a>;
}
