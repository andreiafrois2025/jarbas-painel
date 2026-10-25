"use client";

// Página de aprovação de plano (25/10/2026, pedido dela): em vez de um documento para ler e
// comentar, ela lê o plano, toca nos botões das opções, escreve observação se quiser e manda tudo
// para o Jarbas com um botão. O plano é um JSON em /root/planos/<id>.json na VPS (servido pela squad-api, com login); o endereço é
// /aprovar?plano=<id>. As escolhas ficam guardadas no aparelho até ela enviar.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VIVO_DISPONIVEL, vivoApi } from "@/lib/jarbasVivo";
import { squadFetch } from "@/lib/squadFetch";

interface Opcao { id: string; texto: string; recomendado?: boolean }
interface Decisao { id: string; pergunta: string; explicacao?: string; opcoes: Opcao[] }
interface Secao { titulo: string; texto: string }
interface Plano { titulo: string; data?: string; resumo?: string; secoes?: Secao[]; decisoes: Decisao[] }

// negrito, listas "- " e quebras de linha; sem HTML de fora
function Texto({ t }: { t: string }) {
  const partes = (linha: string) => linha.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>);
  const linhas = t.split("\n");
  const out: React.ReactNode[] = [];
  let lista: string[] = [];
  const fecha = () => { if (lista.length) { out.push(<ul key={out.length} className="list-disc pl-5 my-1 space-y-0.5">{lista.map((l, i) => <li key={i}>{partes(l)}</li>)}</ul>); lista = []; } };
  for (const l of linhas) {
    if (/^\s*[-•]\s+/.test(l)) { lista.push(l.replace(/^\s*[-•]\s+/, "")); continue; }
    fecha();
    if (l.trim()) out.push(<p key={out.length} className="my-1">{partes(l)}</p>);
  }
  fecha();
  return <>{out}</>;
}

export default function AprovarPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [plano, setPlano] = useState<Plano | null>(null);
  const [erro, setErro] = useState("");
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [obsGeral, setObsGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plano") || "";
    setId(p);
    if (!/^[\w-]+$/.test(p)) { setErro("Plano não encontrado."); return; }
    squadFetch(`/api/planos/${p}`).then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlano).catch(() => setErro("Plano não encontrado."));
    try {
      const g = JSON.parse(localStorage.getItem(`plano-${p}`) || "{}");
      if (g.escolha) setEscolha(g.escolha); if (g.obs) setObs(g.obs); if (g.obsGeral) setObsGeral(g.obsGeral);
    } catch { /* sem rascunho */ }
  }, []);
  useEffect(() => {
    if (id) try { localStorage.setItem(`plano-${id}`, JSON.stringify({ escolha, obs, obsGeral })); } catch { /* cheio */ }
  }, [id, escolha, obs, obsGeral]);

  const faltam = useMemo(() => (plano?.decisoes || []).filter((d) => !escolha[d.id]).length, [plano, escolha]);
  const usarRecomendadas = () => setEscolha((e) => {
    const n = { ...e };
    for (const d of plano?.decisoes || []) { const r = d.opcoes.find((o) => o.recomendado); if (r && !n[d.id]) n[d.id] = r.id; }
    return n;
  });

  const enviar = async () => {
    if (!plano) return;
    const linhas = plano.decisoes.map((d) => {
      const o = d.opcoes.find((x) => x.id === escolha[d.id]);
      return `${d.id}) ${d.pergunta}: ${o ? `${o.id} (${o.texto})` : "sem resposta"}${obs[d.id]?.trim() ? `. Obs: ${obs[d.id].trim()}` : ""}`;
    });
    const texto = `[Respostas do plano "${plano.titulo}" (/aprovar?plano=${id})]\n${linhas.join("\n")}${obsGeral.trim() ? `\nObservação geral: ${obsGeral.trim()}` : ""}`;
    setEnviando(true); setMsg("");
    try {
      if (!VIVO_DISPONIVEL) throw new Error("fora");
      const r = await vivoApi.enviar(texto);
      if (!r.ok) throw new Error(r.erro || "falhou");
      try { localStorage.removeItem(`plano-${id}`); } catch { /* nada */ }
      router.push("/conversa");
    } catch {
      try { await navigator.clipboard.writeText(texto); setMsg("Não consegui mandar direto. Copiei as respostas: cole no chat do Jarbas."); }
      catch { setMsg("Não consegui mandar. Tente de novo em instantes."); }
    } finally { setEnviando(false); }
  };

  if (erro) return <div className="p-6 text-sm">{erro}</div>;
  if (!plano) return <div className="p-6 text-sm text-[var(--text-secondary)]">Carregando o plano…</div>;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full px-4 md:px-8 py-5 space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl md:text-2xl font-extrabold m-0 text-[var(--text-primary)]">{plano.titulo}</h1>
          {plano.data && <p className="text-xs text-[var(--text-muted)] m-0">{plano.data}</p>}
          {plano.resumo && <div className="text-[15px] text-[var(--text-primary)]"><Texto t={plano.resumo} /></div>}
        </header>

        {!!plano.secoes?.length && (
          <section className="grid gap-3 md:grid-cols-2">
            {plano.secoes.map((s) => (
              <details key={s.titulo} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <summary className="cursor-pointer font-bold text-[15px] text-[var(--text-primary)]">{s.titulo}</summary>
                <div className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed"><Texto t={s.texto} /></div>
              </details>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold m-0 flex-1">Suas decisões</h2>
            <button onClick={usarRecomendadas} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--bg-tertiary)]">⭐ Marcar as recomendadas</button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {plano.decisoes.map((d) => (
              <div key={d.id} className={`rounded-2xl border p-4 space-y-2 ${escolha[d.id] ? "border-[var(--ac)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--bg-secondary)]"}`}>
                <p className="m-0 font-bold text-[15px]"><span className="text-[var(--ac)]">{d.id}.</span> {d.pergunta}</p>
                {d.explicacao && <div className="text-[13px] text-[var(--text-secondary)]"><Texto t={d.explicacao} /></div>}
                <div className="flex flex-col gap-1.5">
                  {d.opcoes.map((o) => {
                    const sel = escolha[d.id] === o.id;
                    return (
                      <button key={o.id} type="button" onClick={() => setEscolha((e) => ({ ...e, [d.id]: o.id }))} aria-pressed={sel}
                        className={`text-left rounded-xl border px-3 py-2 text-sm cursor-pointer ${sel ? "border-[var(--ac)] bg-[var(--ac)] text-[var(--on-ac)] font-bold" : "border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"}`}>
                        <b>{o.id}</b> · {o.texto}{o.recomendado ? " ⭐" : ""}
                      </button>
                    );
                  })}
                </div>
                <input value={obs[d.id] || ""} onChange={(e) => setObs((x) => ({ ...x, [d.id]: e.target.value }))} placeholder="Observação (opcional)"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-2 sticky bottom-0">
          <textarea value={obsGeral} onChange={(e) => setObsGeral(e.target.value)} rows={2} placeholder="Observação geral (opcional)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm resize-none" />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] flex-1">{faltam ? `Faltam ${faltam} decisão(ões). Pode mandar mesmo assim.` : "Tudo respondido. ✅"}</span>
            <button onClick={enviar} disabled={enviando} className="px-5 py-2.5 rounded-xl bg-[var(--ac)] text-[var(--on-ac)] font-extrabold cursor-pointer disabled:opacity-50">
              {enviando ? "Enviando…" : "📨 Enviar ao Jarbas"}
            </button>
          </div>
          {msg && <p className="text-sm m-0">{msg}</p>}
        </section>
      </div>
    </div>
  );
}
