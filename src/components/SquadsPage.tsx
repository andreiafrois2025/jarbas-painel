"use client";

import Mascote from "./Mascote";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Squad, SquadDocument, Collaborator, CONTEXTS as CONTEXTS_TODOS } from "@/lib/types";
import { usePainel } from "@/lib/painel-context";
import { ehPessoal, ehColaboradorOculto, ehContextoPessoal } from "@/lib/modo";
import { getSquads, addSquad, updateSquad, deleteSquad, getCollaborators } from "@/lib/storage";
import { useUI, Janela } from "./ui";
import { supabase } from "@/lib/supabase";
import { refDocumento, abrirDocumento } from "@/lib/documentos";
import { squadFetch } from "@/lib/squadFetch";
import {
  buscaResumoSquads, buscaJobs, codigoDaSquad, separaSquads, quandoCurto,
  type ResumoSquad, type JobResumo, type NoCaminho, type MotivoRascunho,
} from "@/lib/squadsResumo";
import StartSquadModal from "./StartSquadModal";

const CONTEXT_ICONS: Record<string, string> = {
  "IGAM": "🏛️",
  "AndréIA": "🤖",
  "Pessoal": "👤",
  "Família": "🏠",
};

type Filtro = "todas" | "conteudo" | "igam" | "equipe";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "conteudo", rotulo: "🎬 Conteúdo" },
  { id: "igam", rotulo: "🏛️ Igam" },
  { id: "equipe", rotulo: "🤖 Equipe" },
];

const NOMES_CURTOS: Record<string, string> = { "Dr. Harvey": "Harvey", "Dra. Nara": "Nara" };

// ── O caminho da squad: mascote + verbo de cada um, e as paradas dela (AF) ──
function Mini({ id, nome, tam }: { id: string; nome: string; tam: number }) {
  return <Mascote nome={nome} emoji="🤖" tamanho={tam} />;
}

function No({ n }: { n: NoCaminho }) {
  if (n.tipo === "cp") {
    return (
      <span className="shrink-0 mt-1" title="Aqui a squad para e espera você aprovar" role="img" aria-label="parada: espera a aprovação da Andréia">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold"
          style={{ background: "var(--ouro)", color: "#fff" }}>AF</span>
      </span>
    );
  }
  if (n.tipo === "grupo") {
    return (
      <span className="flex flex-col items-center gap-1 shrink-0 max-w-[112px]">
        <span className="flex -space-x-3">
          {n.membros.slice(0, 3).map((m) => <Mini key={m} id={m} nome={m} tam={32} />)}
        </span>
        <span className="text-[11px] text-[var(--text-secondary)] leading-tight text-center">
          <b className="text-[var(--text-primary)] font-semibold">{n.nome}</b> {n.verbo}
        </span>
      </span>
    );
  }
  const curto = NOMES_CURTOS[n.nome] || n.nome;
  return (
    <span className="flex flex-col items-center gap-1 shrink-0 max-w-[96px]">
      {n.id === "especialista"
        ? <span className="flex -space-x-3"><Mini id="eric" nome="Eric" tam={32} /><Mini id="junior" nome="Junior" tam={32} /></span>
        : <Mini id={n.id} nome={n.nome} tam={40} />}
      <span className="text-[11px] text-[var(--text-secondary)] leading-tight text-center">
        <b className="text-[var(--text-primary)] font-semibold">{curto}</b> {n.verbo}
      </span>
    </span>
  );
}

function Caminho({ caminho }: { caminho: NoCaminho[] }) {
  if (!caminho.length) return null;
  return (
    <div className="rounded-xl bg-[var(--bg-tertiary)] px-3 py-2.5">
    <div className="flex items-start gap-x-1.5 gap-y-3 flex-wrap">
      {caminho.map((n, i) => (
        <span key={i} className="flex items-start gap-1.5">
          <No n={n} />
          {i < caminho.length - 1 && <span className="text-[var(--text-muted)] text-sm mt-3" aria-hidden>→</span>}
        </span>
      ))}
    </div>
    {caminho.some((n) => n.tipo === "cp") && (
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        <span className="inline-block w-3.5 h-3.5 rounded-full align-[-2px] mr-1" style={{ background: "var(--ouro)" }} aria-hidden />
        = a squad para e espera a sua aprovação (AF)
      </p>
    )}
    </div>
  );
}

