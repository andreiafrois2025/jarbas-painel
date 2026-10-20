"use client";

// 💬 Chat do painel: conversa com o Jarbas e com cada funcionário.
// Backend: squad-api /api/chat/* (Claude só leitura; ações só com o botão Confirmar).

import Mascote from "./Mascote";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatApi, obraApi, dividirResposta, enviarMensagem, type Acao, type Agente, type Assunto, type ConversaResumo, type EstadoObra, type Mensagem, type ModeloOpcao, type Uso } from "@/lib/chat";
import { usePainel } from "@/lib/painel-context";
import type { Collaborator } from "@/lib/types";
import { ehColaboradorOculto } from "@/lib/modo";
import TextoSeguro from "./chat/TextoSeguro";
import Visuais from "./chat/Visuais";
import { MenuHabilidades, ChipHabilidade } from "./chat/MenuHabilidades";
import { Bastidores, BotaoDesfazer, CartaoArquivoObra, CartoesPosso } from "./chat/ModoObra";
import { AVISO_OBRA, detectarHabilidadeFalada, filtrarHabilidades, gatilhoBarra, useHabilidadesChat, type HabChat } from "@/lib/habilidadesChat";

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Ordem por afinidade (baseada na tabela "quando chamar cada um" do jarbas.md). Quem não estiver aqui cai no fim.
const GRUPOS: { rotulo?: string; ids: string[] }[] = [
  { ids: ["jarbas"] },
  { rotulo: "Conteúdo", ids: ["izzy", "felipe", "theo"] },
  { rotulo: "Jurídico e licitação", ids: ["katrina", "harvey"] },
  { rotulo: "Rotina e finanças", ids: ["donna", "louis"] },
  { rotulo: "Dados e mapas", ids: ["eric", "tonny"] },
  { rotulo: "Pesquisa e estratégia", ids: ["mike", "rafaela", "sofia"] },
  { rotulo: "Tecnologia", ids: ["junior"] },
  { rotulo: "Pessoas e bem-estar", ids: ["nara", "lara"] },
];

function Avatar({ a, tamanho = 36 }: { a?: Agente; tamanho?: number }) {
  return <Mascote nome={a?.nome} emoji={a?.emoji} tamanho={tamanho} />;
}

interface Previa { texto: string; ts: string; minha?: boolean }

const TZ = "America/Sao_Paulo";
const diaBR = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // AAAA-MM-DD

// Horário estilo WhatsApp: hoje = hora, ontem = "ontem", antes = dd/mm.
function horaLista(iso: string): string {
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  const agora = new Date();
  if (diaBR(d) === diaBR(agora)) return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);
  if (diaBR(d) === diaBR(new Date(agora.getTime() - 864e5))) return "ontem";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(d);
}

function ListaAgentes({ agentes, ativo, previas, recolhida, onAlternar, aoEscolher, cabecalho, className = "" }: {
  agentes: Agente[]; ativo: string; previas: Record<string, Previa>; recolhida: boolean;
  onAlternar: () => void; aoEscolher: (id: string) => void; cabecalho?: React.ReactNode; className?: string;
}) {
  // Entre 768 e 1024px (telas médias) a lista fica sempre recolhida para sobrar largura ao chat.
  const fina = recolhida ? "md:w-[76px]" : "md:w-[260px] md:max-lg:w-[76px]";
  const esconde = recolhida ? "md:hidden" : "md:max-lg:hidden";
  return (
    <aside aria-label="Agentes" className={`${fina} max-md:flex-1 shrink-0 min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] ${className}`}>
      {cabecalho && <div className="md:hidden shrink-0">{cabecalho}</div>}
      <div className="hidden md:flex lg:flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
        <span className={`${esconde} text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]`}>Conversas</span>
        <button onClick={onAlternar} aria-label={recolhida ? "Mostrar nomes dos agentes" : "Recolher a lista de agentes"} title={recolhida ? "Mostrar nomes" : "Recolher"}
          className="max-lg:hidden mx-auto lg:mx-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={recolhida ? "rotate-180" : ""}><path d="M12 5l-5 5 5 5" /></svg>
        </button>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto p-2 pb-6 space-y-0.5 m-0 list-none" aria-label="Pessoas da equipe">
        {agentes.map((a) => {
          const pv = previas[a.id]; const on = a.id === ativo;
          return (
            <li key={a.id}>
              <button onClick={() => aoEscolher(a.id)} aria-current={on ? "true" : undefined} title={a.nome}
                className={`w-full text-left rounded-xl p-2 flex items-center gap-3 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${recolhida ? "md:justify-center" : "md:max-lg:justify-center"} ${on ? "bg-[var(--accent-soft)] md:ring-1 md:ring-[var(--ac)]/40" : "hover:bg-[var(--bg-tertiary)]"}`}>
                <Mascote nome={a.nome} emoji={a.emoji} tamanho={44} />
                <span className={`${esconde} min-w-0 flex-1`}>
                  <span className="flex items-baseline gap-2">
                    <span className="flex-1 min-w-0 truncate text-sm font-bold text-[var(--text-primary)]">{a.nome}</span>
                    {pv && <span className="shrink-0 text-[11px] text-[var(--text-secondary)] tabular-nums">{horaLista(pv.ts)}</span>}
                  </span>
                  <span className="block truncate text-[12.5px] text-[var(--text-secondary)]">{a.cargo}</span>
                </span>
              </button>
            </li>
          );
        })}
        {!agentes.length && <li className="p-3 text-sm text-[var(--text-muted)]">Carregando equipe…</li>}
      </ul>
    </aside>
  );
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}><path d="M5 8l5 5 5-5" /></svg>
  );
}

// Descrição vinda do RH (tabela collaborators, a mesma da página Equipe): muda lá, muda aqui.
function DescricaoRH({ c, fallback }: { c?: Collaborator; fallback: string }) {
  const bloco = (rot: string, v?: string) => v ? <div><span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{rot}</span><p className="text-xs text-[var(--text-primary)] mt-0.5">{v}</p></div> : null;
  if (!c || !(c.specialization || c.skills || c.personality || c.bio)) return <p className="text-xs text-[var(--text-muted)]">{fallback}</p>;
  return <div className="space-y-1.5">{bloco("🎓 Especialização", c.specialization)}{bloco("🛠️ Habilidades", c.skills)}{bloco("🧠 Personalidade", c.personality)}{bloco("📋 Bio", c.bio)}</div>;
}

