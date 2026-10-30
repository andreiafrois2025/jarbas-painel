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
    // 27/10/2026: no Chrome do Android o modo contínuo devolve a frase acumulada várias vezes
    // (o texto saía repetido). 30/10: no Safari do iPhone o contínuo às vezes trava calado
    // (para de transcrever sem avisar). No celular grava uma fala por vez e religa sozinho.
    const celular = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let base = textoAtual ? textoAtual.trimEnd() + " " : "";
    let ultimo = textoAtual;
    let ultimoSinal = Date.now();

    // cada religada usa um reconhecedor NOVO: o iPhone às vezes não aceita religar o mesmo
    const ligar = (): boolean => {
      const r = new Classe();
      r.lang = "pt-BR"; r.continuous = !celular; r.interimResults = true;
      r.onresult = (e) => {
        // 23/10: depois de "parar" (ex.: ao enviar) o navegador ainda entrega o último pedaço;
        // ignorar, senão o texto já enviado volta para a caixa
        if (rec.current !== r) return;
        ultimoSinal = Date.now();
        // remonta a fala inteira a cada evento, em vez de ir somando (somar duplicava)
        let provisorio = "", finais = "";
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finais += res[0].transcript.trim() + " "; else provisorio += res[0].transcript;
        }
        ultimo = base + finais + provisorio;
        aoMudar(ultimo);
      };
      // o navegador encerra sozinho depois de uma pausa; enquanto ela não toca em parar, religa
      r.onend = () => {
        if (!ligado.current || rec.current !== r) return;
        religar();
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          parar(); aoErro("O navegador não deixou usar o microfone. Libere o microfone para o painel, ou marque 🔒 para gravar.");
        } else if (e.error === "audio-capture") {
          parar(); aoErro("O microfone está ocupado por outro app (ligação, gravador, vídeo). Feche e toque no 🎤 de novo.");
        }
        // no-speech, aborted, network: o onend religa
      };
      rec.current = r;
      ultimoSinal = Date.now();
      try { r.start(); return true; } catch { return false; }
    };
    const religar = () => {
      base = ultimo ? ultimo.trimEnd() + " " : "";
      const velho = rec.current;
      rec.current = null;
      try { velho?.stop(); } catch { /* já parou */ }
      if (!ligar()) parar();
    };
    // vigia: se ficou 7 s sem sinal nenhum (nem texto, nem religada), troca o reconhecedor.
    // É o caso do "travou e não transcreve nada"; o texto já ditado fica na caixa.
    const vigia = window.setInterval(() => {
      if (!ligado.current) { window.clearInterval(vigia); return; }
      if (Date.now() - ultimoSinal > 7000) religar();
    }, 1000);

    ligado.current = true;
    if (!ligar()) { window.clearInterval(vigia); parar(); return false; }
    setAtivo(true);
    return true;
  }, [aoMudar, aoErro, parar]);

  return { ativo, iniciar, parar };
}
