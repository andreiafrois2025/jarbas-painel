"use client";

// 💡 Melhoria (23/10/2026, pedido dela): em qualquer página, um toque tira o print da tela,
// anota a página e abre uma caixinha para falar ou escrever o que melhorar. Duas saídas:
//   - Fazer agora: vai para o Jarbas sempre ligado, com o print anexado (entra na fila se ele
//     estiver ocupado);
//   - Guardar para depois: vira tarefa no Notion (Tarefas, área Jarbas) e o print fica na VPS.
// O print é feito no próprio navegador (html-to-image). Nada gasta token até ela mandar fazer.
import { useState } from "react";
import { usePathname } from "next/navigation";
import { toJpeg } from "html-to-image";
import { useDitado, temDitado } from "@/lib/ditado";
import { VIVO_DISPONIVEL, vivoApi } from "@/lib/jarbasVivo";
import { squadFetch } from "@/lib/squadFetch";

export default function MelhoriaBotao() {
  const pagina = usePathname() || "/";
  const [aberto, setAberto] = useState(false);
  const [print, setPrint] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ditado = useDitado(setTexto, setMsg);

  const abrir = async () => {
    setMsg(""); setTexto(""); setPrint("");
    setTitulo(document.title.replace(/\s*[·|-]\s*Jarbas.*$/i, "") || pagina);
    try {
      // print da tela como ela está agora (antes de a caixinha aparecer)
      const img = await toJpeg(document.body, {
        quality: 0.7, pixelRatio: Math.min(1, 1600 / window.innerWidth),
        width: window.innerWidth, height: window.innerHeight,
        style: { transform: `translateY(-${window.scrollY}px)` },
        filter: (n) => !(n instanceof HTMLElement && n.dataset.semPrint === "1"),
      });
      setPrint(img);
    } catch { /* sem print: segue só com o texto */ }
    setAberto(true);
  };

  const fechar = () => { if (ditado.ativo) ditado.parar(); setAberto(false); };

  const fazerAgora = async () => {
    const t = texto.trim(); if (!t) { setMsg("Fale ou escreva o que melhorar."); return; }
    if (ditado.ativo) ditado.parar();
    setEnviando(true); setMsg("");
    try {
      let anexo = "";
      if (print) {
        const blob = await (await fetch(print)).blob();
        anexo = await vivoApi.anexo(new File([blob], `melhoria-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }
      const corpo = `[💡 Melhoria pedida na página "${titulo}" (${pagina})]\n${t}${anexo ? `\n[Anexo: ${anexo}]` : ""}`;
      const r = await vivoApi.enviar(corpo);
      if (!r.ok) throw new Error(r.erro || "não consegui mandar");
      setMsg("✅ Mandei para o Jarbas. Acompanhe na Conversa.");
      setTexto(""); setTimeout(() => setAberto(false), 1400);
    } catch (e) {
      setMsg(`Não consegui mandar para o Jarbas (${(e as Error).message}). Tente "Guardar para depois".`);
    } finally { setEnviando(false); }
  };

  const guardar = async () => {
    const t = texto.trim(); if (!t) { setMsg("Fale ou escreva o que melhorar."); return; }
    if (ditado.ativo) ditado.parar();
    setEnviando(true); setMsg("");
    try {
      const r = await squadFetch("/api/melhorias", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: t, pagina, titulo, imagem: print }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "falhou");
      setMsg(j.aviso || "✅ Guardado na sua lista de Tarefas (área Jarbas).");
      setTexto(""); if (!j.aviso) setTimeout(() => setAberto(false), 1400);
    } catch (e) {
      setMsg(`Não consegui guardar (${(e as Error).message}).`);
    } finally { setEnviando(false); }
  };

  return (
    <>
      <button onClick={abrir} data-sem-print="1" title="Viu algo para melhorar nesta página? Tira o print e anota"
        className="order-3 md:order-5 h-8 px-2.5 rounded-full text-[13px] font-bold cursor-pointer bg-[var(--bg-tertiary)] hover:brightness-95 whitespace-nowrap">
        💡<span className="max-md:hidden"> Melhoria</span>
      </button>
      {aberto && (
        <div data-sem-print="1" className="fixed inset-0 z-[70] bg-black/40 grid place-items-center p-3" onClick={fechar}>
          <div role="dialog" aria-label="Pedir melhoria" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold m-0">💡 Melhoria nesta página</h2>
              <button onClick={fechar} aria-label="Fechar" className="text-lg px-2 cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] m-0">Página: <b>{titulo}</b> <span className="text-[var(--text-muted)]">({pagina})</span></p>
            {print
              ? <img src={print} alt="Print da página" className="w-full max-h-48 object-contain rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]" />
              : <p className="text-xs text-[var(--text-muted)] m-0">Não consegui tirar o print desta página; vai só o texto.</p>}
            <div className="flex items-end gap-2">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} autoFocus
                placeholder={ditado.ativo ? "Ouvindo… fale à vontade" : "O que melhorar aqui? (fale no 🎙️ ou escreva)"}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 text-sm focus:outline-none focus:border-[var(--ac)]" />
              {temDitado() && (
                <button onClick={() => (ditado.ativo ? ditado.parar() : ditado.iniciar(texto))} aria-label={ditado.ativo ? "Parar de ouvir" : "Falar"}
                  className={`h-11 w-11 shrink-0 rounded-xl text-xl cursor-pointer ${ditado.ativo ? "bg-[var(--danger)] text-white animate-pulse" : "bg-[var(--ac)] text-[var(--on-ac)]"}`}>
                  {ditado.ativo ? "⏹" : "🎙️"}
                </button>
              )}
            </div>
            {msg && <p role="status" className="text-sm m-0">{msg}</p>}
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={guardar} disabled={enviando}
                className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold cursor-pointer disabled:opacity-50">📌 Guardar para depois</button>
              {VIVO_DISPONIVEL && (
                <button onClick={fazerAgora} disabled={enviando}
                  className="px-3 py-2 rounded-xl bg-[var(--ac)] text-[var(--on-ac)] text-sm font-bold cursor-pointer disabled:opacity-50">⚡ Fazer agora</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
