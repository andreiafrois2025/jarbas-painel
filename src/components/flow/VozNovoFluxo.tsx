"use client";

import { useEffect, useRef, useState } from "react";
import { rascunhosApi, type Rascunho } from "@/lib/flow/rascunhos";

// =============================================
// "Novo fluxo por voz": ela grava, o áudio vira texto (ela confere e corrige),
// e o Jarbas desenha um RASCUNHO. Nada executa.
// Gravação = a mesma do chat do painel (MediaRecorder -> /api/chat/audio).
// =============================================

interface Props {
  /** se vier, o desenho DESSE rascunho é refeito; senão nasce um novo */
  refazerId?: string;
  onFechar: () => void;
  onPronto: (r: Rascunho) => void;
}

export default function VozNovoFluxo({ refazerId, onFechar, onPronto }: Props) {
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [desenhando, setDesenhando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !desenhando) onFechar(); };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      if (rec.current && rec.current.state !== "inactive") { try { rec.current.stream.getTracks().forEach((t) => t.stop()); rec.current.stop(); } catch { /* já parou */ } }
    };
  }, [desenhando, onFechar]);

  const alternar = async () => {
    setErro(null);
    if (gravando) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mime = tipos.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const partes: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        setTranscrevendo(true);
        try {
          const t = await rascunhosApi.audio(new Blob(partes, { type: r.mimeType || "audio/webm" }));
          setTexto((x) => (x ? x + " " : "") + t);
        } catch (e) { setErro((e as Error).message); }
        finally { setTranscrevendo(false); }
      };
      rec.current = r;
      r.start();
      setGravando(true);
    } catch {
      setErro("Não consegui usar o microfone. Confira a permissão do navegador (ou escreva o pedido aqui embaixo).");
    }
  };

  const gerar = async () => {
    setErro(null);
    setDesenhando(true);
    try {
      onPronto(await rascunhosApi.gerar(texto.trim(), refazerId));
    } catch (e) {
      setErro((e as Error).message);
      setDesenhando(false);
    }
  };

  const ocupado = gravando || transcrevendo || desenhando;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !desenhando && onFechar()}>
      <div role="dialog" aria-modal="true" aria-label="Novo fluxo por voz" className="w-full sm:max-w-xl bg-[var(--bg-secondary)] rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-lg font-semibold">{refazerId ? "🎙 Refazer o desenho por voz" : "🎙 Novo fluxo por voz"}</h2>
          <button onClick={onFechar} disabled={desenhando} aria-label="Fechar" className="text-xl leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-40">×</button>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Conte como se estivesse explicando a uma pessoa: o que faz isso começar, o que acontece depois e onde termina.
          Ex.: <em>“Quando chegar um PDF no Drive, resume e me manda no Telegram.”</em>
        </p>
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          É só um <strong>rascunho</strong>: nada roda, nada é enviado. Você mexe no desenho e só depois decide aprovar.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={alternar}
            disabled={transcrevendo || desenhando}
            aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
            className={`h-14 w-14 shrink-0 text-2xl leading-none rounded-full border cursor-pointer disabled:opacity-40 ${gravando ? "bg-[var(--danger)] text-white border-[var(--danger)] animate-pulse" : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]"}`}
          >
            {gravando ? "⏹" : "🎙"}
          </button>
          <p className="text-sm text-[var(--text-secondary)]">
            {gravando ? "Gravando… toque no quadrado para parar." : transcrevendo ? "Transcrevendo o áudio…" : desenhando ? "Desenhando o rascunho… leva até 1 minuto." : "Toque no microfone para falar. O texto aparece abaixo para você conferir."}
          </p>
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          maxLength={4000}
          disabled={desenhando}
          placeholder="Ou escreva aqui o fluxo que você quer…"
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          aria-label="O que o fluxo deve fazer"
        />
        {erro && <p className="text-sm" style={{ color: "var(--danger)" }}>{erro}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onFechar} disabled={desenhando} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer disabled:opacity-40">Cancelar</button>
          <button
            onClick={gerar}
            disabled={ocupado || texto.trim().length < 8}
            className="text-sm px-4 py-2 rounded-lg text-white cursor-pointer disabled:opacity-40"
            style={{ background: "var(--accent, #2D6B6B)" }}
          >
            {desenhando ? "desenhando…" : refazerId ? "Refazer o desenho" : "Desenhar o rascunho"}
          </button>
        </div>
      </div>
    </div>
  );
}
