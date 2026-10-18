"use client";

import { useEffect, useMemo, useState } from "react";
import type { FlowDoc, FlowDocNode } from "@/lib/types";
import type { AutomacaoApiItem } from "@/lib/biblioteca";
import { interpretaCron, formataProxima } from "@/lib/cron";
import {
  NIVEIS, montaDesenho, montaResumo, termosDoTexto, caminhoDeArquivo, ehAposentada,
  descricaoLimpa, avaliaSaude, SELO_SAUDE, tempoDesde, primeiraFrase,
  type Nivel, type Peca, type Desenho,
} from "@/lib/radiografia";
import FlowDiagram, { type Selecao } from "./FlowDiagram";
import FlowCanvas from "./FlowCanvas";
import { toMermaid, toPrompt, copy, download } from "./FlowExport";
import { TYPE_LABEL, STROKE_BY_TYPE } from "./RoughNode";

// =============================================
// A radiografia de UM fluxo: três níveis + a aba de edição.
// Esquerda: o diagrama. Direita: o painel (resumo, ou o detalhe do que foi
// clicado). Largura total, sem coluna estreita no meio.
// =============================================

type Aba = Nivel | "editar";

interface Props {
  flow: FlowDoc;
  automacao: AutomacaoApiItem | null;
  relogioMudouEm: string | null;
  abaInicial: Aba;
  saveState: "idle" | "saving" | "saved";
  onVoltar: () => void;
  onDuplicate: () => void;
  onCanvasChange: (u: { nodes: FlowDoc["nodes"]; edges: FlowDoc["edges"] }) => void;
  avisar: (msg: string) => void;
}