// `compacto`: usado na tela Conversa (painel v2). Sem a lista lateral de pessoas
// (a escolha vira um seletor no topo), caixa de texto grande embaixo.
// `servidora` (modo Só Igam): sem agentes pessoais e sem abrir conversa antiga,
// porque o histórico pode citar assunto de casa.
// `agenteFixo` (19/10/2026, Escritório): chat embutido ao lado dos bonequinhos, já com o agente escolhido,
// sem a lista de pessoas; a seta de voltar chama `aoFechar`.
export default function ChatPage({ compacto = false, servidora = false, cabecalho, agenteFixo, aoFechar }: { compacto?: boolean; servidora?: boolean; cabecalho?: React.ReactNode; agenteFixo?: string; aoFechar?: () => void }) {
  const { collaborators } = usePainel();
  const perfilDe = useCallback((a?: Agente) => (a ? collaborators.find((c) => c.name.trim().toLowerCase() === a.nome.toLowerCase()) : undefined), [collaborators]);
  const [abertos, setAbertos] = useState<Set<string>>(new Set()); // itens da lista com a descrição aberta
  const alternarItem = (id: string) => setAbertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [modelos, setModelos] = useState<ModeloOpcao[]>([]);
  const [modeloSel, setModeloSel] = useState("haiku");
  const [assuntos, setAssuntos] = useState<Assunto[]>([]);
  const [painelAssuntos, setPainelAssuntos] = useState(false);
  const [fixarAssunto, setFixarAssunto] = useState<string | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteId, setAgenteId] = useState("jarbas");
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [fluxo, setFluxo] = useState(""); // resposta chegando aos poucos
  const [status, setStatus] = useState("");
  const [tarefaViva, setTarefaViva] = useState<string | null>(null); // tarefa de obra em andamento (O2/O3)
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [uso, setUso] = useState<Uso | null>(null);
  // ── Modo obra (só o Jarbas): estado vem do servidor; o relógio só atualiza o "1h52" na tela ──
  const [obra, setObra] = useState<EstadoObra | null>(null);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  const obraDisponivel = agenteId === "jarbas" && !servidora;
  const obraLigada = obraDisponivel && !!obra?.ligado;
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<{ id: string; nome: string }[]>([]);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  // Lista lateral de agentes (modo compacto): recolhida mostra só as fotos; no celular
  // a lista é a primeira tela e o chat abre ao tocar num agente.
  const [recolhida, setRecolhida] = useState(false);
  const [telaCelular, setTelaCelular] = useState<"lista" | "chat">(agenteFixo ? "chat" : "lista");
  useEffect(() => { if (agenteFixo) { setAgenteId(agenteFixo); setTelaCelular("chat"); } }, [agenteFixo]);
  // Celular: placeholder curto, cabe em uma linha
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const ler = () => setCelular(mq.matches);
    ler(); mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);
  const [previas, setPrevias] = useState<Record<string, Previa>>({});
  const fim = useRef<HTMLDivElement>(null);
  const ctl = useRef<AbortController | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Menu "/" de habilidades ──
  const { lista: habilidades, pronto: habilidadesProntas } = useHabilidadesChat(servidora);
  const [habSel, setHabSel] = useState<string | null>(null); // id da habilidade escolhida (etiqueta na caixa)
  const habilidadeSel = useMemo(() => habilidades.find((h) => h.id === habSel) ?? null, [habilidades, habSel]);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);
  const [menuFechadoEm, setMenuFechadoEm] = useState<number | null>(null); // Esc fecha o menu desse "/" até digitar outro
  const [idxMenu, setIdxMenu] = useState(0);
  const gatilho = useMemo(() => gatilhoBarra(texto, cursor), [texto, cursor]);
  const opcoesMenu = useMemo(() => (gatilho ? filtrarHabilidades(habilidades, gatilho.consulta) : []), [gatilho, habilidades]);
  // sem nenhum resultado para o que ela digitou (ex.: um caminho "/root/x"), o menu some em vez de atrapalhar
  const menuAberto = !!gatilho && gatilho.inicio !== menuFechadoEm && (opcoesMenu.length > 0 || (!gatilho.consulta && !habilidadesProntas));
  useEffect(() => { setIdxMenu(0); }, [gatilho?.consulta]);
  const habFalada = useMemo(() => (habilidadeSel || menuAberto ? null : detectarHabilidadeFalada(texto, habilidades)), [habilidadeSel, menuAberto, texto, habilidades]);

  const escolherHabilidade = (h: HabChat) => {
    if (!gatilho) return;
    let antes = texto.slice(0, gatilho.inicio); let depois = texto.slice(cursor);
    if (antes.endsWith(" ") && depois.startsWith(" ")) depois = depois.slice(1);
    if (!antes.trim() && depois.startsWith(" ")) depois = depois.trimStart();
    setTexto(antes + depois); setHabSel(h.id); setMenuFechadoEm(null);
    const pos = antes.length; setCursor(pos);
    requestAnimationFrame(() => { const c = campoRef.current; if (c) { c.focus(); c.setSelectionRange(pos, pos); } });
  };
  const tirarHabilidade = () => { setHabSel(null); requestAnimationFrame(() => campoRef.current?.focus()); };

  const agente = useMemo(() => agentes.find((a) => a.id === agenteId), [agentes, agenteId]);
  const grupos = useMemo(() => {
    const usados = new Set<string>();
    const gs = GRUPOS.map((g) => ({ rotulo: g.rotulo, itens: g.ids.map((id) => agentes.find((a) => a.id === id)).filter((a): a is Agente => !!a) }));
    gs.forEach((g) => g.itens.forEach((a) => usados.add(a.id)));
    const resto = agentes.filter((a) => !usados.has(a.id));
    if (resto.length) gs.splice(gs.length - 1, 0, { rotulo: "Outros", itens: resto }); // antes do último grupo
    return gs.filter((g) => g.itens.length);
  }, [agentes]);
  // Lista lateral (pedido de 20/10): Jarbas fixo no topo, Nara e Lara sempre no fim; os demais pela conversa mais
  // recente (quem ela falou por último sobe). Quem nunca conversou fica na ordem por afinidade dos GRUPOS.
  const ordem = useMemo(() => {
    const base = grupos.flatMap((g) => g.itens);
    const fixosFim = ["nara", "lara"];
    const meio = base.filter((a) => a.id !== "jarbas" && !fixosFim.includes(a.id));
    const ts = (id: string) => (previas[id] ? new Date(previas[id].ts).getTime() || 0 : 0);
    meio.sort((a, b) => ts(b.id) - ts(a.id) || base.indexOf(a) - base.indexOf(b));
    return [...base.filter((a) => a.id === "jarbas"), ...meio, ...fixosFim.map((id) => base.find((a) => a.id === id)).filter((a): a is Agente => !!a)];
  }, [grupos, previas]);
  useEffect(() => { try { setRecolhida(window.localStorage.getItem("chatListaRecolhida") === "1"); } catch { /* sem storage */ } }, []);
  const alternarLista = () => setRecolhida((v) => { try { window.localStorage.setItem("chatListaRecolhida", v ? "0" : "1"); } catch { /* sem storage */ } return !v; });
  // Prévia = última mensagem e hora da conversa mais recente de cada agente (como no WhatsApp). No modo Só Igam não
  // lê histórico (pode citar assunto de casa), então a lista fica só com nome e foto.
  useEffect(() => {
    if (!compacto || servidora || !agentes.length) return;
    let vivo = true;
    // um pedido só pra todos (já vem da mais recente pra mais antiga): fica a 1ª de cada agente
    chatApi.conversas().then((cs) => {
      if (!vivo) return;
      const pv: Record<string, Previa> = {};
      for (const c of cs) if (!pv[c.agente]) pv[c.agente] = { texto: c.ultima?.texto || c.titulo, ts: c.atualizada, minha: c.ultima?.minha };
      setPrevias((p) => ({ ...p, ...pv }));
    }).catch(() => {});
    return () => { vivo = false; };
  }, [compacto, servidora, agentes]);
  const [dicaAberta, setDicaAberta] = useState(true);
  useEffect(() => { try { setDicaAberta(window.localStorage.getItem("chatDica") !== "0"); } catch { /* sem storage */ } }, []);
  const alternarDica = () => setDicaAberta((v) => { try { window.localStorage.setItem("chatDica", v ? "0" : "1"); } catch { /* sem storage */ } return !v; });

  // inicial: lista de pessoas, uso e o último funcionário usado neste aparelho
  useEffect(() => {
    try {
      // ?agente=izzy (vindo do Escritório) vale mais que o último agente do aparelho
      const pedido = new URLSearchParams(window.location.search).get("agente");
      const s = agenteFixo || (pedido && /^[a-z]{3,10}$/.test(pedido) ? pedido : window.localStorage.getItem("chatAgente"));
      if (s) setAgenteId(s);
      // ?texto=... (ex.: "+ Nova squad") deixa a mensagem escrita, pronta para ela completar
      const rascunho = new URLSearchParams(window.location.search).get("texto");
      if (rascunho) setTexto(rascunho.slice(0, 8000));
      if (pedido || rascunho) setTelaCelular("chat");
    } catch { /* sem storage */ }
    chatApi.agentes().then((as) => setAgentes(servidora ? as.filter((a) => !ehColaboradorOculto(a.nome) && a.id !== "louis") : as)).catch((e) => setErro(e.message));
    chatApi.uso().then(setUso).catch(() => {});
    chatApi.modelos().then(setModelos).catch(() => {});
  }, []);

  const conversaIdRef = useRef<string | null>(null);
  useEffect(() => { conversaIdRef.current = conversaId; }, [conversaId]);
  const pedidoConversa = useRef(0); // só a última conversa pedida vale (troca rápida de agente não mistura)
  const abrirConversa = useCallback(async (id: string) => {
    const n = ++pedidoConversa.current;
    try { const c = await chatApi.conversa(id); if (n !== pedidoConversa.current) return; setConversaId(id); setMsgs(c.mensagens); setAssuntos(c.assuntos || []); setModeloSel(c.modelo); setErro(""); } catch (e) { setErro((e as Error).message); }
  }, []);

  // ao trocar de pessoa: abre a conversa mais recente dela (ou uma em branco)
  useEffect(() => {
    if (!agentes.length) return;
    try { window.localStorage.setItem("chatAgente", agenteId); } catch { /* sem storage */ }
    pedidoConversa.current++; setConversaId(null); setMsgs([]); setFluxo(""); setErro(""); setAnexos([]); setAssuntos([]); setFixarAssunto(null); setHabSel(null);
    setModeloSel(agenteId === "jarbas" ? "opus" : "haiku");
    // 20/10: às vezes a conversa voltava vazia ao navegar pelo painel e só aparecia reabrindo a aba (pedido falho
    // em silêncio ou resposta de um agente anterior chegando atrasada). Agora: ignora resposta velha, tenta de novo
    // e, se a aba voltar a ficar visível com a conversa vazia, carrega outra vez.
    let vivo = true;
    const carregar = (tentativa = 0) => chatApi.conversas(agenteId).then((cs) => {
      if (!vivo) return;
      setConversas(cs); if (cs[0] && !servidora) abrirConversa(cs[0].id);
    }).catch((e) => { if (!vivo) return; if (tentativa < 2) setTimeout(() => vivo && carregar(tentativa + 1), 1500 * (tentativa + 1)); else setErro(e.message); });
    carregar();
    const aoVoltar = () => { if (document.visibilityState === "visible" && !conversaIdRef.current && !servidora) carregar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { vivo = false; document.removeEventListener("visibilitychange", aoVoltar); };
  }, [agenteId, agentes.length, abrirConversa, servidora]);

  useEffect(() => {
    if (!obraDisponivel) { setObra(null); return; }
    let vivo = true;
    const ler = () => obraApi.estado().then((e) => { if (vivo) setObra(e); }).catch(() => {});
    ler();
    const t = setInterval(() => { setAgoraMs(Date.now()); ler(); }, 30000);
    return () => { vivo = false; clearInterval(t); };
  }, [obraDisponivel]);

  // Ao abrir uma conversa vai direto pra última mensagem; depois, novas mensagens rolam suave
  const pularFim = useRef(true);
  useEffect(() => { pularFim.current = true; }, [conversaId, agenteId, telaCelular]);
  useEffect(() => {
    const salto = pularFim.current && msgs.length > 0;
    if (salto) pularFim.current = false;
    const ir = () => fim.current?.scrollIntoView({ behavior: salto ? "auto" : "smooth", block: "end" });
    ir(); if (salto) requestAnimationFrame(() => setTimeout(ir, 60));
  }, [msgs, fluxo, status, telaCelular]);

  const enviar = useCallback(async (conteudo: string, assuntoIdParam?: string) => {
    const m = conteudo.trim() || (anexos.length ? "Veja o anexo." : "");
    if (!m || ocupado) return;
    setErro(""); setOcupado(true); setFluxo(""); setStatus("pensando…");
    const idsAnexos = anexos.map((a) => a.id);
    setPrevias((p) => ({ ...p, [agenteId]: { texto: m, ts: new Date().toISOString(), minha: true } })); // sobe na lista
    const assuntoEnvio = assuntoIdParam ?? fixarAssunto ?? undefined;
    const habEnvio = habSel ?? undefined;
    setMsgs((x) => [...x, { id: "tmp-" + Date.now(), papel: "user", texto: m, ts: new Date().toISOString(), anexos, habilidade: habEnvio }]);
    setTexto(""); setAnexos([]); setFixarAssunto(null); setHabSel(null);
    ctl.current = new AbortController();
    let acumulado = ""; let idConv = conversaId;
    await enviarMensagem({ agente: agenteId, conversaId: conversaId ?? undefined, mensagem: m, anexos: idsAnexos, modelo: modeloSel, assuntoId: assuntoEnvio, habilidade: habEnvio, modo: servidora ? "servidora" : undefined }, {
      onMeta: (meta) => { idConv = meta.conversaId; setConversaId(meta.conversaId); },
      onAssunto: (a) => { if (a.novo) setStatus("novo assunto: " + a.titulo); },
      onModelo: (mm) => { setModeloSel(mm.chave); setMsgs((x) => [...x, mm.mensagem]); },
      onDelta: (t) => { acumulado += t; setFluxo(acumulado); setStatus(""); },
      onStatus: setStatus,
      onObra: (o) => setTarefaViva(o.tarefa),
      onDone: (d) => { setUso(d.uso); },
      onErro: (e) => { setErro(e); },
    }, ctl.current.signal);
    setFluxo(""); setStatus(""); setOcupado(false); setTarefaViva(null); ctl.current = null;
    // o servidor é a fonte da verdade (assuntos, etiquetas, resposta interrompida): recarrega a conversa
    if (idConv) { try { const c = await chatApi.conversa(idConv); setMsgs(c.mensagens); setAssuntos(c.assuntos || []); setModeloSel(c.modelo); } catch { /* mantém o que está na tela */ } }
    chatApi.conversas(agenteId).then(setConversas).catch(() => {});
    chatApi.uso().then(setUso).catch(() => {});
    if (obraDisponivel) obraApi.estado().then(setObra).catch(() => {});
  }, [obraDisponivel, ocupado, anexos, agenteId, conversaId, modeloSel, fixarAssunto, habSel, servidora]);

  // seletor de modelo: com conversa aberta troca no servidor; sem conversa, vale para a primeira mensagem
  const escolherModelo = async (chave: string) => {
    const op = modelos.find((x) => x.chave === chave); if (!op) return;
    const aviso = `Trocando para ${op.rotulo.replace(/^Claude /, "")} nesta conversa.` + (op.aviso ? " " + op.aviso : "");
    setModeloSel(chave);
    const sis: Mensagem = { id: "sis-" + Date.now(), papel: "sistema", texto: aviso, ts: new Date().toISOString() };
    if (conversaId) { try { await chatApi.trocarModelo(conversaId, chave); } catch (e) { setErro((e as Error).message); return; } }
    setMsgs((x) => [...x, sis]);
  };

  const moverMsg = async (mensagemId: string, assuntoId: string, titulo?: string) => {
    if (!conversaId) return;
    try { const r = await chatApi.mover(conversaId, mensagemId, assuntoId, titulo); setMsgs(r.mensagens); setAssuntos(r.assuntos); } catch (e) { setErro((e as Error).message); }
  };
  const arquivarAssunto = async (id: string, arquivado: boolean) => {
    if (!conversaId) return;
    try { setAssuntos(await chatApi.assunto(conversaId, id, { arquivado })); if (arquivado && fixarAssunto === id) setFixarAssunto(null); } catch (e) { setErro((e as Error).message); }
  };

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

  const anexar = async (arqs: FileList | File[] | null) => {
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

  // teclado da caixa: com o menu aberto, setas/Enter/Tab/Esc são do menu; senão Enter envia
  const teclas = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuAberto && opcoesMenu.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdxMenu((i) => (i + 1) % opcoesMenu.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdxMenu((i) => (i - 1 + opcoesMenu.length) % opcoesMenu.length); return; }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") { e.preventDefault(); escolherHabilidade(opcoesMenu[Math.min(idxMenu, opcoesMenu.length - 1)]); return; }
    }
    if (e.key === "Escape" && gatilho) { e.preventDefault(); setMenuFechadoEm(gatilho.inicio); return; }
    if (e.key === "Backspace" && habSel && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) { e.preventDefault(); setHabSel(null); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); }
  };
  const aoDigitar = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setTexto(e.target.value); setCursor(e.target.selectionStart); };
  const camposHab = {
    ref: campoRef, onChange: aoDigitar, onKeyDown: teclas,
    // Ctrl+V de imagem (print recortado) ou arquivo copiado vira anexo; texto colado segue normal
    onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const arqs = Array.from(e.clipboardData.items).filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter((f): f is File => !!f);
      if (!arqs.length) return;
      e.preventDefault();
      const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
      anexar(arqs.map((f, n) => f.name && f.name !== "image.png" ? f : new File([f], `imagem-colada-${hora}${n ? "-" + n : ""}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type })));
    },
    onDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); },
    onDrop: (e: React.DragEvent<HTMLTextAreaElement>) => { if (e.dataTransfer.files.length) { e.preventDefault(); anexar(e.dataTransfer.files); } },
    onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => setCursor(e.currentTarget.selectionStart),
    role: "combobox" as const, "aria-expanded": menuAberto, "aria-controls": "menu-habilidades", "aria-autocomplete": "list" as const,
    "aria-activedescendant": menuAberto && opcoesMenu.length ? `menu-habilidades-${Math.min(idxMenu, opcoesMenu.length - 1)}` : undefined,
  };
  const menuNode = menuAberto ? <MenuHabilidades itens={opcoesMenu} ativo={Math.min(idxMenu, Math.max(opcoesMenu.length - 1, 0))} consulta={gatilho?.consulta ?? ""} carregando={!habilidadesProntas}
    aoEscolher={escolherHabilidade} aoPassar={setIdxMenu} idLista="menu-habilidades" obraLigada={obraLigada} /> : null;
  const chipNode = habilidadeSel ? <ChipHabilidade h={habilidadeSel} aoRemover={tirarHabilidade} /> : null;
  const avisosHab = (<>
    {habilidadeSel?.obra && !obraLigada && <p role="status" className="text-[12.5px] mt-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">🔒 {AVISO_OBRA}</p>}
    {habFalada && <p className="mt-2"><button type="button" onClick={() => setHabSel(habFalada.id)} className="text-[12.5px] font-bold rounded-full px-3 py-1 border border-[var(--ac)]/50 bg-[var(--accent-soft)] text-[var(--text-primary)] hover:brightness-95 cursor-pointer">usar {habFalada.icone} {habFalada.rotulo.toLowerCase()}?</button></p>}
  </>);

  const limiteBatido = !!uso && (uso.hora.usadas >= uso.hora.limite || uso.dia.usadas >= uso.dia.limite);

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* ===== LISTA DE PESSOAS ===== */}
      {!compacto && <aside className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col min-h-0 md:max-h-none">
        <button className="md:hidden flex items-center justify-between px-4 py-2 text-sm cursor-pointer" onClick={() => setListaAberta(!listaAberta)} aria-expanded={listaAberta}>
          <span className="flex items-center gap-2">{agente ? <><Avatar a={agente} tamanho={28} />{agente.nome}</> : "Escolher"}</span><span>{listaAberta ? "▲" : "▼ trocar"}</span>
        </button>
        <div className={`${listaAberta ? "block" : "hidden"} md:block overflow-y-auto max-h-[50vh] md:max-h-none p-2`} aria-label="Pessoas da equipe">
          {grupos.map((g, gi) => (
            <div key={gi} className={gi ? "mt-3" : ""}>
              {g.rotulo && <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{g.rotulo}</p>}
              <ul className="space-y-0.5">
                {g.itens.map((a) => (
                  <li key={a.id} className={`relative rounded-xl transition-colors ${a.id === agenteId ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)]"}`}>
                    <button onClick={() => { setAgenteId(a.id); setListaAberta(false); }} aria-current={a.id === agenteId ? "true" : undefined}
                      className="w-full text-left p-2 pr-9 rounded-xl cursor-pointer flex gap-3 items-center focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                      <Avatar a={a} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[var(--text-primary)] truncate">{a.nome} <span className="font-normal text-[10px] text-[var(--text-muted)]">· {a.modelo}</span></span>
                        <span className="block text-xs text-[var(--text-secondary)] truncate">{perfilDe(a)?.specialization || a.cargo}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => alternarItem(a.id)} aria-expanded={abertos.has(a.id)} aria-controls={`desc-${a.id}`}
                      aria-label={`${abertos.has(a.id) ? "Recolher" : "Ver"} a descrição de ${a.nome}`}
                      className="absolute top-2 right-2 w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer">
                      <Chevron aberto={abertos.has(a.id)} />
                    </button>
                    <div id={`desc-${a.id}`} aria-hidden={!abertos.has(a.id)} className={`grid transition-[grid-template-rows] duration-200 ease-out ${abertos.has(a.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden"><div className="pl-14 pr-3 pb-2.5 pt-0.5"><DescricaoRH c={perfilDe(a)} fallback={a.cargo} /></div></div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!agentes.length && !erro && <p className="p-3 text-sm text-[var(--text-muted)]">Carregando equipe…</p>}
        </div>
      </aside>}

      {/* ===== LISTA DE AGENTES (estilo WhatsApp) ===== */}
      {compacto && !agenteFixo && (
        <ListaAgentes agentes={ordem} ativo={agenteId} previas={previas} recolhida={recolhida} onAlternar={alternarLista}
          aoEscolher={(id) => { setAgenteId(id); setTelaCelular("chat"); }} cabecalho={cabecalho}
          className={telaCelular === "chat" ? "max-md:hidden" : ""} />
      )}

      {/* ===== CONVERSA ===== */}
      <section className={`flex-1 min-w-0 min-h-0 flex flex-col ${compacto && telaCelular === "lista" ? "max-md:hidden" : ""}`}>
        {/* 18/10: cabeçalho (saudação + agente) em faixa de outra cor, para não se misturar com a área das mensagens */}
        {compacto && cabecalho && <div className="max-md:hidden shrink-0 bg-[var(--bg-secondary)]">{cabecalho}</div>}
        <header className={`flex items-center gap-3 flex-wrap ${compacto ? "px-4 md:px-6 2xl:px-10 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] shadow-[0_2px_8px_var(--sombra)] relative z-[1]" : "px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]"}`}>
          {compacto ? (
            <div className="flex items-center gap-2 flex-1 basis-40 min-w-0">
              <button onClick={() => (aoFechar ? aoFechar() : setTelaCelular("lista"))} aria-label={aoFechar ? "Fechar a conversa" : "Voltar para a lista de agentes"}
                className={`${aoFechar ? "" : "md:hidden "}h-10 w-10 -ml-2 shrink-0 inline-flex items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <span className={aoFechar ? "" : "md:hidden"}><Avatar a={agente} tamanho={32} /></span>
              <div className="min-w-0">
                <p className="m-0 text-sm font-bold text-[var(--text-primary)] leading-tight truncate">{agente?.nome ?? "Chat"}</p>
                <p className="m-0 text-xs text-[var(--text-secondary)] truncate">{perfilDe(agente)?.specialization || agente?.cargo}</p>
              </div>
            </div>
          ) : <>
          <Avatar a={agente} tamanho={40} />
          <div className="min-w-0 flex-1 basis-48">
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">{agente?.nome ?? "Chat"}</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate">{perfilDe(agente)?.specialization || agente?.cargo}</p>
            {agente && dicaAberta && (perfilDe(agente)?.bio || perfilDe(agente)?.skills) && <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">{perfilDe(agente)?.bio || perfilDe(agente)?.skills}</p>}
          </div>
          {agente && (perfilDe(agente)?.bio || perfilDe(agente)?.skills) && <button onClick={alternarDica} aria-expanded={dicaAberta} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline-offset-2 hover:underline cursor-pointer">{dicaAberta ? "recolher descrição" : "ver descrição"}</button>}
          </>}
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="sr-only md:not-sr-only">Modelo</span>
            <select value={modeloSel} onChange={(e) => escolherModelo(e.target.value)} disabled={ocupado} aria-label="Modelo que responde nesta conversa"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] cursor-pointer disabled:opacity-50">
              <optgroup label="Claude">
                {modelos.filter((m) => m.motor === "claude").map((m) => <option key={m.chave} value={m.chave}>{m.rotulo.replace(/^Claude /, "")}{m.chave === (agenteId === "jarbas" ? "opus" : "haiku") ? " (padrão)" : ""}</option>)}
              </optgroup>
              {modelos.some((m) => m.motor === "codex") && (
                <optgroup label="GPT (Codex)">
                  {modelos.filter((m) => m.motor === "codex").map((m) => <option key={m.chave} value={m.chave} disabled={!!m.indisponivel} title={m.indisponivel || undefined}>{m.rotulo}{m.indisponivel ? " (indisponível)" : ""}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          {/* 19/10: sem botão 🔨 nem código — o chat usa as "mãos" sozinho quando o pedido precisa */}
          {uso && (
            <span className={`${compacto ? "hidden md:inline" : ""} text-xs px-2 py-1 rounded-lg border ${uso.aviso ? "border-[var(--warning)] bg-[var(--warning)]/15" : "border-[var(--border)]"} text-[var(--text-secondary)]`}
              title="Cada mensagem gasta uma parte da assinatura do Claude">
              Hora {uso.hora.usadas}/{uso.hora.limite} · Hoje {uso.dia.usadas}/{uso.dia.limite}
            </span>
          )}
          {servidora ? null : agente?.assuntosAuto ? (
            <button onClick={() => setPainelAssuntos(!painelAssuntos)} aria-expanded={painelAssuntos} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
              📁 Assuntos ({assuntos.filter((a) => !a.arquivado).length})
            </button>
          ) : (
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
          )}
        </header>

        {uso?.aviso && <div role="status" className="px-4 py-2 text-sm bg-[var(--warning)]/20 text-[var(--text-primary)] border-b border-[var(--warning)]">⚠️ {uso.aviso}</div>}

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {agente?.assuntosAuto && painelAssuntos && (
          <PainelAssuntos assuntos={assuntos} msgs={msgs} fixado={fixarAssunto} onFixar={setFixarAssunto} onArquivar={arquivarAssunto} />
        )}
        <div className={`flex-1 min-w-0 min-h-0 overflow-y-auto py-4 space-y-4 ${compacto ? "px-4 md:px-6 2xl:px-10" : "px-4"}`} aria-live="polite">
          {!msgs.length && !ocupado && agente && (
            compacto ? (
              <p className="text-sm text-[var(--text-secondary)] mt-2">Fale ou escreva abaixo. {agente.nome} responde aqui, e o que precisar da sua aprovação aparece como cartão.</p>
            ) : (
            <div className="max-w-xl mx-auto text-center text-[var(--text-secondary)] mt-10">
              <div className="flex justify-center mb-2"><Avatar a={agente} tamanho={72} /></div>
              <p className="font-semibold text-[var(--text-primary)]">Converse com {agente.nome}</p>
            </div>)
          )}
          {msgs.map((m) => (
            <Balao key={m.id} m={m} agente={agente} habilidades={habilidades} ocupado={ocupado} onEscolha={enviar} onAcao={(i, c) => decidir(m, i, c)}
              assuntos={agente?.assuntosAuto ? assuntos : undefined} onMover={moverMsg} />
          ))}
          {(ocupado || fluxo) && (
            <div className="flex gap-2 items-start">
              <div className="max-w-[min(48rem,100%)] rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2.5">
                {fluxo ? <Resposta texto={fluxo} andamento onEscolha={(t) => enviar(t)} desativado /> : <p className="text-sm text-[var(--text-muted)] animate-pulse">{status || "pensando…"}</p>}
                {fluxo && status && <p className="text-xs text-[var(--text-muted)] mt-1 animate-pulse">{status}</p>}
                {tarefaViva && <Bastidores tarefa={tarefaViva} vivo />}
              </div>
            </div>
          )}
          {ocupado && obraLigada && !!obra?.o2 && <CartoesPosso ativo />}
          {erro && <p role="alert" className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">{erro}</p>}
          <div ref={fim} />
        </div>
        </div>

        {/* ===== CAIXA DE ENVIO ===== */}
        <footer className={compacto ? "px-4 md:px-6 2xl:px-10 pt-2 pb-3 md:pb-5 shrink-0" : "border-t border-[var(--border)] bg-[var(--bg-secondary)] p-3"}>
          {fixarAssunto && (
            <p className="text-xs mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-hover)]">📁 A próxima mensagem vai para: {assuntos.find((a) => a.id === fixarAssunto)?.titulo}
              <button onClick={() => setFixarAssunto(null)} aria-label="Tirar a fixação do assunto" className="cursor-pointer">×</button></p>
          )}
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {anexos.map((a) => (
                <span key={a.id} className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] flex items-center gap-1">📎 {a.nome}
                  <button onClick={() => setAnexos((x) => x.filter((y) => y.id !== a.id))} aria-label={`Remover ${a.nome}`} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--danger)]">×</button>
                </span>
              ))}
            </div>
          )}
          {compacto ? (
          <div className="relative">
          {menuNode}
          <div className="flex items-center gap-2.5 rounded-[18px] border-[1.5px] border-[var(--border)] bg-[var(--bg-secondary)] pl-4 pr-2.5 py-2.5 shadow-[0_6px_24px_var(--sombra)] focus-within:border-[var(--ac)]">
            <input ref={fileRef} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json" onChange={(e) => anexar(e.target.files)} />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {chipNode}
              <textarea {...camposHab} style={{ outline: "none" }} value={texto} rows={1} maxLength={8000}
                placeholder={transcrevendo ? "Transcrevendo o áudio…" : gravando ? "Gravando… toque no quadrado para parar" : limiteBatido ? "Limite de mensagens atingido" : habilidadeSel ? "Escreva o pedido…" : (celular ? "Escreva ou fale…" : `Fale ou escreva para ${agente?.nome ?? "o Jarbas"}… (digite / para habilidades)`)}
                disabled={limiteBatido}
                className="flex-1 min-w-[6rem] resize-none bg-transparent px-0 py-2.5 text-[15px] leading-snug text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none max-h-40" aria-label="Mensagem" />
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={anexos.length >= 3} title="Anexar PDF, imagem, texto ou planilha CSV (até 10 MB)" aria-label="Anexar arquivo"
              className="h-11 w-11 shrink-0 text-xl leading-none rounded-xl bg-[var(--bg-tertiary)] hover:brightness-95 disabled:opacity-40 cursor-pointer">📎</button>
            <button onClick={alternarGravacao} disabled={transcrevendo} title={gravando ? "Parar e transcrever" : "Gravar áudio"} aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
              className={`h-11 w-11 shrink-0 text-xl leading-none rounded-xl cursor-pointer ${gravando ? "bg-[var(--danger)] text-white animate-pulse" : "bg-[var(--ac)] text-[var(--on-ac)]"} disabled:opacity-40`}>{gravando ? "⏹" : "🎙️"}</button>
            {/* 18/10: botão de enviar SEMPRE visível (no celular o Enter quebra a linha e não dava pra mandar) */}
            {ocupado
              ? <button onClick={parar} aria-label="Parar" title="Parar" className="h-11 w-11 shrink-0 rounded-xl bg-[var(--danger)] text-white text-lg font-bold cursor-pointer">■</button>
              : <button onClick={() => enviar(texto)} disabled={(!texto.trim() && !anexos.length) || limiteBatido} aria-label="Enviar mensagem" title="Enviar"
                  className="h-11 w-11 shrink-0 rounded-xl bg-[var(--ac)] text-[var(--on-ac)] text-xl font-bold leading-none disabled:opacity-35 cursor-pointer">➤</button>}
          </div>
          </div>
          ) : (
          <div className="relative">
          {menuNode}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json" onChange={(e) => anexar(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={anexos.length >= 3} title="Anexar PDF, imagem, texto ou planilha CSV (até 10 MB)" aria-label="Anexar arquivo"
              className="h-12 w-12 shrink-0 text-2xl leading-none rounded-xl border border-[var(--border)] hover:bg-[var(--bg-tertiary)] disabled:opacity-40 cursor-pointer">📎</button>
            <button onClick={alternarGravacao} disabled={transcrevendo} title={gravando ? "Parar e transcrever" : "Gravar áudio"} aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
              className={`h-12 w-12 shrink-0 text-2xl leading-none rounded-xl border cursor-pointer ${gravando ? "bg-[var(--danger)] text-white border-[var(--danger)] animate-pulse" : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]"} disabled:opacity-40`}>{gravando ? "⏹" : "🎙"}</button>
            <div className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 focus-within:border-[var(--accent)]">
              {chipNode && <div className="mb-1.5">{chipNode}</div>}
              <textarea {...camposHab} style={{ outline: "none" }} value={texto} rows={2} maxLength={8000}
                placeholder={transcrevendo ? "Transcrevendo o áudio…" : gravando ? "Gravando… clique no quadrado para parar" : limiteBatido ? "Limite de mensagens atingido" : `Mensagem para ${agente?.nome ?? ""} (Enter envia, Shift+Enter quebra a linha, / abre as habilidades)`}
                disabled={limiteBatido}
                className="w-full resize-none bg-transparent text-sm focus:outline-none" aria-label="Mensagem" />
            </div>
            {ocupado
              ? <button onClick={parar} className="h-12 px-4 rounded-xl bg-[var(--danger)] text-white text-sm font-medium cursor-pointer">Parar</button>
              : <button onClick={() => enviar(texto)} disabled={(!texto.trim() && !anexos.length) || limiteBatido} className="h-12 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium disabled:opacity-40 cursor-pointer">Enviar</button>}
          </div>
          </div>
          )}
          {avisosHab}
          <p className={`text-[11px] text-[var(--text-muted)] mt-1.5 ${compacto ? "px-2 hidden md:block" : ""}`}>Uma conversa por vez · 20 mensagens por hora e 100 por dia · o áudio vira texto na caixa para você conferir antes de enviar.</p>
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

function Balao({ m, agente, habilidades, ocupado, onEscolha, onAcao, assuntos, onMover }: {
  m: Mensagem; agente?: Agente; habilidades?: HabChat[]; ocupado: boolean; onEscolha: (t: string, assuntoId?: string) => void; onAcao: (i: number, cancelar: boolean) => void;
  assuntos?: Assunto[]; onMover: (mensagemId: string, assuntoId: string, titulo?: string) => void;
}) {
  if (m.papel === "sistema") return <p className="text-center text-xs text-[var(--text-muted)]">{m.texto}</p>;
  if (m.papel === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(40rem,90%)] rounded-2xl rounded-tr-sm bg-[var(--ac)] text-[var(--on-ac)] px-4 py-2.5">
          {m.habilidade && <p className="text-xs font-bold opacity-90 mb-1">{habilidades?.find((h) => h.id === m.habilidade)?.icone ?? "🧩"} {(habilidades?.find((h) => h.id === m.habilidade)?.rotulo ?? m.habilidade).toLowerCase()}</p>}
          <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>
          {m.anexos?.map((a) => <p key={a.id} className="text-xs opacity-80 mt-1">📎 {a.nome}</p>)}
        </div>
      </div>
    );
  }
  const assunto = assuntos?.find((a) => a.id === m.assuntoId);
  return (
    <div className="flex gap-2 items-start">
      <div className="max-w-[min(48rem,100%)] min-w-0">
        <p className="text-[11.5px] font-bold text-[var(--text-secondary)] mb-0.5">{agente?.nome}</p>
        {assunto && m.respostaDe && <EtiquetaAssunto atual={assunto} assuntos={assuntos!} onMover={(id, t) => onMover(m.respostaDe!, id, t)} />}
        <div className="rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2.5">
          <Resposta texto={m.texto} onEscolha={(t) => onEscolha(t, m.assuntoId)} desativado={ocupado} />
          {m.acoes?.map((a, i) => <CartaoAcao key={i} a={a} ocupado={ocupado} onDecidir={(c) => onAcao(i, c)} />)}
          {m.arquivos?.map((f) => <CartaoArquivoObra key={f.url} f={f} />)}
          {m.obra && m.tarefaId && <Bastidores tarefa={m.tarefaId} />}
          {m.obra && m.tarefaId && m.mudancas && <BotaoDesfazer tarefa={m.tarefaId} />}
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{hora(m.ts)}{m.modeloRotulo ? ` · ${m.modeloRotulo}` : ""}</p>
        </div>
      </div>
    </div>
  );
}

