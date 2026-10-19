"use client";

import { useState, useEffect, useCallback, useMemo, Fragment, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Collaborator, Assignment, QuickLink } from "@/lib/types";
import {
  getCategories,
  signOut,
  getCollaborators,
  getAssignments,
  getQuickLinks,
  addQuickLink,
} from "@/lib/storage";
import type { Category as CategoryType } from "@/lib/types";
import JobsMonitor from "./JobsMonitor";
import BuscaGlobal from "./BuscaGlobal";
import BotaoTema from "./BotaoTema";
import Mascote from "./Mascote";
import { PORTAS, PORTA_CONFIG, portaAtiva } from "@/lib/navegacao";
import { PainelContext } from "@/lib/painel-context";
import { useEsperando } from "@/lib/esperando";
import { ProvedorUI } from "./ui";
import {
  type Modo, lerModoGuardado, guardarModo,
  ehColaboradorOculto, ehContextoPessoal, ehPessoal, limpaColaborador,
} from "@/lib/modo";
import type { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
  children: ReactNode;
}

// Shell do painel: sidebar + JobsMonitor + dados compartilhados.
// Vive no layout de rota, então navegar entre páginas não recarrega os dados.
export default function Dashboard({ session, children }: DashboardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  // Modo Servidora/Tudo (Fase 5-A). Abre sempre em "Tudo" numa aba nova; a
  // escolha vale até fechar o navegador (sessionStorage), pra não esquecer
  // ligada. Este componente só monta no navegador (o layout espera o login),
  // então ler o sessionStorage no useState não causa descompasso com o servidor.
  const [modo, setModoState] = useState<Modo>(() => lerModoGuardado());
  const servidora = modo === "servidora";
  const setModo = useCallback((m: Modo) => {
    guardarModo(m);
    setModoState(m);
  }, []);

  const [menuAvatar, setMenuAvatar] = useState(false);
  const { dados: esperando, erro: erroEsperando, recarregar: recarregarEsperando } = useEsperando(servidora);

  const loadData = useCallback(async () => {
    try {
      // 25/07/2026 (F7): saíram daqui duas chamadas que rodavam a CADA abertura
      // do painel — seedDefaultData e migrateFromAgents. Eram a migração de maio
      // (quando "agents" virou "collaborators"), que já terminou: as duas
      // perguntavam ao banco "já migrou?" e ouviam "já", desde então.
      const [categoriesData, collabData, assignData, qlData] = await Promise.all([
        getCategories(),
        getCollaborators(),
        getAssignments(),
        getQuickLinks(),
      ]);
      setCategories(categoriesData);
      setCollaborators(collabData);
      setAssignments(assignData);
      setQuickLinks(qlData);

      // Auto-migrar JARBAS para quick_links se não existir
      try {
        if (qlData.length === 0 || !qlData.some(ql => ql.label === "JARBAS")) {
          await addQuickLink({ label: "JARBAS", url: "https://t.me/jarbas_af_bot", icon: "⚡", order: 0 });
          const updatedQL = await getQuickLinks();
          setQuickLinks(updatedQL);
        }
      } catch (qlErr) {
        console.warn("Aviso: não foi possível criar quick-link JARBAS:", qlErr);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [session.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Celular: busca vira ícone que abre uma linha extra; teclado aberto esconde o menu inferior
  // e a altura do painel segue a área realmente visível (visualViewport), pra caixa de mensagem não sumir.
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [teclado, setTeclado] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const ajustar = () => {
      const aberto = window.innerWidth < 768 && window.innerHeight - vv.height > 120;
      setTeclado(aberto);
      document.documentElement.style.setProperty("--app-h", aberto ? `${vv.height}px` : "100dvh");
      if (aberto) window.scrollTo(0, 0);
    };
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => { vv.removeEventListener("resize", ajustar); vv.removeEventListener("scroll", ajustar); };
  }, []);
  const abrirBusca = () => {
    setBuscaAberta(true);
    setTimeout(() => document.querySelector<HTMLInputElement>("input[aria-label='Procurar em tudo']")?.focus(), 50);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  // Em servidora, o que é pessoal sai das listas ANTES de chegar às telas:
  // colaboradores ocultos, áreas Pessoal/Família (e o que está atribuído nelas)
  // e atalhos pessoais. Uma lista única, em src/lib/modo.ts.
  const visivel = useMemo(() => {
    if (!servidora) return { collaborators, assignments, categories, quickLinks };
    const cats = categories.filter((c) => !ehContextoPessoal(c.context));
    const catIds = new Set(cats.map((c) => c.id));
    const collabs = collaborators.filter((c) => !ehColaboradorOculto(c.name)).map(limpaColaborador);
    const collabIds = new Set(collabs.map((c) => c.id));
    return {
      collaborators: collabs,
      categories: cats,
      assignments: assignments.filter((a) => catIds.has(a.category_id) && collabIds.has(a.collaborator_id) && !ehPessoal(a.tool_name, a.description)),
      quickLinks: quickLinks.filter((q) => !ehPessoal(q.label)),
    };
  }, [servidora, collaborators, assignments, categories, quickLinks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Mascote nome="jarbas" emoji="⚡" tamanho={56} className="animate-pulse" />
          <span className="text-[var(--text-secondary)]">Carregando…</span>
        </div>
      </div>
    );
  }

  const portaBtn = (p: typeof PORTAS[number], extra = "") => {
    const ativo = portaAtiva(pathname, p);
    return (
      <button
        key={p.id}
        onClick={() => router.push(p.path)}
        title={p.title}
        aria-label={p.rotulo}
        aria-current={ativo ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-colors flex-1 min-w-0 max-w-[4.5rem] md:flex-none md:max-w-none md:w-[62px] py-1.5 md:py-2.5 ${extra} ${
          ativo ? "bg-[var(--accent-soft)] text-[var(--ac)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        }`}
      >
        <span className="relative text-xl leading-none" aria-hidden>
          {p.icone}
          {/* Alerta de aprovação: pontinho dourado com o nº de itens de prioridade alta, visível de qualquer tela */}
          {p.id === "conversa" && (esperando?.altas ?? 0) > 0 && (
            <span title={`${esperando!.altas} esperando você com prioridade alta`}
              className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--af-gold)] text-[#2a1f05] text-[10px] font-extrabold leading-4 text-center ring-2 ring-[var(--bg-secondary)]">
              {esperando!.altas}
            </span>
          )}
        </span>
        <span className="text-[10.5px] font-bold leading-none">{p.rotulo}</span>
      </button>
    );
  };

  return (
    <PainelContext.Provider value={{ ...visivel, modo, servidora, setModo, reload: loadData, esperando, erroEsperando, recarregarEsperando }}>
      <ProvedorUI>
      <div className="flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]" style={{ height: "var(--app-h, 100dvh)" }}>
        {/* ===== BARRA DO TOPO ===== */}
        <header className="shrink-0 flex flex-wrap items-center gap-x-1.5 md:gap-x-3 gap-y-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-5 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 md:pt-0 md:pb-0 md:h-[60px] border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <button onClick={() => router.push("/conversa")} className="order-1 flex items-center gap-2 md:gap-2.5 cursor-pointer min-w-0" title="Ir para a Conversa">
            <Mascote nome="jarbas" emoji="⚡" tamanho={36} grande className="max-md:!w-8 max-md:!h-8" />
            <span className="fonte-maquina max-md:!font-[family-name:var(--font-manrope)] max-md:!font-extrabold text-[22px] max-md:text-[18px] leading-none text-[var(--ac)] max-md:text-[var(--text-primary)]">Jarbas</span>
          </button>
          <div className="order-2 md:order-3 flex-1" />
          <div className="order-3 md:order-5 max-md:hidden"><BotaoTema /></div>
          <button onClick={abrirBusca} aria-label="Procurar em tudo" className="order-3 md:hidden w-8 h-8 rounded-full grid place-items-center text-lg cursor-pointer bg-[var(--bg-tertiary)]">🔎</button>
          <div className="order-5 md:order-6 relative">
            <button onClick={() => setMenuAvatar((v) => !v)} aria-label="Menu da conta" aria-expanded={menuAvatar}
              className="w-8 h-8 md:w-[34px] md:h-[34px] rounded-full grid place-items-center text-[13px] font-extrabold cursor-pointer text-white"
              style={{ background: "var(--ouro)" }}>AF</button>
            {menuAvatar && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAvatar(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-1 text-sm">
                  <div className="md:hidden px-2 py-2 flex items-center justify-between gap-2 border-b border-[var(--border)] mb-1"><span className="text-xs font-bold text-[var(--text-secondary)]">Tema</span><BotaoTema /></div>
                  <button onClick={() => { setMenuAvatar(false); router.push("/config"); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">🔧 Ajustes</button>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">🚪 Sair da conta</button>
                </div>
              </>
            )}
          </div>
          <div className="order-6 basis-full md:hidden max-md:h-0" />
          <div className={`order-7 md:order-2 flex-1 md:flex-none md:w-[280px] min-w-0 ${buscaAberta ? "" : "max-md:hidden"}`}><BuscaGlobal /></div>
          {/* Só Igam / Tudo: liga o modo servidora/tudo, que vale em todas as páginas */}
          <div role="group" aria-label="O que mostrar"
            className="order-4 md:order-4 flex shrink-0 rounded-full p-0.5 md:p-1 gap-0.5 text-[12px] md:text-[13px] font-bold bg-[var(--bg-tertiary)]">
            {([["servidora", "🏛️ Só Igam", "Só Igam: esconde finanças, Luiz, casa e agentes pessoais (para projetar em aula)"], ["tudo", "✨ Tudo", "Tudo: mostra o painel completo"]] as const).map(([m, rotulo, dica]) => (
              <button key={m} onClick={() => setModo(m)} aria-pressed={modo === m} title={dica}
                className={`px-2 md:px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap transition-colors ${
                  modo === m ? "bg-[var(--ac)] text-[var(--on-ac)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                {m === "servidora" ? <>🏛️ <span className="max-md:hidden">Só </span>Igam</> : rotulo}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* ===== MENU: 5 portas + ajustes ===== */}
          <nav aria-label="Menu principal"
            className={`order-2 md:order-none shrink-0 md:w-[76px] border-t md:border-t-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] flex md:flex-col items-center justify-around md:justify-start md:pt-[18px] md:gap-2 py-1 md:py-0 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:pb-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:px-0 ${teclado ? "max-md:hidden" : ""}`}>
            {PORTAS.map((p) => portaBtn(p))}
            <div className="hidden md:block flex-1" />
            {portaBtn(PORTA_CONFIG, "md:mb-[18px]")}
          </nav>

          {/* ===== CONTEÚDO ===== */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden order-1 md:order-none min-h-0 bg-[var(--bg-primary)]">
            <JobsMonitor />
            {/* A chave faz as páginas recomeçarem ao trocar de modo: nada do que
                foi carregado em "Tudo" sobra na tela depois de ligar Só Igam. */}
            <Fragment key={modo}>{children}</Fragment>
          </main>
        </div>
      </div>
      </ProvedorUI>
    </PainelContext.Provider>
  );
}
