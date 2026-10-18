// Página da Licitação (Produção → Licitação).
// Tudo que a página precisa da squad-api fica atrás da interface `Backend`:
//  - `backendReal`: fala com a squad-api (mesmas rotas que o JobsMonitor já usa);
//  - `backendDemo`: simulação 100% no navegador, para ensaiar e mostrar no curso
//    sem gastar assinatura e sem tocar em processo real.

import { squadFetch, squadUrlComToken } from "./squadFetch";

export type SquadId = "licitacao-igam" | "apoio-licitacao-outro-setor";

export const SQUADS_LICITACAO: {
  id: SquadId; icone: string; nome: string; resumo: string; secaoExemplo: string;
}[] = [
  {
    id: "licitacao-igam",
    icone: "⚖️",
    nome: "Licitação Geirh",
    resumo: "Processo completo da Geirh: do DFD à entrega do pacote para o SEI, com paradas para você aprovar cada peça.",
    secaoExemplo: "Pedido (licitacao-igam)",
  },
  {
    id: "apoio-licitacao-outro-setor",
    icone: "📑",
    nome: "Licitação outras áreas",
    resumo: "Apoio a licitações de outras áreas do Igam (ex.: GERUR): triagem, mercado, preços, ETP/TR, revisão jurídica e minuta de encaminhamento.",
    secaoExemplo: "Pedido (apoio-licitacao-outro-setor)",
  },
];

export const CODIGOS_LICITACAO: string[] = SQUADS_LICITACAO.map((s) => s.id);

export const ARQUIVO_EXEMPLO = "/casos/geirh-renovacao-licenca-geoprocessamento-ficticio.md";
export const NOME_ARQUIVO_EXEMPLO = "geirh-renovacao-licenca-geoprocessamento-ficticio.md";

export interface JobLic {
  jobId: string;
  squad: string;
  topic: string;
  status: "running" | "completed" | "failed" | "cancelled" | "rejected" | "interrupted" | "paused";
  startedAt: string;
  completedAt?: string;
  error?: { message: string; stepName?: string };
  lastSuccessfulStepId?: number | string;
  userStatus?: string;
  driveFolder?: string;
}

export interface EtapaLic {
  id: number | string;
  name: string;
  type: string;
  agent?: string;
}

export interface ParadaLic {
  jobId: string;
  stepId: string;
  stepName: string;
  stepPrompt: string;
  producedFiles: { name: string; size: number }[];
  createdAt: string;
}

export interface ArquivoLic {
  name: string;
  size: number;
  mtime: string;
}

export interface Backend {
  demo: boolean;
  listarJobs(): Promise<JobLic[]>;
  etapas(squad: string): Promise<EtapaLic[]>;
  paradas(jobId: string): Promise<ParadaLic[]>;
  arquivos(jobId: string): Promise<ArquivoLic[]>;
  lerArquivo(jobId: string, nome: string): Promise<string>;
  baixarArquivo(jobId: string, nome: string): Promise<Blob>;
  /** Versão .docx (formatada para o Word) de um .md/.txt do processo. */
  baixarDocx(squad: string, jobId: string, nome: string): Promise<Blob>;
  iniciar(squad: SquadId, topic: string, anexos: File[]): Promise<string>;
  decidir(jobId: string, stepId: string, aprovado: boolean, comentario: string): Promise<void>;
  parar(jobId: string): Promise<void>;
  salvarNoDrive(jobId: string): Promise<void>;
  /** Acompanhamento ao vivo do log. Devolve a função que encerra a conexão. */
  acompanhar(jobId: string, aoChegar: (texto: string) => void): () => void;
}

async function falhou(r: Response, prefixo: string): Promise<never> {
  const corpo = await r.json().catch(() => ({}));
  throw new Error(`${prefixo}: ${corpo.error || corpo.erro || r.statusText || r.status}`);
}