// Etiqueta "📁 assunto" acima da resposta; clicar permite corrigir (mover para outro assunto ou criar um novo).
function EtiquetaAssunto({ atual, assuntos, onMover }: { atual: Assunto; assuntos: Assunto[]; onMover: (assuntoId: string, titulo?: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState("");
  return (
    <div className="relative mb-1">
      <button onClick={() => setAberto(!aberto)} aria-expanded={aberto} title="Assunto desta conversa. Clique para corrigir."
        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] px-1.5 py-0.5 rounded-md hover:bg-[var(--bg-tertiary)] cursor-pointer max-w-full truncate">📁 {atual.titulo}</button>
      {aberto && (
        <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-1.5">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Mover esta conversa para</p>
          {assuntos.filter((a) => a.id !== atual.id && !a.arquivado).map((a) => (
            <button key={a.id} onClick={() => { onMover(a.id); setAberto(false); }} className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer truncate">📁 {a.titulo}</button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); onMover("novo", novo.trim() || undefined); setNovo(""); setAberto(false); }} className="flex gap-1 mt-1 px-1">
            <input value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={60} placeholder="Novo assunto…" aria-label="Título do novo assunto"
              className="flex-1 min-w-0 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1" />
            <button type="submit" className="text-sm px-2 rounded-lg bg-[var(--accent)] text-white cursor-pointer">Criar</button>
          </form>
        </div>
      )}
    </div>
  );
}

// Lista lateral recolhível: retomar (fixa a próxima mensagem no assunto) e arquivar/reabrir.
function PainelAssuntos({ assuntos, msgs, fixado, onFixar, onArquivar }: {
  assuntos: Assunto[]; msgs: Mensagem[]; fixado: string | null; onFixar: (id: string | null) => void; onArquivar: (id: string, arquivado: boolean) => void;
}) {
  const [verArquivados, setVerArquivados] = useState(false);
  const conta = (id: string) => msgs.filter((m) => m.papel === "user" && m.assuntoId === id).length;
  const abertos = assuntos.filter((a) => !a.arquivado); const arq = assuntos.filter((a) => a.arquivado);
  return (
    <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)]/60 overflow-y-auto max-h-48 md:max-h-none p-2" aria-label="Assuntos">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Assuntos abertos</p>
      {!abertos.length && <p className="px-2 text-xs text-[var(--text-muted)]">Os assuntos aparecem aqui sozinhos conforme você conversa.</p>}
      <ul className="space-y-0.5">
        {abertos.map((a) => (
          <li key={a.id} className={`flex items-center gap-1 rounded-lg ${fixado === a.id ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-tertiary)]"}`}>
            <button onClick={() => onFixar(fixado === a.id ? null : a.id)} aria-pressed={fixado === a.id} title="Retomar: a próxima mensagem vai para este assunto"
              className="flex-1 min-w-0 text-left px-2 py-1.5 cursor-pointer"><span className="block text-sm truncate">📁 {a.titulo}</span><span className="block text-[10px] text-[var(--text-muted)]">{conta(a.id)} msgs{fixado === a.id ? " · retomando" : ""}</span></button>
            <button onClick={() => onArquivar(a.id, true)} aria-label={`Arquivar ${a.titulo}`} title="Arquivar" className="px-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">⌫</button>
          </li>
        ))}
      </ul>
      {arq.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setVerArquivados(!verArquivados)} aria-expanded={verArquivados} className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">{verArquivados ? "▾" : "▸"} Arquivados ({arq.length})</button>
          {verArquivados && <ul>{arq.map((a) => (
            <li key={a.id} className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-muted)]"><span className="flex-1 min-w-0 truncate">{a.titulo}</span>
              <button onClick={() => onArquivar(a.id, false)} className="underline cursor-pointer">reabrir</button></li>))}</ul>}
        </div>
      )}
    </aside>
  );
}

