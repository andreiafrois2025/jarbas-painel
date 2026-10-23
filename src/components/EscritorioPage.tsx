"use client";

// Equipe › Escritório. O prédio com cada agente na sua mesa.
//
// De onde vem cada coisa (nada é inventado; detalhes em squad-api/escritorio.js):
//  - quem trabalha e em quê: squads em execução e chat do painel respondendo;
//  - mural e entregas de hoje: atividades registradas e livro-caixa de horas;
//  - o resto (café, sofá, balões de "atividade típica") é só encenação do
//    escritório: acontece com quem está livre e não representa tarefa real.
// No modo Só Igam: tarefas pessoais viram "ocupado" e Louis, Lara e Nara saem.
// Modo aula: usa SÓ um roteiro de exemplo, nunca dado real.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Mascote from "./Mascote";
import { squadFetch } from "@/lib/squadFetch";
import ChatPage from "./ChatPage";
import Ambiente from "./EscritorioAmbiente";
import { usePainel } from "@/lib/painel-context";
import { ehColaboradorOculto, ehPessoal } from "@/lib/modo";
import { CHAVE_SOM, CHAVE_ANIM } from "@/lib/preferencias";
import {
  AGENTES, ALTURA, arrumaBaloes, geomMascote, SENTADO_PADRAO, CAFE, CP_DURACAO, CP_ESPERA, POS_ANDREIA, LARGURA, ROTEIROS, SALAS, SOFA,
  buscaEscritorio, buscaPosicoes, liberaSom, perfil, salvaPosicoes, somDoisTons, somPlim, somTecla,
  type AgenteVivo, type DadosEscritorio, type EventoMural, type PerfilAgente, type PosicoesRel, type PosRel,
} from "@/lib/escritorio";

const TZ = "America/Sao_Paulo";
const INTERVALO_CAFE = 3 * 60_000;   // um novo agente vai ao café a cada ~3 min
const PERMANENCIA_CAFE = 75_000;
const INTERVALO_SOFA = 150_000;
const PERMANENCIA_SOFA = 4 * 60_000;
const SEM_TAREFA_SOFA = 24 * 3600_000;
const ATUALIZA_MS = 25_000;
const PERMANENCIA_ENTREGA = 20_000; // quem estava livre vai à mesa e fica ~20 s com o balão ✅

type Alvo = "trab" | "livre";
const SEM_ARRASTE = 0.0005;

type Lugar = { tipo: "cafe" | "sofa"; idx: number; ate: number };

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).formatToParts(d);
  const h = p.find((x) => x.type === "hour")?.value ?? "", m = p.find((x) => x.type === "minute")?.value ?? "";
  const dia = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: TZ });
  const prefixo = dia(d) === dia(new Date()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }) + " ";
  return `${prefixo}${Number(h)}h${m}`;
}