// ── Backend real ────────────────────────────────────────────────────────
export const backendReal: Backend = {
  demo: false,

  async listarJobs() {
    const r = await squadFetch("/api/jobs");
    if (!r.ok) return falhou(r, "Não consegui listar as execuções");
    const todos: JobLic[] = await r.json();
    return todos.filter((j) => CODIGOS_LICITACAO.includes(j.squad));
  },

  async etapas(squad) {
    const r = await squadFetch(`/api/squads/${squad}/pipeline`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.steps || [];
  },

  async paradas(jobId) {
    const r = await squadFetch(`/api/jobs/${jobId}/pending`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.pendings || [];
  },

  async arquivos(jobId) {
    const r = await squadFetch(`/api/jobs/${jobId}/files`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.files || [];
  },

  async lerArquivo(jobId, nome) {
    const r = await squadFetch(`/api/jobs/${jobId}/files/${encodeURIComponent(nome)}`);
    if (!r.ok) return falhou(r, "Não consegui abrir o arquivo");
    return r.text();
  },

  async baixarArquivo(jobId, nome) {
    const r = await squadFetch(`/api/jobs/${jobId}/files/${encodeURIComponent(nome)}`);
    if (!r.ok) return falhou(r, "Não consegui baixar o arquivo");
    return r.blob();
  },

  async baixarDocx(squad, _jobId, nome) {
    const r = await squadFetch(`/api/docx?squad=${encodeURIComponent(squad)}&arquivo=${encodeURIComponent(nome)}`);
    if (!r.ok) return falhou(r, "Não consegui converter para Word");
    return r.blob();
  },

  async iniciar(squad, topic, anexos) {
    let documents: unknown[] = [];
    if (anexos.length > 0) {
      // Os anexos ficam na VPS (pasta protegida por login), não no bucket do Supabase
      const fd = new FormData();
      anexos.forEach((f) => fd.append("files", f));
      const up = await squadFetch(`/api/uploads/${squad}`, { method: "POST", body: fd });
      if (!up.ok) return falhou(up, "Não consegui enviar os anexos");
      documents = (await up.json()).documents || [];
    }
    const r = await squadFetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ squad, topic: topic.trim(), documents }),
    });
    if (!r.ok) return falhou(r, "Não consegui iniciar a squad");
    return (await r.json()).jobId as string;
  },

  async decidir(jobId, stepId, aprovado, comentario) {
    const r = await squadFetch(`/api/jobs/${jobId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, approved: aprovado, comment: comentario }),
    });
    if (!r.ok) return falhou(r, "Não consegui registrar sua decisão");
  },

  async parar(jobId) {
    const r = await squadFetch(`/api/jobs/${jobId}/stop`, { method: "POST" });
    if (!r.ok) return falhou(r, "Não consegui parar a squad");
  },

  async salvarNoDrive(jobId) {
    const r = await squadFetch(`/api/jobs/${jobId}/sync-drive`, { method: "POST" });
    if (!r.ok) return falhou(r, "Não consegui salvar no Drive");
  },

  acompanhar(jobId, aoChegar) {
    // EventSource não manda cabeçalho: o token vai na URL (a squad-api aceita ?token=)
    let es: EventSource | null = null;
    let fechado = false;
    squadUrlComToken(`/api/jobs/${jobId}/stream`).then((url) => {
      if (fechado) return;
      es = new EventSource(url);
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.chunk) aoChegar(String(d.chunk));
          if (d.done) es?.close();
        } catch { /* pedaço ilegível: ignora */ }
      };
      es.onerror = () => es?.close();
    }).catch(() => {});
    return () => { fechado = true; es?.close(); };
  },
};

// ── Backend de demonstração (simulado no navegador) ─────────────────────
// Mesma linha de montagem da squad "Apoio a outro setor", só que de mentira:
// cada etapa leva alguns segundos, as paradas esperam por você de verdade
// e "Pedir ajuste" faz a etapa anterior ser refeita com o seu comentário.

const ETAPAS_DEMO: (EtapaLic & { arquivo?: string })[] = [
  { id: "step-01", name: "Triagem e checklist de documentos", type: "agent", agent: "donna", arquivo: "01-triagem.md" },
  { id: "step-02", name: "Pesquisa de mercado e fornecedor exclusivo", type: "agent", agent: "mike", arquivo: "02-mercado.md" },
  { id: "step-03", name: "Pesquisa de preços", type: "agent", agent: "louis", arquivo: "03-precos.md" },
  { id: "step-04", name: "Estrutura do ETP e do TR", type: "agent", agent: "katrina", arquivo: "04-estrutura.md" },
  { id: "step-05", name: "checkpoint-aprovar-estrutura", type: "checkpoint" },
  { id: "step-06", name: "Revisão jurídica e riscos", type: "agent", agent: "harvey", arquivo: "06-revisao.md" },
  { id: "step-07", name: "checkpoint-aprovar-revisao", type: "checkpoint" },
  { id: "step-08", name: "Minuta de despacho de encaminhamento", type: "agent", agent: "donna", arquivo: "08-despacho.md" },
];

const PROMPTS_DEMO: Record<string, string> = {
  "step-05": "Andréia, o ETP/TR estruturado está bom para seguir à revisão jurídica? Há [CONFIRMAR] que você já resolve agora?",
  "step-07": "Andréia, aprova a revisão jurídica e os riscos apontados? Posso gerar a minuta de despacho?",
};

const SEG_POR_ETAPA_DEMO = 4;

interface JobDemo extends JobLic {
  idx: number;            // etapa atual
  desde: number;          // quando a etapa atual começou (ms)
  esperando: boolean;     // parado numa parada, esperando decisão
  arquivos: Record<string, { texto: string; mtime: string }>;
  ajustes: Record<string, string>; // comentário de "pedir ajuste" por etapa
  log: string;
}

const demoJobs: JobDemo[] = [];

function textoDemo(etapa: EtapaLic & { arquivo?: string }, topic: string, ajuste?: string): string {
  const cab = `> EXEMPLO FICTÍCIO (demonstração simulada). Nada aqui é processo real.\n\n`;
  const adj = ajuste ? `\n## Ajuste pedido por você\n\n${ajuste}\n\nO texto abaixo já incorpora esse pedido. (Simulado.)\n` : "";
  const resumo = topic.replace(/\s+/g, " ").slice(0, 220);
  switch (etapa.id) {
    case "step-01":
      return `${cab}# Triagem e checklist de documentos\n\n**Demanda recebida:** ${resumo}\n\n## O que veio\n\n- Pedido do setor demandante (ofício)\n- Descrição do objeto\n\n## O que falta\n\n| Documento | Situação |\n|---|---|\n| DFD | [CONFIRMAR] não anexado |\n| Carta de exclusividade | [CONFIRMAR] citada, mas não anexada |\n| Indicação do fiscal | [CONFIRMAR] sem nome |\n| Orçamento | [CONFIRMAR] valor R$ 0,00 fictício |\n`;
    case "step-02":
      return `${cab}# Pesquisa de mercado e fornecedor exclusivo\n\n- A exclusividade informada **não foi comprovada**: nenhuma fonte pública achada. [CONFIRMAR]\n- Alternativas de mercado: levantamento simulado, sem links reais.\n- Normas úteis: Lei 14.133/2021, art. 74, I.\n`;
    case "step-03":
      return `${cab}# Pesquisa de preços\n\nNenhum valor sem fonte. Nesta simulação, os preços de referência ficam **[CONFIRMAR]** até haver contratos do próprio fornecedor com outros órgãos.\n`;
    case "step-04":
      return `${cab}# Estrutura do ETP e do TR\n\n## ETP\n\n1. Descrição da necessidade\n2. Requisitos da contratação\n3. Levantamento de mercado\n4. Estimativa de valor: [CONFIRMAR]\n5. Justificativa da inexigibilidade: [CONFIRMAR] depende da carta de exclusividade\n\n## TR\n\n- Objeto, vigência de 12 meses, obrigações, fiscalização, pagamento.\n${adj}`;
    case "step-06":
      return `${cab}# Revisão jurídica e riscos\n\n**Risco 1 (alto):** inexigibilidade sem comprovação de exclusividade.\n\n**Risco 2 (médio):** ausência de pesquisa de preços com fonte.\n\n**Ressalva (1):** não prosseguir sem a carta de exclusividade.\n\n**Recomendação (1):** registrar a fonte de cada preço.\n${adj}`;
    default:
      return `${cab}# Minuta de despacho de encaminhamento\n\nAo setor demandante,\n\nEncaminhamos o pacote com o ETP, o TR e a revisão jurídica. Pendências: carta de exclusividade, indicação do fiscal e pesquisa de preços com fonte.\n\nAtenciosamente,\nGerente da Geirh\n`;
  }
}

function avancarDemo(j: JobDemo) {
  if (j.status !== "running" || j.esperando) return;
  const agora = Date.now();
  while (j.status === "running" && !j.esperando && j.idx < ETAPAS_DEMO.length) {
    const e = ETAPAS_DEMO[j.idx];
    if (e.type === "checkpoint") { j.esperando = true; return; }
    if (agora - j.desde < SEG_POR_ETAPA_DEMO * 1000) return;
    const arquivo = e.arquivo as string;
    j.arquivos[arquivo] = {
      texto: textoDemo(e, j.topic, j.ajustes[String(e.id)]),
      mtime: new Date(j.desde + SEG_POR_ETAPA_DEMO * 1000).toISOString(),
    };
    j.log += `[${e.id}] ✅ ${e.agent} concluiu: ${e.name}\n`;
    j.lastSuccessfulStepId = e.id;
    j.idx++;
    j.desde += SEG_POR_ETAPA_DEMO * 1000;
  }
  if (j.idx >= ETAPAS_DEMO.length) {
    j.status = "completed";
    j.completedAt = new Date().toISOString();
    j.log += "🎉 Pipeline concluído (simulado)\n";
  }
}

function achaDemo(jobId: string): JobDemo {
  const j = demoJobs.find((x) => x.jobId === jobId);
  if (!j) throw new Error("execução de demonstração não encontrada (a página foi recarregada?)");
  avancarDemo(j);
  return j;
}

const soJob = ({ idx: _i, desde: _d, esperando: _e, arquivos: _a, ajustes: _aj, log: _l, ...job }: JobDemo): JobLic => job;

export const backendDemo: Backend = {
  demo: true,

  async listarJobs() {
    demoJobs.forEach(avancarDemo);
    return demoJobs.map(soJob).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },

  async etapas() { return ETAPAS_DEMO.map(({ id, name, type, agent }) => ({ id, name, type, agent })); },

  async paradas(jobId) {
    const j = achaDemo(jobId);
    if (!j.esperando) return [];
    const e = ETAPAS_DEMO[j.idx];
    return [{
      jobId, stepId: String(e.id), stepName: e.name, stepPrompt: PROMPTS_DEMO[String(e.id)] || `Aprovar ${e.name}?`,
      producedFiles: Object.keys(j.arquivos).map((name) => ({ name, size: j.arquivos[name].texto.length })),
      createdAt: new Date().toISOString(),
    }];
  },

  async arquivos(jobId) {
    const j = achaDemo(jobId);
    return Object.entries(j.arquivos).map(([name, a]) => ({ name, size: a.texto.length, mtime: a.mtime }));
  },

  async lerArquivo(jobId, nome) {
    const a = achaDemo(jobId).arquivos[nome];
    if (!a) throw new Error("arquivo não encontrado");
    return a.texto;
  },

  async baixarArquivo(jobId, nome) {
    return new Blob([await this.lerArquivo(jobId, nome)], { type: "text/markdown;charset=utf-8" });
  },

  // na demonstração não há servidor para converter: entrega o texto original
  async baixarDocx(_squad, jobId, nome) { return this.baixarArquivo(jobId, nome); },

  async iniciar(squad, topic) {
    const jobId = `demo-${Math.random().toString(36).slice(2, 10)}`;
    demoJobs.push({
      jobId, squad, topic, status: "running", startedAt: new Date().toISOString(),
      idx: 0, desde: Date.now(), esperando: false, arquivos: {}, ajustes: {},
      log: `🚀 Iniciando squad: ${squad} (SIMULAÇÃO)\n📌 Tópico: ${topic}\n`,
    });
    return jobId;
  },

  async decidir(jobId, stepId, aprovado, comentario) {
    const j = achaDemo(jobId);
    if (!j.esperando || String(ETAPAS_DEMO[j.idx].id) !== stepId) throw new Error("essa parada não está mais esperando");
    j.esperando = false;
    j.desde = Date.now();
    if (aprovado) {
      j.log += `✅ Aprovado${comentario ? `: ${comentario}` : ""}\n`;
      j.lastSuccessfulStepId = stepId;
      j.idx++;
    } else {
      const anterior = j.idx - 1;
      j.ajustes[String(ETAPAS_DEMO[anterior].id)] = comentario;
      j.log += `❌ Ajuste pedido: ${comentario}\n🔄 Refazendo ${ETAPAS_DEMO[anterior].name}\n`;
      j.idx = anterior;
      j.lastSuccessfulStepId = anterior > 0 ? ETAPAS_DEMO[anterior - 1].id : undefined;
    }
  },

  async parar(jobId) {
    const j = achaDemo(jobId);
    j.status = "cancelled";
    j.completedAt = new Date().toISOString();
  },

  async salvarNoDrive() { /* na demonstração não há Drive */ },

  acompanhar(jobId, aoChegar) {
    let enviado = 0;
    const t = setInterval(() => {
      try {
        const j = achaDemo(jobId);
        if (j.log.length > enviado) { aoChegar(j.log.slice(enviado)); enviado = j.log.length; }
        if (j.status !== "running") clearInterval(t);
      } catch { clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  },
};

// ── Auxiliares de tela ──────────────────────────────────────────────────

export type EstadoEtapa = "feita" | "agora" | "espera" | "fila" | "parou";

/** Cruza as etapas do pipeline com o andamento do job para pintar a linha do tempo. */
export function estadoDasEtapas(etapas: EtapaLic[], job: JobLic, paradas: ParadaLic[]): EstadoEtapa[] {
  const ultima = job.lastSuccessfulStepId;
  const idxUltima = ultima == null ? -1 : etapas.findIndex((e) => String(e.id) === String(ultima));
  const noPonto = job.status === "completed" ? etapas.length : idxUltima + 1;
  let marcouAtual = false;
  return etapas.map((e, i) => {
    if (i < noPonto) return "feita";
    if (paradas.some((p) => String(p.stepId) === String(e.id))) { marcouAtual = true; return "espera"; }
    if (!marcouAtual && i === noPonto) {
      marcouAtual = true;
      return job.status === "running" ? "agora" : "parou";
    }
    return "fila";
  });
}

/** Arquivos que ESTA execução gerou: a pasta de saída da squad é compartilhada,
 *  então só vale o que foi modificado durante a janela de tempo do job. */
export function arquivosDoJob(arquivos: ArquivoLic[], job: JobLic): ArquivoLic[] {
  const ini = new Date(job.startedAt).getTime() - 5000;
  const fim = job.completedAt ? new Date(job.completedAt).getTime() + 60000 : Date.now() + 60000;
  return arquivos
    .filter((a) => {
      const t = new Date(a.mtime).getTime();
      return t >= ini && t <= fim;
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

const NOMES_AGENTES: Record<string, string> = {
  donna: "Donna", mike: "Mike", louis: "Louis", katrina: "Katrina", harvey: "Dr. Harvey",
  eric: "Eric", junior: "Junior",
};

export function nomeAgente(id?: string): string {
  if (!id) return "";
  return NOMES_AGENTES[id] || id.replace(/-/g, " ");
}

export function rotuloEtapa(e: EtapaLic): string {
  if (e.type === "checkpoint") {
    return "Parada: " + e.name.replace(/^checkpoint-(aprovar|aguardar)-/, "").replace(/-/g, " ");
  }
  return e.name;
}

export const STATUS_JOB: Record<string, { rotulo: string; cor: string }> = {
  running: { rotulo: "rodando", cor: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  completed: { rotulo: "concluída", cor: "bg-green-500/15 text-green-600 border-green-500/30" },
  failed: { rotulo: "falhou", cor: "bg-red-500/15 text-red-500 border-red-500/30" },
  paused: { rotulo: "pausada", cor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  interrupted: { rotulo: "interrompida", cor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  cancelled: { rotulo: "parada", cor: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
  rejected: { rotulo: "rejeitada", cor: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
};

export function dataHora(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

/** "17/10 23h40" (horário de Brasília). */
export function dataHoraCurta(iso?: string): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("day")}/${g("month")} ${g("hour")}h${g("minute")}`;
}

/** Número curto e estável do processo (o motor não numera as execuções). */
export function numeroProcesso(job: JobLic): string {
  return "#" + job.jobId.replace(/^demo-/, "").slice(0, 4).toUpperCase();
}

export function nomeSquad(id: string): string {
  return SQUADS_LICITACAO.find((s) => s.id === id)?.nome || id;
}

/** A pasta de saída é uma só por squad: a atribuição por horário é aproximada
 *  quando outra execução da mesma squad se sobrepõe, ou na Licitação Geirh
 *  (que já guarda arquivos do processo real). */
export function atribuicaoAproximada(job: JobLic, todos: JobLic[]): boolean {
  if (job.squad === "licitacao-igam") return true;
  const ini = new Date(job.startedAt).getTime();
  const fim = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  return todos.some((o) => {
    if (o.jobId === job.jobId || o.squad !== job.squad) return false;
    const oi = new Date(o.startedAt).getTime();
    const of = o.completedAt ? new Date(o.completedAt).getTime() : Date.now();
    return oi <= fim + 60000 && of >= ini - 5000;
  });
}

export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extrai de um arquivo de caso a seção "## <título>" (texto até o próximo "## "). */
export function secaoDoCaso(markdown: string, titulo: string): string {
  const linhas = markdown.split("\n");
  const i = linhas.findIndex((l) => l.trim().toLowerCase() === `## ${titulo}`.toLowerCase());
  if (i < 0) return "";
  const corpo: string[] = [];
  for (let k = i + 1; k < linhas.length && !linhas[k].startsWith("## "); k++) corpo.push(linhas[k]);
  return corpo.join("\n").trim();
}

/** Arquivos de texto que têm versão .docx. */
export const temDocx = (nome: string) => /\.(md|txt)$/i.test(nome);
export const nomeDocx = (nome: string) => nome.replace(/\.(md|txt)$/i, "") + ".docx";
