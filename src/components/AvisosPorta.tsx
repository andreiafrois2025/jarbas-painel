"use client";

// Avisos da porta em qualquer tela do painel (21/10/2026): aparelho novo pedindo para entrar
// e pedido de licença do Jarbas sempre ligado. Só o aparelho principal (o celular) vê os botões;
// a porta confere isso de novo no servidor. Na conversa com o Jarbas a licença já aparece no chat.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { vivoApi, type EstadoVivo } from "@/lib/jarbasVivo";

const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function AvisosPorta() {
  const [e, setE] = useState<EstadoVivo | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const rota = usePathname();

  useEffect(() => {
    let vivo = true;
    const ler = () => vivoApi.estado().then((x) => { if (vivo) setE(x); }).catch(() => {});
    ler();
    const t = setInterval(ler, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const pedidos = e?.pedidos ?? [];
  const licencas = rota?.startsWith("/conversa") ? [] : e?.licencas ?? [];
  if (!pedidos.length && !licencas.length && !msg) return null;

  const responderAparelho = async (id: string, permitir: boolean) => {
    const r = await vivoApi.responderAparelho(id, permitir, nomes[id]).catch(() => ({ ok: false, erro: "Não consegui falar com a porta." }));
    setMsg(r.ok ? (permitir ? "Permitido. O aparelho entra em alguns segundos." : "Bloqueado. Se não foi você, troque a senha em Ajustes.") : r.erro || "Não deu certo.");
    setE((x) => x && { ...x, pedidos: (x.pedidos ?? []).filter((p) => p.id !== id) });
    setTimeout(() => setMsg(""), 6000);
  };
  const responderLicenca = async (id: string, permitir: boolean) => {
    const r = await vivoApi.permissao(id, permitir).catch(() => ({ ok: false, erro: "Não consegui falar com o Jarbas." }));
    if (!r.ok) setMsg(r.erro || "Esse pedido já não vale.");
    setE((x) => x && { ...x, licencas: (x.licencas ?? []).filter((l) => l.id !== id) });
  };
  const botao = "px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer";

  return (
    <div className="fixed z-50 right-4 bottom-4 left-4 md:left-auto md:w-[380px] space-y-2" role="alert">
      {pedidos.map((p) => (
        <div key={p.id} className="rounded-xl border-2 border-[var(--ac)] bg-[var(--bg-secondary)] shadow-lg p-3 space-y-2">
          <p className="m-0 font-bold text-[var(--text-primary)]">🔔 Aparelho novo quer entrar</p>
          <p className="m-0 text-sm text-[var(--text-secondary)]">{p.aparelho}, {hora(p.criado)} (internet {p.ip}). Vence às {hora(p.expira)}.</p>
          <input value={nomes[p.id] ?? ""} onChange={(ev) => setNomes((n) => ({ ...n, [p.id]: ev.target.value }))} placeholder="Nome do aparelho (ex.: Notebook gamer)"
            className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5" />
          <div className="flex gap-2">
            <button onClick={() => responderAparelho(p.id, true)} className={`${botao} bg-[var(--ac)] text-[var(--on-ac)]`}>Permitir</button>
            <button onClick={() => responderAparelho(p.id, false)} className={`${botao} bg-[var(--danger)] text-white`}>Bloquear</button>
          </div>
        </div>
      ))}
      {licencas.map((l) => (
        <div key={l.id} className="rounded-xl border-2 border-[var(--af-gold)] bg-[var(--bg-secondary)] shadow-lg p-3 space-y-2">
          <p className="m-0 font-bold text-[var(--text-primary)]">🟡 O Jarbas pede licença</p>
          <p className="m-0 text-sm text-[var(--text-secondary)]">{l.resumo || l.ferramenta}</p>
          {e?.principal || !e?.temPrincipal ? (
            <div className="flex gap-2">
              <button onClick={() => responderLicenca(l.id, true)} className={`${botao} bg-[var(--ac)] text-[var(--on-ac)]`}>Permitir</button>
              <button onClick={() => responderLicenca(l.id, false)} className={`${botao} border border-[var(--border)]`}>Negar</button>
            </div>
          ) : <p className="m-0 text-sm text-[var(--text-secondary)]">O ok é no seu celular ⭐.</p>}
        </div>
      ))}
      {msg && <p className="m-0 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2 text-sm shadow">{msg}</p>}
    </div>
  );
}