function CartaoSquad({ a, ocupado, onDecidir }: { a: Acao; ocupado: boolean; onDecidir: (cancelar: boolean) => void }) {
  const p = a.parametros as { nome?: string; icone?: string; objetivo?: string; entrada?: string; saida?: string;
    etapas?: { id: string; quem: string; titulo: string; entrega: string; peca_assinavel?: boolean }[];
    aprovacoes?: { depois_de: string; pergunta: string }[]; proibicoes?: string[] };
  const etapas = p.etapas ?? []; const agentes = Array.from(new Set(etapas.map((e) => e.quem)));
  const paradaApos = new Set((p.aprovacoes ?? []).map((x) => x.depois_de));
  return (
    <div className="my-2 rounded-xl border border-[var(--af-gold)] bg-[var(--af-gold)]/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Rascunho de squad</p>
      <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">{p.icone} {p.nome}</p>
      <p className="text-sm text-[var(--text-primary)] mt-1"><b>Objetivo:</b> {p.objetivo}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1"><b>Entra:</b> {p.entrada}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-0.5"><b>Sai:</b> {p.saida}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {agentes.map((q) => <span key={q} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] capitalize">{q}</span>)}
      </div>
      <ol className="mt-2 space-y-1.5 list-decimal pl-5 text-sm">
        {etapas.map((e) => (
          <li key={e.id}>
            <span className="font-medium text-[var(--text-primary)]">{e.titulo}</span> <span className="text-[var(--text-muted)]">({e.quem}{e.peca_assinavel ? ", peça assinável" : ""})</span>
            <span className="block text-[var(--text-secondary)]">entrega: {e.entrega}</span>
            {paradaApos.has(e.id) && <span className="block text-[var(--af-terracotta)] text-xs font-semibold">⏸ para e espera a sua aprovação</span>}
          </li>
        ))}
      </ol>
      {!!p.proibicoes?.length && <p className="text-xs text-[var(--text-secondary)] mt-2"><b>Nunca faz:</b> {p.proibicoes.join(" · ")}</p>}
      <p className="text-xs text-[var(--text-muted)] mt-2">{etapas.length} etapas, cada uma gasta uma chamada da assinatura quando a squad rodar. Criar não roda nada.</p>
      {a.estado === "pendente" && (
        <div className="flex gap-2 mt-2">
          <button disabled={ocupado} onClick={() => onDecidir(false)} className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm disabled:opacity-40 cursor-pointer">Aprovar e criar</button>
          <button disabled={ocupado} onClick={() => onDecidir(true)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-40 cursor-pointer">Descartar</button>
        </div>
      )}
      {a.estado === "executando" && <p className="text-sm mt-2 animate-pulse">Criando a squad…</p>}
      {a.estado === "cancelada" && <p className="text-sm mt-2 text-[var(--text-muted)]">Descartado. Nada foi criado.</p>}
      {(a.estado === "feita" || a.estado === "erro") && a.resultado && (
        <p className={`text-sm mt-2 ${a.resultado.ok ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>{a.resultado.ok ? "✓ " : "✗ "}{a.resultado.texto}</p>
      )}
    </div>
  );
}

function CartaoAcao({ a, ocupado, onDecidir }: { a: Acao; ocupado: boolean; onDecidir: (cancelar: boolean) => void }) {
  if (a.acao === "criar_squad") return <CartaoSquad a={a} ocupado={ocupado} onDecidir={onDecidir} />;
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