export default function FlowRadiografia({
  flow, automacao, relogioMudouEm, abaInicial, saveState, onVoltar, onDuplicate, onCanvasChange, avisar,
}: Props) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [sel, setSel] = useState<Selecao>(null);
  const nivel: Nivel = aba === "editar" ? 2 : aba;

  const cron = automacao ? interpretaCron(automacao.agenda) : null;
  const aposentada = ehAposentada(flow);
  const desatualizado = !!(relogioMudouEm && flow.updated_at && new Date(relogioMudouEm) > new Date(flow.updated_at));
  const saude = automacao && cron ? avaliaSaude(automacao.ultima_execucao, cron.frequenciaMin) : null;

  const d1 = useMemo(() => montaDesenho(flow, 1), [flow]);
  const d2 = useMemo(() => montaDesenho(flow, 2), [flow]);
  const desenho: Desenho = nivel === 1 ? d1 : d2; // o nível 3 usa o desenho do 2 (mesmas peças)
  const resumo = useMemo(() => montaResumo(desenho, nivel), [desenho, nivel]);
  const inicioId = desenho.pecas.find((p) => p.type === "start")?.id;

  const trocaAba = (nova: Aba) => {
    // mantém a peça escolhida ao trocar de nível (leigo agrupa, então mapeia)
    if (sel?.tipo === "peca" && nova !== "editar") {
      const alvoNivel: Nivel = nova;
      if (alvoNivel === 1) {
        const lider = d1.mapa.get(sel.id);
        setSel(lider ? { tipo: "peca", id: lider } : null);
      } else if (nivel === 1) {
        const p = d1.pecas.find((x) => x.id === sel.id);
        setSel(p ? { tipo: "peca", id: p.membros[0].id } : null);
      }
    } else if (sel?.tipo === "seta") {
      setSel(null);
    }
    setAba(nova);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("nivel", nova === "editar" ? "editar" : String(nova));
      window.history.replaceState(window.history.state, "", u);
    } catch { /* sem URL, sem problema */ }
  };

  // atalhos: 1/2/3 trocam o nível, Esc fecha o detalhe
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (aba === "editar") return;
      if (e.key === "1" || e.key === "2" || e.key === "3") trocaAba(Number(e.key) as Nivel);
      else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, sel, d1]);

  const pecaSel = sel?.tipo === "peca" ? desenho.pecas.find((p) => p.id === sel.id) || null : null;
  const setaSel = sel?.tipo === "seta" ? desenho.setas.find((s) => s.id === sel.id) || null : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* ── Cabeçalho ── */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 md:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0">
        <button onClick={onVoltar} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap">
          ← Voltar
        </button>
        <h2 className="text-base font-semibold truncate min-w-0 flex-1 basis-48">{flow.title}</h2>
        {aposentada && <Selo cor="var(--danger)" titulo="A curadoria viu que esta automação saiu do relógio da VPS">⛔ não roda mais</Selo>}
        {saude && !aposentada && (
          <Selo cor={SELO_SAUDE[saude].cor} titulo="Último sinal de vida vs. a frequência esperada">
            {SELO_SAUDE[saude].bolinha} {SELO_SAUDE[saude].texto}
          </Selo>
        )}
        {desatualizado && !aposentada && (
          <Selo cor="var(--warning)" titulo="O relógio da VPS mudou depois da última vez que este desenho foi mexido. Não prova que está errado, só que pode ter ficado pra trás.">
            ✏️ desenho pode estar atrasado
          </Selo>
        )}
        {flow.is_seed && <Selo cor="var(--af-teal)" titulo="Veio dos seeds / do curador. Duplique pra editar sem o curador mexer.">seed</Selo>}
        {saveState === "saving" && <span className="text-[11px] text-[var(--text-muted)]">salvando…</span>}
        {saveState === "saved" && <span className="text-[11px] text-[var(--success)]">salvo ✓</span>}
      </div>

      {/* ── Abas dos níveis ── */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 md:px-4 flex flex-wrap items-center gap-1 shrink-0">
        {NIVEIS.map((n) => (
          <button
            key={n.n}
            onClick={() => trocaAba(n.n)}
            title={`${n.dica} (tecla ${n.n})`}
            className={`px-3 py-2 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors ${
              aba === n.n ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="text-[10px] opacity-60 mr-1">{n.n}</span>{n.rotulo}
          </button>
        ))}
        <button
          onClick={() => trocaAba("editar")}
          title="Arrastar, renomear, apagar e ligar etapas"
          className={`px-3 py-2 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors ${
            aba === "editar" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          ✏️ Editar desenho
        </button>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-1 py-1">
          <Botao onClick={async () => { await copy(toMermaid(flow)); avisar("Mermaid copiado, cola em qualquer IA."); }} titulo="Copia como Mermaid">📋 Mermaid</Botao>
          <Botao onClick={async () => { await copy(toPrompt(flow)); avisar("Descrição copiada, cola em qualquer IA."); }} titulo="Copia como prompt textual">📝 Prompt</Botao>
          <Botao onClick={() => download(`${flow.title}.json`, JSON.stringify(flow, null, 2), "application/json")} titulo="Baixa JSON">💾 JSON</Botao>
          <a
            href={`https://claude.ai/new?q=${encodeURIComponent(`Me explique este fluxo como se eu fosse leiga e depois em detalhes técnicos, e diga o que pode dar errado:\n\n${toPrompt(flow)}`.slice(0, 6000))}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abre o claude.ai com o fluxo já escrito (usa a sua assinatura, sem custo extra)"
            className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)] whitespace-nowrap"
          >
            ↗ Perguntar no claude.ai
          </a>
          {flow.is_seed && (
            <button onClick={onDuplicate} title="Duplica pra editar sem o curador mexer" className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer">
              ⎘ Duplicar
            </button>
          )}
        </div>
      </div>

      {descricaoLimpa(flow) && aba !== "editar" && (
        <div className="bg-[var(--bg-tertiary)] px-4 py-2 text-xs text-[var(--text-secondary)] shrink-0 border-b border-[var(--border)]">
          {descricaoLimpa(flow)}
        </div>
      )}

      {/* ── Faixa do relógio (vínculo com o crontab real) ── */}
      {automacao && cron && aba !== "editar" && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>⏰ <strong className="text-[var(--text-primary)]">{cron.descricao}</strong></span>
          {nivel >= 2 && <span>próxima: {formataProxima(cron.proxima)}</span>}
          <span>última: {tempoDesde(automacao.ultima_execucao)}{!automacao.log ? " (não deixa registro)" : automacao.log_compartilhado ? " (sinal indireto)" : ""}</span>
          <span>{automacao.usa_ia ? "🤖 usa IA" : "🐍 sem IA"}{automacao.custo_execucao ? ` · ${automacao.custo_execucao}` : ""}</span>
        </div>
      )}

      {/* ── Corpo ── */}
      {aba === "editar" ? (
        <div className="flex-1 min-h-[420px] relative">
          <FlowCanvas flow={flow} onChange={onCanvasChange} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          <div className="lg:flex-1 min-w-0 overflow-auto p-3 md:p-4 min-h-[320px]">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">
              {NIVEIS[nivel - 1].dica}. Clique numa peça ou numa seta. Teclas 1, 2 e 3 trocam o nível.
            </p>
            <FlowDiagram desenho={desenho} selecao={sel} onSelect={setSel} inicioId={inicioId} />
          </div>
          <aside className="lg:w-[360px] xl:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto p-4">
            {pecaSel ? (
              <PainelPeca
                key={pecaSel.id + nivel}
                peca={pecaSel}
                nivel={nivel}
                flow={flow}
                desenho={desenho}
                d1={d1}
                automacao={automacao}
                cronDescricao={cron?.descricao}
                onSelect={setSel}
                onIrParaLeigo={(id) => { setAba(1); setSel({ tipo: "peca", id }); }}
                avisar={avisar}
              />
            ) : setaSel ? (
              <PainelSeta key={setaSel.id} seta={setaSel} desenho={desenho} onSelect={setSel} />
            ) : (
              <PainelResumo resumo={resumo} nivel={nivel} automacao={automacao} onSelect={setSel} avisar={avisar} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Painéis ─────────────────────────────────────────────────────────────
function PainelResumo({ resumo, nivel, automacao, onSelect, avisar }: {
  resumo: ReturnType<typeof montaResumo>;
  nivel: Nivel;
  automacao: AutomacaoApiItem | null;
  onSelect: (s: Selecao) => void;
  avisar: (m: string) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">🧭 {nivel === 1 ? "A história, do começo ao fim" : "Resumo do processo"}</h3>
      <div className="space-y-2 mb-3 text-sm">
        <p><span className="text-[var(--text-muted)] text-xs">Começa quando</span><br />{resumo.inicio}</p>
        <p><span className="text-[var(--text-muted)] text-xs">Termina com</span><br />{resumo.fim}</p>
      </div>
      <ol className="space-y-1.5">
        {resumo.passos.map((p, i) => (
          <li key={p.id}>
            <button onClick={() => onSelect({ tipo: "peca", id: p.id })} className="w-full text-left flex gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer">
              <span className="shrink-0 w-5 h-5 rounded-full text-[11px] flex items-center justify-center text-white" style={{ background: "var(--accent)" }}>{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{p.t}</span>
                {p.d && <span className="block text-xs text-[var(--text-secondary)]">{p.d}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {nivel === 3 && <BlocoScript automacao={automacao} avisar={avisar} />}
    </div>
  );
}

function BlocoScript({ automacao, avisar }: { automacao: AutomacaoApiItem | null; avisar: (m: string) => void }) {
  if (!automacao) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[var(--border-light)] p-3 text-xs text-[var(--text-secondary)]">
        Este fluxo não está ligado a uma linha do relógio da VPS (squad, rotina manual ou reação a um evento), então não há comando de cron para mostrar.
      </div>
    );
  }
  return (
    <div className="mt-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">📄 Script principal</h3>
      {automacao.script ? <CaminhoCopiavel valor={automacao.script} avisar={avisar} /> : <p className="text-xs text-[var(--text-muted)]">a squad-api não indicou o script</p>}
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-3 mb-1">⌨️ Comando do cron <span className="normal-case">({automacao.agenda} UTC)</span></h3>
      <Codigo texto={automacao.comando} />
    </div>
  );
}

function PainelPeca({ peca, nivel, flow, desenho, d1, automacao, cronDescricao, onSelect, onIrParaLeigo, avisar }: {
  peca: Peca;
  nivel: Nivel;
  flow: FlowDoc;
  desenho: Desenho;
  d1: Desenho;
  automacao: AutomacaoApiItem | null;
  cronDescricao?: string;
  onSelect: (s: Selecao) => void;
  onIrParaLeigo: (id: string) => void;
  avisar: (m: string) => void;
}) {
  const m0: FlowDocNode = peca.membros[0];
  const vem = desenho.setas.filter((s) => s.target === peca.id);
  const vai = desenho.setas.filter((s) => s.source === peca.id);
  const porId = new Map(desenho.pecas.map((p) => [p.id, p]));
  const tags = [...new Set(peca.membros.flatMap((m) => m.data.tags || []))];
  const executores = [...new Set(peca.membros.map((m) => m.data.executor).filter(Boolean) as string[])];
  const textos = peca.membros.flatMap((m) => [m.data.label, m.data.details, m.data.executor, ...(m.data.tags || [])]);
  if (m0.type === "start" && cronDescricao) textos.push("cron UTC");
  const extras = peca.membros.flatMap((m) => m.data.glossario || []);
  const termos = termosDoTexto(textos, extras);
  const lider = nivel > 1 ? d1.mapa.get(peca.id) : null;
  const liderPeca = lider ? d1.pecas.find((p) => p.id === lider) : null;

  return (
    <div>
      <div className="flex items-start gap-2 mb-1">
        <span className="text-2xl leading-none">{peca.icon || "▫️"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">{peca.label}</h3>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: STROKE_BY_TYPE[peca.type] }}>{TYPE_LABEL[peca.type]}</span>
        </div>
        <button onClick={() => onSelect(null)} aria-label="Fechar detalhe" className="text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
      </div>

      {nivel > 1 && liderPeca && (
        <button onClick={() => onIrParaLeigo(liderPeca.id)} className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer mb-2 text-left">
          📍 No nível Leigo isto é parte de: {liderPeca.label}
        </button>
      )}

      {/* Nível 1: só o que acontece, em português de gente */}
      {nivel === 1 && (
        <div className="space-y-2 text-sm mt-2">
          {peca.membros.map((m) => (
            <div key={m.id}>
              {peca.membros.length > 1 && <p className="font-medium">{m.data.icon} {m.data.label}</p>}
              <p className="text-[var(--text-secondary)]">{primeiraFrase(m.data.details) || "Sem descrição ainda."}</p>
            </div>
          ))}
          {tags.length > 0 && <p className="text-xs text-[var(--text-muted)]">usa: {tags.join(", ")}</p>}
          {m0.type === "start" && cronDescricao && <p className="text-xs text-[var(--text-muted)]">⏰ {cronDescricao}</p>}
        </div>
      )}

      {/* Nível 2: peças e horários */}
      {nivel >= 2 && (
        <div className="space-y-2 text-sm mt-2">
          {m0.data.details ? (
            <p className="whitespace-pre-line text-[var(--text-secondary)]">{m0.data.details}</p>
          ) : (
            <p className="text-[var(--text-muted)]">Sem descrição ainda.</p>
          )}
          <Linha rotulo="Quem faz" valor={executores.join(", ") || "não informado"} />
          {tags.length > 0 && <Linha rotulo="Ferramentas" valor={tags.join(", ")} />}
          {m0.type === "start" && cronDescricao && <Linha rotulo="Quando" valor={cronDescricao} />}
        </div>
      )}

      {/* Nível 3: o arquivo e o trecho de verdade */}
      {nivel === 3 && (
        <div className="mt-3 space-y-2">
          {executores.map((ex) => {
            const caminho = caminhoDeArquivo(ex);
            return caminho ? <CaminhoCopiavel key={ex} valor={caminho} avisar={avisar} /> : null;
          })}
          {m0.data.codigo ? (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">
                {m0.data.codigo.arquivo || ""}{m0.data.codigo.linhas ? ` · linhas ${m0.data.codigo.linhas}` : ""}
              </p>
              <Codigo texto={m0.data.codigo.trecho} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border-light)] p-3 text-xs text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)] mb-0.5">🚧 Trecho do código: em breve</p>
              O curador de fluxos vai gravar aqui o pedaço do script que faz esta etapa. Por enquanto, veja o script
              principal abaixo.
            </div>
          )}
          {m0.type === "start" || !m0.data.codigo ? <BlocoScript automacao={automacao} avisar={avisar} /> : null}
        </div>
      )}

      {termos.length > 0 && (
        <details className="mt-4 rounded-lg border border-[var(--border)]">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium">📖 Glossário ({termos.length})</summary>
          <dl className="px-3 pb-3 space-y-2 text-xs">
            {termos.map((t) => (
              <div key={t.termo}>
                <dt className="font-semibold">{t.termo}</dt>
                <dd className="text-[var(--text-secondary)]">{t.definicao}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {(vem.length > 0 || vai.length > 0) && (
        <div className="mt-4 text-xs space-y-2">
          {vem.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Vem de</p>
              <div className="flex flex-wrap gap-1">
                {vem.map((s) => porId.get(s.source) && (
                  <button key={s.id} onClick={() => onSelect({ tipo: "peca", id: s.source })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">{porId.get(s.source)!.label}</button>
                ))}
              </div>
            </div>
          )}
          {vai.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Vai para</p>
              <div className="flex flex-wrap gap-1">
                {vai.map((s) => porId.get(s.target) && (
                  <button key={s.id} onClick={() => onSelect({ tipo: "peca", id: s.target })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    {s.label ? `${s.label}: ` : ""}{porId.get(s.target)!.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-[10px] text-[var(--text-muted)]">Fluxo: {flow.title}</p>
    </div>
  );
}

function PainelSeta({ seta, desenho, onSelect }: { seta: Desenho["setas"][number]; desenho: Desenho; onSelect: (s: Selecao) => void }) {
  const a = desenho.pecas.find((p) => p.id === seta.source);
  const b = desenho.pecas.find((p) => p.id === seta.target);
  if (!a || !b) return null;
  return (
    <div>
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-base font-semibold leading-tight flex-1">{a.label} → {b.label}</h3>
        <button onClick={() => onSelect(null)} aria-label="Fechar detalhe" className="text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">×</button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {seta.isReturn
          ? `Volta atrás: depois de "${a.label}", o fluxo retorna para "${b.label}" e repete o trecho${seta.label ? ` (${seta.label})` : ""}.`
          : seta.label
            ? `Quando a resposta é "${seta.label}", o fluxo segue de "${a.label}" para "${b.label}".`
            : `Terminou "${a.label}", segue direto para "${b.label}".`}
      </p>
      <div className="flex gap-1 mt-3 text-xs">
        <button onClick={() => onSelect({ tipo: "peca", id: a.id })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">ver {a.label}</button>
        <button onClick={() => onSelect({ tipo: "peca", id: b.id })} className="px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">ver {b.label}</button>
      </div>
    </div>
  );
}

// ── Peças pequenas ──────────────────────────────────────────────────────
function Selo({ cor, titulo, children }: { cor: string; titulo?: string; children: React.ReactNode }) {
  return (
    <span title={titulo} className="text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ color: cor, borderColor: cor }}>
      {children}
    </span>
  );
}

function Botao({ onClick, titulo, children }: { onClick: () => void; titulo: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={titulo} className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer whitespace-nowrap">
      {children}
    </button>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="text-xs">
      <span className="text-[var(--text-muted)]">{rotulo}: </span>
      <span className="text-[var(--text-primary)] break-words">{valor}</span>
    </p>
  );
}

function Codigo({ texto }: { texto: string }) {
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded p-2 border border-[var(--border)] overflow-x-auto max-h-72">
      {texto}
    </pre>
  );
}

function CaminhoCopiavel({ valor, avisar }: { valor: string; avisar: (m: string) => void }) {
  return (
    <button
      onClick={async () => { await copy(valor); avisar("Caminho copiado."); }}
      title="Copiar o caminho"
      className="w-full text-left font-mono text-[11px] bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer break-all"
    >
      📄 {valor} <span className="text-[var(--text-muted)]">· copiar</span>
    </button>
  );
}