interface SquadsPageProps {
  onNavigate?: (page: string) => void;
}

export default function SquadsPage(_props: SquadsPageProps = {}) {
  const { confirmar } = useUI();
  const { servidora } = usePainel();
  // Modo Servidora: sem os contextos Pessoal/Família nem squads/colaboradores pessoais
  const CONTEXTS = CONTEXTS_TODOS.filter((c) => !(servidora && ehContextoPessoal(c)));
  const [squads, setSquads] = useState<Squad[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [resumo, setResumo] = useState<ResumoSquad[] | null>(null);
  const [jobs, setJobs] = useState<JobResumo[]>([]);
  const [rascunhosAbertos, setRascunhosAbertos] = useState(false);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [entregasDe, setEntregasDe] = useState<Squad | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "📸",
    link: "",
    contexts: [] as string[],
    collaborator_ids: [] as string[],
    documents: [] as SquadDocument[],
    status: "active" as "active" | "inactive",
  });

  // --- Estado do upload de documentos ---
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Modal "Iniciar Squad" (estado mínimo: só qual squad e se está aberto) ---
  const [showRunModal, setShowRunModal] = useState(false);
  const [runningSquad, setRunningSquad] = useState<Squad | null>(null);

  // --- Upload de documentos ---

  /** Faz upload dos arquivos selecionados para o Supabase Storage (bucket squad-documents) */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logada para subir arquivos.");
      const squadFolder = editingSquad?.id || `temp-${Date.now()}`;
      const uploaded: SquadDocument[] = [];
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${squadFolder}/${timestamp}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("squad-documents")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw new Error(`Erro ao subir ${file.name}: ${upErr.message}`);
        uploaded.push({
          name: file.name,
          url: refDocumento(path),
          path,
          size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
        });
      }
      setForm(f => ({ ...f, documents: [...f.documents, ...uploaded] }));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro desconhecido no upload.");
    } finally {
      setUploading(false);
    }
  };

  /** Remove documento do form (e tenta deletar do Storage) */
  const handleRemoveDocument = async (doc: SquadDocument) => {
    if (!(await confirmar({ titulo: `Remover o arquivo "${doc.name}"?`, descricao: "Ele deixa de estar disponível pra esta squad.", acao: "Remover", destrutivo: true }))) return;
    try {
      await supabase.storage.from("squad-documents").remove([doc.path]);
    } catch (err) {
      console.warn("Erro ao deletar do storage (vou remover só do form):", err);
    }
    setForm(f => ({ ...f, documents: f.documents.filter(d => d.path !== doc.path) }));
  };

  /** Formata bytes para texto legível */
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingSquad) {
        await updateSquad(editingSquad.id, form);
      } else {
        await addSquad(form);
      }
      await loadData();
      setShowForm(false);
    } catch (err) {
      console.error("Erro ao salvar squad:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmar({ titulo: "Excluir este squad?", descricao: "O squad sai do painel. Os trabalhos que ele já produziu continuam salvos.", acao: "Excluir", destrutivo: true }))) return;
    try {
      await deleteSquad(id);
      await loadData();
    } catch (err) {
      console.error("Erro ao excluir squad:", err);
    }
  };

  /** Abre o modal de "Iniciar Squad" */
  const openRunModal = (squad: Squad) => {
    setRunningSquad(squad);
    setShowRunModal(true);
  };

  const toggleContext = (ctx: string) => {
    setForm(f => ({
      ...f,
      contexts: f.contexts.includes(ctx) ? f.contexts.filter(c => c !== ctx) : [...f.contexts, ctx],
    }));
  };

  const toggleCollaborator = (id: string) => {
    setForm(f => ({
      ...f,
      collaborator_ids: f.collaborator_ids.includes(id)
        ? f.collaborator_ids.filter(c => c !== id)
        : [...f.collaborator_ids, id],
    }));
  };

  const moveCollaborator = (id: string, dir: -1 | 1) => {
    setForm(f => {
      const arr = [...f.collaborator_ids];
      const idx = arr.indexOf(id);
      if (idx < 0) return f;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return f;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...f, collaborator_ids: arr };
    });
  };
  const loadData = async () => {
    try {
      const [squadsData, collabData] = await Promise.all([getSquads(), getCollaborators()]);
      setSquads(servidora
        ? squadsData.filter(sq => !ehPessoal(sq.name, sq.description)).map(sq => ({ ...sq, contexts: (sq.contexts || []).filter(c => !ehContextoPessoal(c)) }))
        : squadsData);
      setCollaborators(collabData.filter(c => (c.status || "active") === "active" && !(servidora && ehColaboradorOculto(c.name))));
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Resumo (caminho, última, estado) e jobs rodando: mesma fonte do JobsMonitor (/api/jobs)
  const atualizaVivo = useCallback(async () => {
    const [r, j] = await Promise.all([buscaResumoSquads(), buscaJobs()]);
    if (r) setResumo(r);
    if (j) setJobs(j);
  }, []);
  useEffect(() => {
    atualizaVivo();
    const id = setInterval(atualizaVivo, 15000);
    return () => clearInterval(id);
  }, [atualizaVivo]);

  const resumoDe = useCallback((s: Squad) => {
    const code = codigoDaSquad(s.link);
    return code ? resumo?.find((x) => x.code === code) : undefined;
  }, [resumo]);

  const { reais, rascunhos } = useMemo(
    () => separaSquads(squads, resumo ? new Set(resumo.map((x) => x.code)) : null),
    [squads, resumo],
  );

  const categoriaDe = useCallback((s: Squad): Filtro => {
    const c = resumoDe(s)?.categoria;
    if (c) return c;
    return (s.contexts || []).includes("IGAM") ? "igam" : "conteudo";
  }, [resumoDe]);

  const visiveis = useMemo(
    () => reais.filter((s) => filtro === "todas" || categoriaDe(s) === filtro),
    [reais, filtro, categoriaDe],
  );
  const contagem = (f: Filtro) => (f === "todas" ? reais.length : reais.filter((s) => categoriaDe(s) === f).length);

  // Squads rodando agora (jobs reais) ligadas a um card
  const rodando = useMemo(() => {
    const ativos = jobs.filter((j) => j.status === "running" && !j.userStatus);
    return ativos.map((j) => {
      const sq = reais.find((s) => codigoDaSquad(s.link) === j.squad);
      const rs = resumo?.find((x) => x.code === j.squad);
      return { job: j, squad: sq, resumo: rs };
    });
  }, [jobs, reais, resumo]);

  const descricaoCurta = (s: Squad): string => {
    const r = resumoDe(s);
    if (r?.descricao) return r.descricao;
    const t = (s.description || "").replace(/\s+/g, " ").trim();
    const i = t.search(/[.](\s|$)/);
    return i > 0 ? t.slice(0, i + 1) : t;
  };

  const openEdit = (squad: Squad) => {
    setEditingSquad(squad);
    setForm({
      name: squad.name,
      description: squad.description || "",
      icon: squad.icon || "📸",
      link: squad.link || "",
      contexts: squad.contexts || [],
      collaborator_ids: squad.collaborator_ids || [],
      documents: squad.documents || [],
      status: squad.status || "active",
    });
    setUploadError(null);
    setShowForm(true);
  };

  const ultimaTexto = (s: Squad) => {
    const u = resumoDe(s)?.ultima;
    if (!u) return null;
    const t = (u.topico || "").replace(/\s+/g, " ").trim();
    return `${quandoCurto(u.quando)}${t ? " · " + (t.length > 56 ? t.slice(0, 55).trimEnd() + "…" : t) : ""}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[var(--text-secondary)] animate-pulse">Carregando squads...</span>
      </div>
    );
  }

  const chip = (ativo: boolean) =>
    `shrink-0 text-[13px] font-bold rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${
      ativo ? "bg-[var(--ac)] text-[var(--on-ac)] border-[var(--ac)]"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)]"}`;
  const btnRodar = "inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-bold cursor-pointer bg-[var(--ac)] text-[var(--on-ac)] hover:opacity-90";
  const btnSec = "inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-bold cursor-pointer border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]";

  const cartao = (squad: Squad, motivo?: MotivoRascunho) => {
    const r = resumoDe(squad);
    const ult = ultimaTexto(squad);
    const roda = rodando.some((x) => x.squad?.id === squad.id);
    return (
      <article key={squad.id} className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 md:p-5 flex flex-col gap-3 min-w-0">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 min-w-0 text-lg font-bold leading-snug text-[var(--text-primary)] break-words">
            <span className="mr-1.5" aria-hidden>{squad.icon || "📸"}</span>{squad.name}
          </h2>
          <button onClick={() => setMenuAberto(menuAberto === squad.id ? null : squad.id)} aria-label={`Mais opções de ${squad.name}`}
            className="shrink-0 w-8 h-8 -mt-1 -mr-1 rounded-lg text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] cursor-pointer">⋯</button>
          {menuAberto === squad.id && (
            <div className="absolute right-3 top-12 z-20 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg py-1 min-w-[140px]">
              <button onClick={() => { setMenuAberto(null); openEdit(squad); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] cursor-pointer">✏️ Editar</button>
              <button onClick={() => { setMenuAberto(null); handleDelete(squad.id); }} className="w-full text-left px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-tertiary)] cursor-pointer">🗑️ Excluir</button>
            </div>
          )}
        </div>
        {motivo && <p className="text-xs text-[var(--text-muted)] -mt-2">Guardada aqui porque: {motivo}</p>}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{descricaoCurta(squad)}</p>
        {r && <Caminho caminho={r.caminho} />}
        <div className="mt-auto flex items-center gap-3 flex-wrap">
          <p className="flex-1 min-w-[10rem] text-[13px] text-[var(--text-secondary)] flex items-center gap-1.5">
            {roda
              ? <><span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse shrink-0" /> Rodando agora</>
              : ult
                ? <><span className="w-2 h-2 rounded-full bg-[var(--success)] shrink-0" /> <span>Última: {ult}</span></>
                : <><span className="w-2 h-2 rounded-full border border-[var(--text-muted)] shrink-0" /> Ainda não rodou de verdade</>}
          </p>
          <button onClick={() => openRunModal(squad)} className={btnRodar}>▶ Rodar</button>
          <button onClick={() => setEntregasDe(squad)} className={btnSec}>Entregas</button>
        </div>
      </article>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden" onClick={() => menuAberto && setMenuAberto(null)}>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Rodando agora: só aparece quando há execução de verdade */}
        {rodando.map(({ job, squad, resumo: rs }) => {
          const etapa = rs?.estado?.etapa ?? 0, total = rs?.estado?.total ?? 0;
          const pct = total > 0 ? Math.min(100, Math.round((etapa / total) * 100)) : 0;
          return (
            <div key={job.jobId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse shrink-0" aria-hidden />
              <b className="text-[var(--text-primary)]">{squad?.name || rs?.nome || job.squad}</b>
              <span className="text-sm text-[var(--text-secondary)] flex-1 min-w-[12rem]">
                rodando agora{total > 0 ? ` · etapa ${Math.min(etapa + 1, total)} de ${total}` : ""}{rs?.estado?.rotulo ? ` · ${rs.estado.rotulo}` : ""}
              </span>
              {total > 0 && (
                <span className="h-2 w-full sm:w-48 rounded-full bg-[var(--bg-tertiary)] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-full bg-[var(--ac)]" style={{ width: `${Math.max(pct, 4)}%` }} />
                </span>
              )}
              {squad && <button onClick={() => setEntregasDe(squad)} className={btnSec}>Acompanhar</button>}
            </div>
          );
        })}

        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar squads">
          {FILTROS.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id} className={chip(filtro === f.id)}>
              {f.rotulo}{f.id === "todas" ? ` (${contagem(f.id)})` : ""}
            </button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-secondary)]">
            <p className="text-4xl opacity-30 mb-2">🤖</p>
            Nenhuma squad {filtro === "todas" ? "ainda" : "neste filtro"}.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">{visiveis.map((s) => cartao(s))}</div>
        )}

        {rascunhos.length > 0 && (
          <section className="rounded-2xl border border-dashed border-[var(--border-light)]">
            <button onClick={() => setRascunhosAbertos((v) => !v)} aria-expanded={rascunhosAbertos}
              className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] cursor-pointer flex items-center gap-2">
              <span>🧪 Rascunhos e testes ({rascunhos.length})</span>
              <span className="hidden sm:inline text-[var(--text-muted)]">· squads de teste e cópias repetidas ficam guardadas aqui, fora da vista</span>
              <span className="ml-auto">{rascunhosAbertos ? "⌄" : "›"}</span>
            </button>
            {rascunhosAbertos && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 pt-0">
                {rascunhos.map(({ squad, motivo }) => cartao(squad, motivo))}
              </div>
            )}
          </section>
        )}
      </div>

      {entregasDe && <EntregasModal squad={entregasDe} jobs={jobs} onFechar={() => setEntregasDe(null)} />}
      {/* Modal — Criar/Editar Squad */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
              <h2 className="font-semibold">{editingSquad ? "Editar Squad" : "Novo Squad"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none cursor-pointer">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Nome + Ícone */}
              <div className="flex gap-3">
                <div className="shrink-0">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Ícone</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    className="input-modern !w-14 text-center text-xl" maxLength={2} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Nome do Squad *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-modern" placeholder="Fábrica de Carrosséis" />
                </div>
              </div>
              {/* Descrição */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-modern resize-none" rows={2}
                  placeholder="Pipeline: Mike pesquisa → Izzy escreve → Felipe design" />
              </div>
              {/* Link */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Link (opcional)</label>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  className="input-modern" placeholder="https://..." />
              </div>
              {/* Modelos / templates fixos da squad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-[var(--text-secondary)]">
                    📚 Modelos / templates fixos ({form.documents.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[11px] px-2 py-1 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? "Enviando..." : "+ Anexar modelo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.zip"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-tight">
                  Arquivos que valem para <strong>todas as execuções</strong> desta squad: modelos institucionais, manuais, padrões SEPLAG, exemplos de referência. Documentos específicos de cada processo (proposta da empresa, carta de exclusividade) vão na hora de iniciar.
                </p>
                {uploadError && (
                  <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded mb-2 whitespace-pre-wrap">
                    {uploadError}
                  </div>
                )}
                {form.documents.length > 0 && (
                  <ul className="space-y-1 max-h-32 overflow-auto bg-[var(--bg-tertiary)] rounded-lg p-2">
                    {form.documents.map((doc) => (
                      <li key={doc.path} className="flex items-center gap-2 text-[11px] group">
                        <span className="text-base shrink-0">
                          {doc.mime_type?.startsWith("image/") ? "🖼️"
                            : doc.mime_type === "application/pdf" ? "📕"
                            : doc.mime_type?.includes("word") ? "📘"
                            : doc.mime_type?.includes("sheet") || doc.mime_type?.includes("excel") ? "📗"
                            : doc.mime_type === "application/zip" ? "🗜️"
                            : "📄"}
                        </span>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); abrirDocumento(doc.path).catch(() => setUploadError("Não consegui abrir o arquivo agora.")); }}
                          className="flex-1 truncate text-[var(--text-primary)] hover:text-[var(--accent)] no-underline"
                          title={doc.name}
                        >
                          {doc.name}
                        </a>
                        <span className="text-[var(--text-muted)] shrink-0 text-[10px]">{formatBytes(doc.size)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc)}
                          className="text-[var(--text-muted)] hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Setores */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-2">Setores onde este squad atua</label>
                <div className="flex flex-wrap gap-2">
                  {CONTEXTS.map(ctx => (
                    <button key={ctx} type="button" onClick={() => toggleContext(ctx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        form.contexts.includes(ctx)
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                      }`}>
                      {CONTEXT_ICONS[ctx]} {ctx}
                      {form.contexts.includes(ctx) && <span className="text-green-400">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              {/* Colaboradores do pipeline */}
              {collaborators.length > 0 && (
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-2">Colaboradores do pipeline <span className="text-[var(--text-muted)]">(em ordem)</span></label>
                  {/* Pipeline preview */}
                  {form.collaborator_ids.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-3 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                      {form.collaborator_ids.map((id, i) => {
                        const c = collaborators.find(x => x.id === id);
                        if (!c) return null;
                        return (
                          <div key={id} className="flex items-center gap-1">
                            <div className="flex flex-col items-center">
                              <Mascote nome={c.name} emoji={c.icon} tamanho={32} />
                              <span className="text-[9px] text-[var(--text-muted)]">{c.name}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 ml-0.5">
                              <button type="button" onClick={() => moveCollaborator(id, -1)} disabled={i === 0}
                                className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer">▲</button>
                              <button type="button" onClick={() => moveCollaborator(id, 1)} disabled={i === form.collaborator_ids.length - 1}
                                className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer">▼</button>
                            </div>
                            {i < form.collaborator_ids.length - 1 && (
                              <span className="text-[var(--text-muted)] text-xs mx-0.5">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Seletor */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {collaborators.map(c => {
                      const selected = form.collaborator_ids.includes(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => toggleCollaborator(c.id)}
                          className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-center cursor-pointer transition-all border text-xs ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : "border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg-primary)]"
                          }`}>
                          <Mascote nome={c.name} emoji={c.icon} tamanho={36} />
                          <span className="text-[10px] truncate w-full">{c.name}</span>
                          {selected && <span className="text-green-400 text-[9px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-5 shrink-0 border-t border-[var(--border)] pt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || form.contexts.length === 0}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? "Salvando..." : editingSquad ? "Salvar" : "Criar Squad"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal — Iniciar Squad (componente reutilizável) */}
      <StartSquadModal
        squad={runningSquad}
        open={showRunModal}
        onClose={() => { setShowRunModal(false); atualizaVivo(); }}
      />
    </div>
  );
}

// ── Entregas: rodadas recentes da squad e os arquivos que ela deixou ──
function EntregasModal({ squad, jobs, onFechar }: { squad: Squad; jobs: JobResumo[]; onFechar: () => void }) {
  const code = codigoDaSquad(squad.link);
  const meus = jobs.filter((j) => j.squad === code);
  const [arquivos, setArquivos] = useState<{ name: string; size: number }[] | null>(null);
  const ref = meus.find((j) => j.status === "completed") || meus[0];
  useEffect(() => {
    if (!ref) { setArquivos([]); return; }
    squadFetch(`/api/jobs/${ref.jobId}/files`).then((r) => r.json()).then((d) => setArquivos(d.files || [])).catch(() => setArquivos([]));
  }, [ref]);
  const abrir = async (nome: string) => {
    if (!ref) return;
    const r = await squadFetch(`/api/jobs/${ref.jobId}/files/${encodeURIComponent(nome)}`);
    const url = URL.createObjectURL(await r.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const estado: Record<string, string> = { completed: "concluída", running: "rodando", failed: "falhou", paused: "pausada", interrupted: "interrompida" };
  return (
    <Janela titulo={`Entregas · ${squad.name}`} subtitulo="O que essa squad já rodou e o que deixou pronto" onFechar={onFechar} largura="media">
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Rodadas recentes</h3>
          {meus.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Ainda não rodou de verdade.</p> : (
            <ul className="divide-y divide-[var(--border)]">
              {meus.slice(0, 8).map((j) => (
                <li key={j.jobId} className="py-2 flex items-baseline gap-3 text-sm">
                  <span className="text-[var(--text-muted)] shrink-0 w-20">{quandoCurto(j.completedAt || j.startedAt)}</span>
                  <span className="flex-1 min-w-0 truncate text-[var(--text-primary)]">{j.topic}</span>
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">{estado[j.status] || j.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Arquivos na pasta de saída</h3>
          {arquivos === null ? <p className="text-sm text-[var(--text-muted)]">carregando…</p>
            : arquivos.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhum arquivo por aqui.</p> : (
            <ul className="flex flex-wrap gap-2">
              {arquivos.map((a) => (
                <li key={a.name}><button onClick={() => abrir(a.name)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] cursor-pointer">{a.name}</button></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Janela>
  );
}
