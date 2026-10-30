// Ditado ao vivo (21/10/2026): o texto aparece na caixa enquanto ela fala, como no
// app do Claude. Quem transcreve é o próprio navegador (Chrome, Edge, Safari), de graça;
// a voz passa pelo Google/Microsoft/Apple. Para assunto sigiloso existe o 🔒 (grava e
// transcreve na VPS). Sem suporte no navegador, quem chama cai na gravação.
import { useCallback, useRef, useState } from "react";

type Reconhecedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
  start: () => void; stop: () => void;
};

export function temDitado(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function useDitado(aoMudar: (texto: string) => void, aoErro: (msg: string) => void) {
  const [ativo, setAtivo] = useState(false);
  const rec = useRef<Reconhecedor | null>(null);
  const ligado = useRef(false);

  const parar = useCallback(() => {
    ligado.current = false; setAtivo(false);
    try { rec.current?.stop(); } catch { /* já parou */ }
    rec.current = null;
  }, []);

  const iniciar = useCallback((textoAtual: string) => {
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
    const Classe = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Classe) return false;
    const r = new Classe();
    // 27/10/2026: no Chrome do Android o modo contínuo devolve a frase acumulada várias vezes
    // (o texto saía repetido). No Android grava uma fala por vez; o onend religa.
    const android = /Android/i.test(navigator.userAgent);
    r.lang = "pt-BR"; r.continuous = !android; r.interimResults = true;
    let base = textoAtual ? textoAtual.trimEnd() + " " : "";
    let finais = "";
    let ultimo = textoAtual;
    r.onresult = (e) => {
      // 23/10: depois de "parar" (ex.: ao enviar) o navegador ainda entrega o último pedaço;
      // ignorar, senão o texto já enviado volta para a caixa
      if (rec.current !== r) return;
      // remonta a fala inteira a cada evento, em vez de ir somando (somar duplicava)
      let provisorio = ""; finais = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais += res[0].transcript.trim() + " "; else provisorio += res[0].transcript;
      }
      ultimo = base + finais + provisorio;
      aoMudar(ultimo);
    };
    // o navegador encerra sozinho depois de uma pausa; enquanto ela não toca em parar, religa
    r.onend = () => {
      if (!ligado.current) return;
      base = ultimo ? ultimo.trimEnd() + " " : ""; finais = "";
      try { r.start(); } catch { parar(); }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        parar(); aoErro("O navegador não deixou usar o microfone. Libere o microfone para o painel, ou marque 🔒 para gravar.");
      }
    };
    rec.current = r; ligado.current = true;
    try { r.start(); } catch { parar(); return false; }
    setAtivo(true);
    return true;
  }, [aoMudar, aoErro, parar]);

  return { ativo, iniciar, parar };
}