// "Escrevendo..." -> "escrevendo...", mas "ETP e TR" fica como está
const minuscula = (t: string) => (/^[A-ZÀ-Ý]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

interface Vivo extends AgenteVivo { tarefaTxt?: string }
interface Evento extends EventoMural { id: string }

export default function EscritorioPage() {
  const { servidora } = usePainel();

  const [dados, setDados] = useState<DadosEscritorio | null>(null);
  const [erro, setErro] = useState(false);
  const [som, setSom] = useState(false);
  const [anim, setAnim] = useState(true); // ✨ animações do ambiente (ligadas por padrão)
  const [aula, setAula] = useState(false);
  const [aulaT, setAulaT] = useState(0);
  const [roteiroId, setRoteiroId] = useState<string | null>(null); // null = escolhendo
  const roteiro = ROTEIROS.find((r) => r.id === roteiroId) ?? null;
  const trechos = useMemo(() => roteiro?.trechos ?? [], [roteiro]);
  const checkpoints = useMemo(() => roteiro?.checkpoints ?? [], [roteiro]);
  const [sel, setSel] = useState<string | null>(null);
  // Conversa embutida (19/10/2026): "Conversar" abre o chat ao lado dos bonequinhos, sem sair da tela
  const [conversa, setConversa] = useState<string | null>(null);
  const rapido = useRef(false);
  rapido.current = !!conversa;
  const [lugar, setLugar] = useState<Record<string, Lugar>>({});
  const [ocioVis, setOcioVis] = useState<Record<string, number>>({});
  const [entregaBal, setEntregaBal] = useState<Record<string, { texto: string; ate: number; visita?: boolean }>>({});
  const raiz = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);

  // ── posições arrumadas (global, vêm da squad-api) e modo "Arrumar posições" ──
  const [pos, setPos] = useState<PosicoesRel>({});
  const [arrumar, setArrumar] = useState(false);
  const [alvo, setAlvo] = useState<Alvo>("trab");
  const [rascunho, setRascunho] = useState<PosicoesRel>({});
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [confirmaPadrao, setConfirmaPadrao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroPos, setErroPos] = useState("");
  const [celular, setCelular] = useState(false);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  useEffect(() => { buscaPosicoes().then(setPos).catch(() => { /* sem posições salvas: padrão do código */ }); }, []);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const f = () => setCelular(m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  // ── agentes que aparecem ──────────────────────────────────────────────
  const visiveis = useMemo<PerfilAgente[]>(
    () => AGENTES.filter((a) => !(servidora && (ehColaboradorOculto(a.nome) || (a.id === "louis" && !aula)))),
    [servidora, aula],
  );
  const mascara = useCallback((t?: string) => (servidora && t && ehPessoal(t) ? "ocupado" : t), [servidora]);

  // ── lembrar o som ─────────────────────────────────────────────────────
  useEffect(() => { try { setSom(window.localStorage.getItem(CHAVE_SOM) === "1"); } catch { /* sem storage */ } }, []);
  useEffect(() => { try { setAnim(window.localStorage.getItem(CHAVE_ANIM) !== "0"); } catch { /* sem storage */ } }, []);
  const alternarAnim = () => {
    const novo = !anim;
    setAnim(novo);
    try { window.localStorage.setItem(CHAVE_ANIM, novo ? "1" : "0"); } catch { /* sem storage */ }
  };
  const alternarSom = () => {
    const novo = !som;
    if (novo) { liberaSom(); somPlim(); }
    setSom(novo);
    try { window.localStorage.setItem(CHAVE_SOM, novo ? "1" : "0"); } catch { /* sem storage */ }
  };

  // ── dados ao vivo (a cada 25 s; pausa com a aba escondida) ─────────────
  const anterior = useRef<Record<string, AgenteVivo> | null>(null);
  const muralVisto = useRef<Set<string> | null>(null);
  const somRef = useRef(som);
  useEffect(() => { somRef.current = som; }, [som]);

  const aulaRef = useRef(aula);
  useEffect(() => { aulaRef.current = aula; }, [aula]);
  const darEntrega = useCallback((id: string, texto: string, ms = 7000, visitar = false) => {
    // a entrega mais nova substitui a anterior (nunca dois balões do mesmo agente).
    // Com `visitar`, quem estava livre anda até a mesa e fica lá com o balão ✅ (depois volta).
    const vai = visitar && !aulaRef.current;
    const dur = vai ? Math.max(ms, PERMANENCIA_ENTREGA) : ms;
    if (vai) setLugar((l) => { if (!l[id]) return l; const n = { ...l }; delete n[id]; return n; });
    setEntregaBal((b) => ({ ...b, [id]: { texto, ate: Date.now() + dur, visita: vai } }));
    if (somRef.current) somPlim();
  }, []);

  useEffect(() => {
    if (aula) return;
    let vivo = true;
    const buscar = async () => {
      if (document.hidden) return;
      try {
        const d = await buscaEscritorio(servidora);
        if (!vivo) return;
        setDados(d); setErro(false);
        const novoMapa = Object.fromEntries(d.agentes.map((a) => [a.id, a]));
        if (anterior.current && muralVisto.current) {
          const avisados = new Set<string>();
          for (const e of d.mural) {
            const k = e.em + e.agente;
            if (muralVisto.current.has(k)) continue;
            muralVisto.current.add(k);
            if (!avisados.has(e.agente) && Date.now() - new Date(e.em).getTime() < 5 * 60_000) {
              avisados.add(e.agente);
              darEntrega(e.agente, "✅ " + (mascara(e.texto) ?? "feito"), 7000, true);
            }
          }
          for (const a of d.agentes) {
            const antes = anterior.current[a.id];
            if (antes?.estado === "trabalhando" && a.estado === "livre" && !avisados.has(a.id)) {
              darEntrega(a.id, "✅ " + (mascara(antes.tarefa) ?? "tarefa concluída"), 7000, true);
            }
          }
        } else {
          muralVisto.current = new Set(d.mural.map((e) => e.em + e.agente));
        }
        anterior.current = novoMapa;
      } catch { if (vivo) setErro(true); }
    };
    anterior.current = null; muralVisto.current = null;
    // com a conversa aberta, confere a cada 5 s (para ver o agente começar a trabalhar logo); senão, 25 s
    let t: ReturnType<typeof setTimeout> | undefined;
    const ciclo = async () => { await buscar(); if (vivo) t = setTimeout(ciclo, rapido.current ? 5000 : ATUALIZA_MS); };
    ciclo();
    return () => { vivo = false; if (t) clearTimeout(t); };
  }, [aula, servidora, darEntrega, mascara]);

  // ── modo aula: relógio do roteiro ─────────────────────────────────────
  const aulaPrev = useRef(0);
  useEffect(() => {
    if (!aula || !roteiro) return;
    const ini = Date.now(); aulaPrev.current = 0; setAulaT(0);
    const t = setInterval(() => {
      const s = ((Date.now() - ini) / 1000) % roteiro.duracao;
      const prev = aulaPrev.current;
      const cruza = (x: number) => (s >= prev ? prev < x && x <= s : x > prev || x <= s);
      for (const tr of roteiro.trechos) if (cruza(tr.ate)) darEntrega(tr.agente, "✅ " + tr.entrega, 5000);
      for (const cp of roteiro.checkpoints) if (!cp.pedido && cruza(cp.de + CP_ESPERA) && somRef.current) somDoisTons();
      aulaPrev.current = s;
      setAulaT(s);
    }, 250);
    return () => clearInterval(t);
  }, [aula, roteiro, darEntrega]);

  // ── estado de cada agente (ao vivo ou aula) ───────────────────────────
  const vivos = useMemo<Record<string, Vivo>>(() => {
    const m: Record<string, Vivo> = {};
    if (aula) {
      for (const a of AGENTES) m[a.id] = { id: a.id, estado: "livre" };
      for (const tr of trechos) {
        if (aulaT >= tr.de && aulaT < tr.ate) {
          m[tr.agente] = { id: tr.agente, estado: "trabalhando", tarefa: tr.tarefa, tarefaTxt: tr.tarefa, progresso: (aulaT - tr.de) / (tr.ate - tr.de) };
        }
      }
      return m;
    }
    for (const a of AGENTES) m[a.id] = { id: a.id, estado: "livre" };
    for (const a of dados?.agentes ?? []) m[a.id] = { ...a, tarefaTxt: mascara(a.tarefa) };
    return m;
  }, [aula, aulaT, trechos, dados, mascara]);

  const vivosRef = useRef(vivos);
  useEffect(() => { vivosRef.current = vivos; }, [vivos]);

  // Prévia do Hall: abrir com ?demo=hall mostra 3 no café e 2 no sofá (só para conferir o visual).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "hall") return;
    const ate = Date.now() + 6 * 3600_000;
    const ids = ["izzy", "felipe", "theo", "donna", "mike"];
    setLugar({
      [ids[0]]: { tipo: "cafe", idx: 0, ate }, [ids[1]]: { tipo: "cafe", idx: 1, ate }, [ids[2]]: { tipo: "cafe", idx: 2, ate },
      [ids[3]]: { tipo: "sofa", idx: 0, ate }, [ids[4]]: { tipo: "sofa", idx: 1, ate },
    });
  }, []);

  // ── café, sofá e balões de atividade típica (encenação) ───────────────
  const ultimoCafe = useRef(Date.now() - INTERVALO_CAFE + 30_000);   // primeira ida ~30 s depois de abrir
  const ultimoSofa = useRef(Date.now() - INTERVALO_SOFA + 45_000);
  const ultimoIntervalo = useRef<Record<string, number>>({});
  useEffect(() => {
    const t = setInterval(() => {
      const agora = Date.now();
      const vs = vivosRef.current;
      setLugar((prev) => {
        const n: Record<string, Lugar> = {};
        for (const [id, l] of Object.entries(prev)) if (agora < l.ate && vs[id]?.estado !== "trabalhando") n[id] = l;
        if (aula) return Object.keys(n).length ? {} : n;
        const livres = visiveis.filter((a) => vs[a.id]?.estado !== "trabalhando" && !n[a.id]);
        const idade = (id: string) => Math.max(Date.parse(vs[id]?.desde ?? "") || 0, ultimoIntervalo.current[id] || 0);
        const ocupados = (tipo: Lugar["tipo"]) => Object.values(n).filter((l) => l.tipo === tipo).map((l) => l.idx);
        const cafe = ocupados("cafe");
        if (agora - ultimoCafe.current > INTERVALO_CAFE && cafe.length < CAFE.length && livres.length) {
          const quem = [...livres].sort((a, b) => idade(a.id) - idade(b.id))[0];
          const idx = CAFE.findIndex((_, i) => !cafe.includes(i));
          n[quem.id] = { tipo: "cafe", idx, ate: agora + PERMANENCIA_CAFE };
          ultimoCafe.current = agora; ultimoIntervalo.current[quem.id] = agora;
          livres.splice(livres.indexOf(quem), 1);
        }
        const sofa = ocupados("sofa");
        const semTarefa = livres.filter((a) => { const d = Date.parse(vs[a.id]?.desde ?? ""); return !d || agora - d > SEM_TAREFA_SOFA; });
        if (agora - ultimoSofa.current > INTERVALO_SOFA && sofa.length < SOFA.length && semTarefa.length) {
          const quem = [...semTarefa].sort((a, b) => idade(a.id) - idade(b.id))[0];
          const idx = SOFA.findIndex((_, i) => !sofa.includes(i));
          n[quem.id] = { tipo: "sofa", idx, ate: agora + PERMANENCIA_SOFA };
          ultimoSofa.current = agora; ultimoIntervalo.current[quem.id] = agora;
        }
        return n;
      });
      // balão de atividade típica: de vez em quando, no máximo 2 ao mesmo tempo
      setOcioVis((prev) => {
        const n: Record<string, number> = {};
        for (const [id, ate] of Object.entries(prev)) if (ate > agora && vs[id]?.estado !== "trabalhando") n[id] = ate;
        if (Object.keys(n).length < 2 && Math.random() < 0.55) {
          const opcoes = visiveis.filter((a) => vs[a.id]?.estado !== "trabalhando" && !n[a.id]);
          if (opcoes.length) n[opcoes[Math.floor(Math.random() * opcoes.length)].id] = agora + 6000;
        }
        return n;
      });
      setEntregaBal((b) => {
        const ativos = Object.entries(b).filter(([, v]) => v.ate > agora);
        return ativos.length === Object.keys(b).length ? b : Object.fromEntries(ativos);
      });
    }, 3000);
    return () => clearInterval(t);
  }, [visiveis, aula]);

  // ── balões sem sobreposição: mede e reposiciona a cada desenho da tela ──
  useLayoutEffect(() => { if (palco.current) arrumaBaloes(palco.current); });
  useEffect(() => {
    const el = palco.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => arrumaBaloes(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, [aula, roteiroId]);

  // ── som de digitação enquanto alguém trabalha ─────────────────────────
  const nTrabalhando = visiveis.filter((a) => vivos[a.id]?.estado === "trabalhando").length;
  useEffect(() => {
    if (!som || nTrabalhando === 0) return;
    let parar = false; let timer: ReturnType<typeof setTimeout>;
    const rajada = (restantes: number) => {
      if (parar) return;
      if (!document.hidden) somTecla();
      timer = setTimeout(() => (restantes > 0 ? rajada(restantes - 1) : setTimeout(() => rajada(3 + Math.floor(Math.random() * 5)), 500 + Math.random() * 900)), 90 + Math.random() * 150);
    };
    rajada(4);
    return () => { parar = true; clearTimeout(timer); };
  }, [som, nTrabalhando]);

  // ── modo aula: tela cheia com saída por botão e Esc ───────────────────
  const eraFull = useRef(false);
  const entrarAula = () => {
    setSel(null); setEntregaBal({}); setLugar({}); setRoteiroId(null);
    setArrumar(false); setConfirmaPadrao(false);
    setAula(true);
    try { void raiz.current?.requestFullscreen?.().catch(() => { /* sem tela cheia: fica sobreposto */ }); } catch { /* idem */ }
  };
  const sairAula = useCallback(() => {
    setAula(false);
    eraFull.current = false;
    try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* sem tela cheia */ }
  }, []);
  useEffect(() => {
    if (!aula) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") sairAula(); };
    const mudou = () => {
      if (document.fullscreenElement) eraFull.current = true;
      else if (eraFull.current) sairAula();
    };
    window.addEventListener("keydown", tecla);
    document.addEventListener("fullscreenchange", mudou);
    return () => { window.removeEventListener("keydown", tecla); document.removeEventListener("fullscreenchange", mudou); };
  }, [aula, sairAula]);

  // ── mural e placar ────────────────────────────────────────────────────
  const mural = useMemo<Evento[]>(() => {
    if (aula) {
      if (!roteiro) return [];
      const ev: { t: number; agente: string; texto: string }[] = [];
      for (const cp of checkpoints) {
        const t = cp.pedido ? cp.de : cp.de + CP_ESPERA;
        if (aulaT >= t) ev.push({ t, agente: "andreia", texto: cp.mural });
      }
      for (const tr of trechos) {
        if (aulaT >= tr.de) ev.push({ t: tr.de, agente: tr.agente, texto: "começou: " + minuscula(tr.tarefa) });
        if (aulaT >= tr.ate) ev.push({ t: tr.ate, agente: tr.agente, texto: "entregou: " + minuscula(tr.entrega) });
      }
      return ev.sort((a, b) => b.t - a.t).map((e, i) => ({ id: "a" + i, em: `14h${String(Math.floor(e.t / 6)).padStart(2, "0")}`, agente: e.agente, texto: e.texto }));
    }
    const ok = new Set(visiveis.map((a) => a.id));
    return (dados?.mural ?? []).filter((e) => ok.has(e.agente)).slice(0, 12).map((e) => ({ ...e, id: e.em + e.agente, texto: mascara(e.texto) ?? e.texto }));
  }, [aula, aulaT, roteiro, trechos, checkpoints, dados, visiveis, mascara]);

  const placar = useMemo(() => {
    const t = nTrabalhando;
    if (aula) return { t, l: visiveis.length - t, e: trechos.filter((x) => aulaT >= x.ate).length };
    return { t, l: visiveis.length - t, e: dados?.placar.entregas_hoje ?? 0 };
  }, [aula, aulaT, trechos, dados, visiveis, nTrabalhando]);

  // ── posição de cada agente ────────────────────────────────────────────
  const padraoRel = (a: PerfilAgente, k: Alvo): PosRel => ({ x: a[k].x / LARGURA, y: a[k].y / ALTURA });
  const efetivaRel = (a: PerfilAgente, k: Alvo, fonte: PosicoesRel): PosRel => fonte[a.id]?.[k] ?? padraoRel(a, k);
  const abs = (r: PosRel) => ({ x: r.x * LARGURA, y: r.y * ALTURA });
  const sentado = (a: PerfilAgente) => a.trab.sit ?? SENTADO_PADRAO;
  const ondeEsta = (a: PerfilAgente) => {
    if (arrumar) return { ...abs(efetivaRel(a, alvo, rascunho)), modo: alvo === "trab" ? ("trab" as const) : ("livre" as const), sit: alvo === "trab" ? sentado(a) : 0 };
    if (vivos[a.id]?.estado === "trabalhando") return { ...abs(efetivaRel(a, "trab", pos)), modo: "trab" as const, sit: sentado(a) };
    // entrega nova de quem estava livre: anda até a mesa, fica ~20 s com o balão ✅ e volta
    const ent = entregaBal[a.id];
    if (!aula && ent?.visita && ent.ate > Date.now()) return { ...abs(efetivaRel(a, "trab", pos)), modo: "visita" as const, sit: sentado(a) };
    const l = lugar[a.id];
    if (l?.tipo === "cafe") return { x: CAFE[l.idx].x, y: CAFE[l.idx].y, modo: "cafe" as const, sit: CAFE[l.idx].sit ?? 0 };
    if (l?.tipo === "sofa") return { x: SOFA[l.idx].x, y: SOFA[l.idx].y, modo: "sofa" as const, sit: SOFA[l.idx].sit ?? 0 };
    return { ...abs(efetivaRel(a, "livre", pos)), modo: "livre" as const, sit: a.livreSit ?? 0 };
  };
  // fumacinha da xícara de quem está no café (perto do mascote)
  const cafeNoAr = visiveis.flatMap((a) => { const p = ondeEsta(a); return p.modo === "cafe" ? [{ x: p.x / LARGURA, y: p.y / ALTURA }] : []; });
  const ordenados = [...visiveis].sort((a, b) => ondeEsta(a).y - ondeEsta(b).y);

  const selPerfil = sel ? perfil(sel) : undefined;

  // ── modo arrumar: abrir, arrastar, salvar ─────────────────────────────
  const [avisoSalvo, setAvisoSalvo] = useState<Alvo | null>(null);
  const abrirArrumar = () => {
    const r: PosicoesRel = {};
    for (const a of AGENTES) r[a.id] = { trab: efetivaRel(a, "trab", pos), livre: efetivaRel(a, "livre", pos) };
    setRascunho(r); setAlvo("trab"); setSel(null); setErroPos(""); setConfirmaPadrao(false); setArrumar(true);
  };
  const fecharArrumar = () => { setArrumar(false); setArrastando(null); setConfirmaPadrao(false); setErroPos(""); };
  const voltarPadrao = () => {
    const r: PosicoesRel = {};
    for (const a of AGENTES) r[a.id] = { trab: padraoRel(a, "trab"), livre: padraoRel(a, "livre") };
    setRascunho(r); setConfirmaPadrao(false);
  };
  const salvar = async () => {
    // só grava o que difere do padrão do código (assim ajustes futuros do padrão continuam valendo)
    const fora: PosicoesRel = {};
    for (const a of AGENTES) {
      const item: { trab?: PosRel; livre?: PosRel } = {};
      for (const k of ["trab", "livre"] as Alvo[]) {
        const r = rascunho[a.id]?.[k]; const d = padraoRel(a, k);
        if (r && (Math.abs(r.x - d.x) > SEM_ARRASTE || Math.abs(r.y - d.y) > SEM_ARRASTE)) item[k] = { x: Math.min(1, Math.max(0, r.x)), y: Math.min(1, Math.max(0, r.y)) };
      }
      if (item.trab || item.livre) fora[a.id] = item;
    }
    setSalvando(true); setErroPos("");
    // 18/10: ao salvar, cada um volta ao estado AO VIVO (quase todos livres), e a Andréia achou
    // que "eles mudaram". O aviso explica e oferece arrumar a outra posição.
    try { setPos(await salvaPosicoes(fora)); fecharArrumar(); setAvisoSalvo(alvo); setTimeout(() => setAvisoSalvo(null), 15000); }
    catch { setErroPos("Não consegui salvar agora. As posições continuam como você deixou aqui; tente de novo."); }
    finally { setSalvando(false); }
  };
  const comecaArraste = (e: React.PointerEvent<HTMLButtonElement>, a: PerfilAgente) => {
    if (!arrumar || !palco.current) return;
    e.preventDefault(); e.stopPropagation();
    const r = palco.current.getBoundingClientRect();
    const p = efetivaRel(a, alvo, rascunho);
    grab.current = { dx: e.clientX - (r.left + p.x * r.width), dy: e.clientY - (r.top + p.y * r.height) };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
    setArrastando(a.id);
  };
  const moveArraste = (e: React.PointerEvent<HTMLButtonElement>, a: PerfilAgente) => {
    if (arrastando !== a.id || !grab.current || !palco.current) return;
    const r = palco.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - grab.current.dx - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - grab.current.dy - r.top) / r.height));
    setRascunho((d) => ({ ...d, [a.id]: { ...d[a.id], [alvo]: { x, y } } }));
  };
  const fimArraste = (e: React.PointerEvent<HTMLButtonElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* idem */ }
    grab.current = null; setArrastando(null);
  };

  return (
    <div ref={raiz} className={aula ? "fixed inset-0 z-[200] flex flex-col bg-[var(--bg-primary)]" : "flex-1 min-h-0 flex flex-col"}>
      {aula && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 bg-[var(--ac)] text-[var(--on-ac)]">modo aula · exemplo</span>
          <div className="flex gap-1.5 min-w-0 overflow-x-auto" role="group" aria-label="Roteiro da aula">
            {ROTEIROS.map((r) => (
              <button key={r.id} onClick={() => { setRoteiroId(r.id); setEntregaBal({}); setSel(null); }} aria-pressed={roteiroId === r.id}
                className={`text-sm font-semibold rounded-full border px-3 py-1 whitespace-nowrap cursor-pointer ${roteiroId === r.id ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-light)] hover:bg-[var(--bg-tertiary)]"}`}>{r.rotulo}</button>
            ))}
          </div>
          {roteiro && <span className="hidden lg:block text-sm text-[var(--text-secondary)] min-w-0 truncate">{roteiro.pedido}</span>}
          <button onClick={sairAula} className="ml-auto text-sm font-semibold rounded-full border border-[var(--border-light)] px-4 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer">✕ Sair (Esc)</button>
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Coluna do prédio */}
        <div className="flex-1 min-w-0 md:min-h-0 md:overflow-y-auto p-3 md:p-4 flex flex-col gap-3">
          {!aula && !arrumar && avisoSalvo && (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
              <span className="mr-auto">✔ Posições salvas. Agora cada um aparece onde está <b>de verdade</b>: quem está livre vai para o lugar de <b>livre</b>{avisoSalvo === "trab" ? " (e só vai para a mesa quando pegar uma tarefa)" : ""}.</span>
              <button onClick={() => { abrirArrumar(); setAlvo(avisoSalvo === "trab" ? "livre" : "trab"); setAvisoSalvo(null); }} className="text-sm font-bold rounded-full border border-[var(--accent)] bg-[var(--accent)] text-white px-3.5 py-1 cursor-pointer">Arrumar {avisoSalvo === "trab" ? "o lugar de livre" : "as mesas"}</button>
              <button onClick={() => setAvisoSalvo(null)} className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3 py-1 cursor-pointer">Ok</button>
            </div>
          )}
          {!aula && arrumar && (
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold mr-1">✋ Arrumar posições</span>
                <div className="flex gap-1.5" role="group" aria-label="Qual posição arrumar">
                  {([["trab", "🪑 Trabalhando (na mesa)"], ["livre", "🧍 Livre"]] as [Alvo, string][]).map(([k, r]) => (
                    <button key={k} onClick={() => setAlvo(k)} aria-pressed={alvo === k}
                      className={`text-sm font-semibold rounded-full border px-3.5 py-1.5 cursor-pointer ${alvo === k ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-light)] hover:bg-[var(--bg-tertiary)]"}`}>{r}</button>
                  ))}
                </div>
                <span className="ml-auto flex flex-wrap gap-2">
                  <button onClick={() => setConfirmaPadrao(true)} disabled={salvando} className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3.5 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer">↺ Voltar ao padrão</button>
                  <button onClick={fecharArrumar} disabled={salvando} className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3.5 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer">Cancelar</button>
                  <button onClick={salvar} disabled={salvando} className="text-sm font-bold rounded-full border border-[var(--accent)] bg-[var(--accent)] text-white px-4 py-1.5 cursor-pointer disabled:opacity-60">{salvando ? "Salvando…" : "Salvar"}</button>
                </span>
              </div>
              <p className="m-0 text-[13px] text-[var(--text-secondary)]">Arraste cada mascote para onde ele deve ficar quando estiver <b>{alvo === "trab" ? "trabalhando" : "livre"}</b>. O ponto é o pé do mascote. Os balões ficam escondidos enquanto você arruma.</p>
              {confirmaPadrao && (
                <div role="alertdialog" aria-label="Confirmar voltar ao padrão" className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2 text-sm">
                  <span className="mr-auto">Voltar todos os mascotes às posições de fábrica? Só vale depois de clicar em Salvar.</span>
                  <button onClick={voltarPadrao} className="text-sm font-bold rounded-full border border-[var(--accent)] bg-[var(--accent)] text-white px-3.5 py-1 cursor-pointer">Sim, voltar</button>
                  <button onClick={() => setConfirmaPadrao(false)} className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3.5 py-1 cursor-pointer">Não</button>
                </div>
              )}
              {erroPos && <p role="alert" className="m-0 text-sm text-[#B3402A]">{erroPos}</p>}
            </div>
          )}
          {!aula && !arrumar && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-[var(--text-secondary)] mr-auto">
                {erro ? "Sem resposta da central agora: mostrando todos livres." : "A equipe ao vivo. Clique num agente para ver o que ele faz."}
              </p>
              <BotaoAnim anim={anim} onClick={alternarAnim} />
              <button onClick={alternarSom} aria-pressed={som} title={som ? "Desligar os sons" : "Ligar os sons (digitação baixinha e plim na entrega)"}
                className={`text-sm font-semibold rounded-full border px-3.5 py-1.5 cursor-pointer ${som ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-light)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"}`}>
                {som ? "🔊 Sons" : "🔇 Sons"}
              </button>
              <button onClick={abrirArrumar} disabled={celular}
                title={celular ? "Arrume pelo computador" : "Arraste os mascotes para onde quiser"}
                className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3.5 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                ✋ Arrumar posições
              </button>
              {celular && <span className="text-xs text-[var(--text-muted)]">Arrume pelo computador.</span>}
              <button onClick={entrarAula} title="Tela cheia com uma cena de exemplo, sem dado real"
                className="text-sm font-semibold rounded-full border border-[var(--border-light)] px-3.5 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                🎬 Modo aula
              </button>
            </div>
          )}
          {aula && (
            <div className="flex justify-end gap-2">
              <BotaoAnim anim={anim} onClick={alternarAnim} />
              <button onClick={alternarSom} aria-pressed={som}
                className={`text-sm font-semibold rounded-full border px-3.5 py-1.5 cursor-pointer ${som ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-light)] hover:bg-[var(--bg-tertiary)]"}`}>
                {som ? "🔊 Sons" : "🔇 Sons"}
              </button>
            </div>
          )}

          {aula && !roteiro && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10">
              <p className="text-lg font-semibold m-0">Qual cena você quer mostrar?</p>
              <div className="flex flex-wrap justify-center gap-4">
                {ROTEIROS.map((r) => (
                  <button key={r.id} onClick={() => setRoteiroId(r.id)}
                    className="w-72 text-left rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-5 hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    <span className="block text-xl font-bold">{r.rotulo}</span>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[var(--uau)] mt-1">{r.descricao}</span>
                    <span className="block text-sm text-[var(--text-secondary)] mt-3">{r.pedido}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] m-0">Cena de exemplo, com dados fictícios. Dura cerca de 1 minuto e repete.</p>
            </div>
          )}
          <div className={`overflow-x-auto max-md:-mx-3 max-md:px-3 [touch-action:pan-x_pan-y_pinch-zoom] overscroll-x-contain ${aula && !roteiro ? "hidden" : ""}`}>
            <div className="max-md:min-w-[780px] mx-auto"
              style={{ width: `min(100%, calc((100dvh - ${aula ? 120 : 215}px) * ${LARGURA / ALTURA}))` }}>
              <div ref={palco} className="esc-palco" style={{ aspectRatio: `${LARGURA} / ${ALTURA}` }} onClick={() => setSel(null)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/escritorio/sede.webp" alt="Prédio do escritório em cortes, com as salas da equipe" draggable={false}
                  className="absolute inset-0 w-full h-full" />
                {anim && <Ambiente cafe={cafeNoAr} />}
                {SALAS.map((s) => (
                  <span key={s.id} className="esc-sala" style={{ left: `${(s.x / LARGURA) * 100}%`, top: `${(s.y / ALTURA) * 100}%` }}>{s.rotulo}</span>
                ))}
                {aula && checkpoints.map((cp) => {
                  const dt = aulaT - cp.de;
                  const duracao = cp.pedido ? 3.2 : CP_DURACAO;
                  if (dt < 0 || dt >= duracao) return null;
                  const aprovado = !cp.pedido && dt >= CP_ESPERA;
                  return (
                    <div key={cp.de} data-id="andreia" data-sala="comando" data-x={POS_ANDREIA.x} data-y={POS_ANDREIA.y} className="esc-ag trab" style={{ left: `${(POS_ANDREIA.x / LARGURA) * 100}%`, top: `${(POS_ANDREIA.y / ALTURA) * 100}%`, zIndex: 2500, ["--w" as string]: `${(62 / LARGURA) * 100}cqw`, cursor: "default" }}>
                      <span className="esc-luz" />
                      <span className="esc-af">AF</span>
                      <span className="esc-nome">Andréia</span>
                      <span key={aprovado ? "ok" : "pede"} data-prio={0} className={`esc-fala ${aprovado ? "ok" : ""}`}>{aprovado ? cp.ok : cp.espera}</span>
                    </div>
                  );
                })}
                {ordenados.map((a) => {
                  const p = ondeEsta(a);
                  const v = vivos[a.id];
                  const trab = p.modo === "trab";
                  const g = geomMascote(a.id);
                  const cortePx = g.rodape + p.sit * g.alt; // faixa de baixo escondida (atrás da mesa)
                  const cq = (px: number) => `${(px / LARGURA) * 100}cqw`;
                  const ent = entregaBal[a.id];
                  const verEntrega = !arrumar && ent && ent.ate > Date.now();
                  const verOcio = !arrumar && p.modo === "livre" && ocioVis[a.id] > Date.now();
                  const temBalao = !arrumar && (verEntrega || trab || verOcio || p.modo === "cafe" || p.modo === "sofa");
                  return (
                    <button key={a.id} type="button" data-id={a.id} data-sala={p.modo === "cafe" || p.modo === "sofa" ? "hall" : a.sala} data-x={p.x} data-y={p.y}
                      className={`esc-ag ${trab ? "trab" : "livre"} ${sel === a.id ? "sel" : ""} ${arrumar ? "arr" : ""} ${arrastando === a.id ? "arrastando" : ""}`}
                      style={{ left: `${(p.x / LARGURA) * 100}%`, top: `${(p.y / ALTURA) * 100}%`, zIndex: arrastando === a.id ? 3000 : Math.round(p.y) + (temBalao ? 1200 : 0) }}
                      onPointerDown={(e) => comecaArraste(e, a)} onPointerMove={(e) => moveArraste(e, a)} onPointerUp={fimArraste} onPointerCancel={fimArraste}
                      aria-label={`${a.nome}, ${a.cargo}: ${trab ? (v?.tarefaTxt ?? "trabalhando") : "livre"}`}
                      onClick={(e) => { e.stopPropagation(); if (!arrumar) setSel(sel === a.id ? null : a.id); }}>
                      {trab && <span className="esc-luz" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/mascotes/${a.id}-${a.id === "jarbas" ? 512 : 256}.webp`} alt="" draggable={false}
                        style={{ width: cq(g.w), left: cq(g.esq), marginBottom: `calc(${cq(-cortePx)})`, clipPath: p.sit > 0 ? `inset(0 0 ${((cortePx / g.w) * 100).toFixed(2)}% 0)` : undefined }} />
                      <span className="esc-nome">{a.nome}</span>
                      {arrumar ? null : verEntrega ? (
                        <span key="ent" data-prio={1} className="esc-fala ok">{ent.texto}</span>
                      ) : trab ? (
                        <span key="trab" data-prio={2} className="esc-fala">
                          {v?.tarefaTxt ?? "Trabalhando"}
                          {!!v?.mais && v.mais > 0 && <b className="ml-1 opacity-80">+{v.mais}</b>}
                          {typeof v?.progresso === "number" && <span className="esc-barra block"><i style={{ width: `${Math.round(v.progresso * 100)}%` }} /></span>}
                        </span>
                      ) : p.modo === "cafe" ? (
                        <span key="cafe" data-prio={3} className="esc-fala ocio">☕ pausa pro café</span>
                      ) : p.modo === "sofa" ? (
                        <span key="sofa" data-prio={3} className="esc-fala ocio">💤 zzz</span>
                      ) : verOcio ? (
                        <span key="ocio" data-prio={4} className="esc-fala ocio">{a.ocio}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cartão do agente */}
          {selPerfil && (
            <Cartao
              a={selPerfil} v={vivos[selPerfil.id]} aula={aula} servidora={servidora}
              entregas={dados?.entregas[selPerfil.id]}
              desdeRegistro={vivos[selPerfil.id]?.desde}
              onFechar={() => setSel(null)}
              onConversar={() => { setConversa(selPerfil.id); setSel(null); }}
            />
          )}
        </div>

        {/* Conversa embutida: no lugar do mural (lateral no computador, embaixo no celular) */}
        {conversa && !aula && (
          <aside className="md:w-[400px] lg:w-[440px] shrink-0 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-primary)] flex flex-col min-h-0 h-[72dvh] md:h-auto">
            <ChatPage compacto servidora={servidora} agenteFixo={conversa} aoFechar={() => setConversa(null)} />
          </aside>
        )}

        {/* Mural */}
        <aside className={`md:w-[330px] lg:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-secondary)] p-4 md:overflow-y-auto flex flex-col gap-3 ${conversa && !aula ? "hidden" : ""}`}>
          <h3 className="m-0 text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">Agora no escritório</h3>
          <div className="grid grid-cols-3 gap-2">
            {[[placar.t, "trabalhando"], [placar.l, "livres"], [placar.e, "entregas hoje"]].map(([n, r]) => (
              <div key={r} className="rounded-xl bg-[var(--bg-tertiary)] py-2.5 px-1 text-center text-[11.5px] text-[var(--text-secondary)]">
                <b className="block text-2xl font-bold text-[var(--accent)] tabular-nums">{n}</b>{r}
              </div>
            ))}
          </div>
          <h3 className="m-0 mt-1 flex justify-between items-baseline text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
            <span>Mural de atividades</span>
            <em className="not-italic normal-case tracking-normal text-[var(--uau)]">{aula ? "exemplo" : "ao vivo"}</em>
          </h3>
          <ul className="list-none m-0 p-0">
            {mural.map((e) => {
              const p = perfil(e.agente);
              return (
                <li key={e.id} className="grid grid-cols-[34px_1fr_auto] gap-2.5 items-center text-[13px] py-2 border-b border-dashed border-[var(--border)]">
                  {e.agente === "andreia" ? <AvatarAF tamanho={34} /> : <Mascote nome={p?.nome} tamanho={34} />}
                  <span className="min-w-0"><b className="font-bold">{e.agente === "andreia" ? "Andréia" : p?.nome}</b> {e.texto}</span>
                  <small className="text-[var(--text-muted)] tabular-nums whitespace-nowrap">{aula ? e.em : hhmm(e.em)}</small>
                </li>
              );
            })}
            {!mural.length && <li className="text-[13px] text-[var(--text-secondary)] py-2">{erro ? "Sem conexão com a central." : aula ? "A cena vai começar…" : "Nada registrado ainda."}</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function BotaoAnim({ anim, onClick }: { anim: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={anim} title={anim ? "Desligar as animações do ambiente" : "Ligar as animações do ambiente (planetas, telas, luzes, relógio, café)"}
      className={`text-sm font-semibold rounded-full border px-3.5 py-1.5 cursor-pointer ${anim ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-light)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"}`}>
      ✨ Animações
    </button>
  );
}

function AvatarAF({ tamanho }: { tamanho: number }) {
  return <span aria-hidden style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    className="shrink-0 rounded-full bg-[#C4A460] text-[#0F2A2E] font-extrabold flex items-center justify-center">AF</span>;
}

// 23/10 (pedido dela): "3 melhorias no sistema... quais?" Lista o que foi feito hoje, item por item
// (registro de atividades + livro-caixa; nada é gerado)
function QuaisHoje({ agente }: { agente: string }) {
  const [itens, setItens] = useState<{ em: string; agente: string; texto: string }[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const abrir = async () => {
    setAberto(!aberto);
    if (itens || aberto) return;
    try { const j = await (await squadFetch("/api/numeros/dia")).json(); setItens((j.itens || []).filter((x: { agente: string }) => x.agente === agente)); }
    catch { setItens([]); }
  };
  return (
    <div className="mt-1">
      <button type="button" onClick={abrir} className="text-[12px] font-semibold text-[var(--accent)] hover:underline cursor-pointer">{aberto ? "▾ fechar" : "▸ ver quais"}</button>
      {aberto && (itens === null ? <p className="text-[12px] m-0">Carregando…</p>
        : <ul className="m-0 mt-1 pl-4 text-[12.5px] space-y-0.5">{itens.length ? itens.map((x, k) => (
            <li key={k}>{new Date(x.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })} · {x.texto}</li>
          )) : <li>Sem detalhe registrado.</li>}</ul>)}
    </div>
  );
}

function Cartao({ a, v, aula, servidora, entregas, desdeRegistro, onFechar, onConversar }: {
  a: PerfilAgente; v?: Vivo; aula: boolean; servidora: boolean;
  entregas?: { texto: string; qtd: number; pessoal?: boolean }[];
  desdeRegistro?: string; onFechar: () => void; onConversar: () => void;
}) {
  const trab = v?.estado === "trabalhando";
  const lista = (entregas ?? []).filter((e) => !(servidora && e.pessoal));
  return (
    <section aria-label={`Cartão de ${a.nome}`} className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_10px_30px_var(--sombra)] p-4 grid gap-4 items-center grid-cols-[72px_1fr] md:grid-cols-[90px_1.3fr_1fr_1fr_auto]">
      <Mascote nome={a.nome} tamanho={84} grande className="max-md:!w-[72px] max-md:!h-[72px]" />
      <div className="min-w-0">
        <h4 className="m-0 text-[17px] font-bold">{a.nome} · {a.cargo}</h4>
        <p className="m-0 mt-1 text-[13px] text-[var(--text-secondary)]">
          {trab
            ? <>{v?.tarefaTxt ?? "Trabalhando"}{v?.desde && !aula ? <> Começou às {hhmm(v.desde)}.</> : null}</>
            : <>Livre agora. {aula ? "Esperando a vez no roteiro de exemplo." : a.ocio.replace(/^\S+\s/, "Costuma estar ") + "."}</>}
        </p>
      </div>
      <div className="max-md:col-span-2">
        <span className="block text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--text-secondary)]">Entregou hoje</span>
        {aula ? <p className="m-0 mt-1 text-[13px] text-[var(--text-secondary)]">Exemplo, sem dado real.</p>
          : lista.length
            ? <><ul className="m-0 mt-1 pl-4 text-[13px]">{lista.slice(0, 4).map((e) => <li key={e.texto}>{e.qtd} {e.texto}</li>)}</ul>
              {!servidora && <QuaisHoje agente={a.id} />}</>
            : <p className="m-0 mt-1 text-[13px] text-[var(--text-secondary)]">Nada registrado hoje.</p>}
      </div>
      <div className="max-md:col-span-2">
        <span className="block text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--text-secondary)]">Último registro</span>
        <p className="m-0 mt-1 text-[13px] text-[var(--text-secondary)]">{!aula && !trab && desdeRegistro ? hhmm(desdeRegistro) : aula ? "—" : trab ? "em andamento" : "sem registro no livro-caixa"}</p>
      </div>
      <div className="grid gap-2 max-md:col-span-2 max-md:grid-cols-2">
        <button onClick={onConversar} disabled={aula}
          className="text-[13px] font-extrabold rounded-full px-4 py-2 border-[1.5px] border-[var(--accent)] bg-[var(--accent)] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">💬 Conversar</button>
        <button disabled title="Ainda não há link para a entrega"
          className="text-[13px] font-extrabold rounded-full px-4 py-2 border-[1.5px] border-[var(--accent)] text-[var(--accent)] opacity-50 cursor-not-allowed">Ver entrega</button>
      </div>
      <button onClick={onFechar} aria-label="Fechar cartão" className="absolute top-2 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none cursor-pointer">×</button>
    </section>
  );
}
