"use client";

// 🎤 Modo palco v2 — interativo: clicar num agente abre o cartão com papel e
// habilidades; contadores explicam a origem do número ao clicar.
// ?tema=trabalho → versão serviço público (sem nada de criação de conteúdo,
// e horas de trabalho só aparecem quando forem medidas de verdade).

import { useEffect, useState } from "react";
import { GraficoLinha } from "@/components/charts";
import { useMetricsHistory, semanasOrdenadas } from "@/lib/metrics";
import { EQUIPE, type Agente } from "@/lib/equipe";
import { AUTOMACOES, SEM_IA } from "@/lib/automacoes";

function Contador({ valor, rotulo, detalhe }: { valor: string | number; rotulo: string; detalhe: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <button className="text-center cursor-pointer group" onClick={() => setAberto(!aberto)}>
      <div className="text-5xl md:text-7xl font-bold group-hover:opacity-80 transition-opacity" style={{ color: "#2D6B6B" }}>{valor}</div>
      <div className="mt-2 text-sm md:text-base uppercase tracking-widest" style={{ color: "#6B7A7A" }}>
        {rotulo}
      </div>
      {aberto && (
        <div className="mt-2 text-xs md:text-sm rounded-xl px-3 py-2 max-w-[240px] mx-auto text-left" style={{ background: "#FFFFFF", color: "#2D3B3B" }}>
          {detalhe}
        </div>
      )}
    </button>
  );
}

function CartaoAgente({ agente, onFechar }: { agente: Agente; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(45,59,59,.45)" }} onClick={onFechar}>
      <div className="rounded-2xl p-6 md:p-8 max-w-md w-full" style={{ background: "#F5F0EA", color: "#2D3B3B" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{agente.icone}</span>
          <div>
            <h3 className="text-2xl font-bold">{agente.nome}</h3>
            <p className="text-sm uppercase tracking-widest" style={{ color: "#A0583C" }}>{agente.papel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm md:text-base leading-relaxed">{agente.descricao}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {agente.habilidades.map((h) => (
            <span key={h} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "#FFFFFF", color: "#2D6B6B", border: "1px solid #2D6B6B" }}>
              {h}
            </span>
          ))}
        </div>
        <button onClick={onFechar} className="mt-5 text-sm underline opacity-60 hover:opacity-100">fechar</button>
      </div>
    </div>
  );
}

export default function PalestraPage() {
  const { data, hoje } = useMetricsHistory(5 * 60 * 1000);
  const [trabalho, setTrabalho] = useState(false);
  const [agenteAberto, setAgenteAberto] = useState<Agente | null>(null);

  useEffect(() => {
    setTrabalho(new URLSearchParams(window.location.search).get("tema") === "trabalho");
  }, []);

  if (!data || !hoje) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#F5F0EA" }}>
        <span className="animate-pulse" style={{ color: "#6B7A7A" }}>Carregando…</span>
      </main>
    );
  }

  const taxaSemanal = semanasOrdenadas(data.radar_semanas)
    .filter((s) => s.valor?.taxa !== null && s.valor?.taxa !== undefined)
    .map((s) => ({ label: s.label, valor: Math.round((s.valor.taxa as number) * 100) }));

  const atividadesHoje = Object.values(hoje.atividades_por_agente ?? {}).reduce((a, b) => a + b, 0);
  const horasConteudo = hoje.horas_conteudo ?? hoje.horas_economizadas ?? 0;
  const horasTrabalho = hoje.horas_trabalho; // null até o hub IGAM medir de verdade

  const contadores: { valor: string | number; rotulo: string; detalhe: string }[] = trabalho
    ? [
        { valor: EQUIPE.length, rotulo: "agentes na equipe", detalhe: "Especialistas de IA, cada um com papel definido — toca num deles ali embaixo pra conhecer." },
        { valor: `${hoje.saude?.crons_ok ?? "—"}+`, rotulo: "rotinas automáticas diárias", detalhe: "Verificações, briefings, backups e monitoramentos que rodam sozinhos na VPS, 24h." },
        { valor: atividadesHoje || "—", rotulo: "ações executadas hoje", detalhe: "Contagem real do dia: envios, curadorias, rondas e avisos registrados pelo sistema." },
        ...(horasTrabalho != null
          ? [{ valor: `${Math.round(horasTrabalho)}h`, rotulo: "economizadas no trabalho", detalhe: "Medidas a partir de atas, documentos e automações do serviço público." }]
          : []),
      ]
    : [
        { valor: EQUIPE.length, rotulo: "agentes na equipe", detalhe: "Especialistas de IA, cada um com papel definido — toca num deles ali embaixo pra conhecer." },
        { valor: hoje.fila?.cards_gerados_total ?? "—", rotulo: "notícias e dicas curadas", detalhe: "Todo card que a equipe propôs desde o início — a decisão final é sempre humana." },
        { valor: hoje.enviados_total ?? "—", rotulo: "posts publicados", detalhe: "Posts aprovados por mim que chegaram à comunidade, com agendamento automático." },
        { valor: `${Math.round(horasConteudo)}h`, rotulo: "economizadas em conteúdo", detalhe: `Fórmula transparente: ${data.formula_horas?.post_grupo_min ?? 25} min por post curado + ${data.formula_horas?.carrossel_min ?? 120} min por carrossel produzido.` },
      ];

  return (
    <main className="min-h-screen px-6 py-10 md:px-16 md:py-14 relative" style={{ background: "#F5F0EA", color: "#2D3B3B" }}>
      <a href="/metricas" className="absolute top-3 left-4 text-sm opacity-30 hover:opacity-90 transition-opacity" style={{ color: "#2D3B3B" }}>
        ← painel
      </a>

      <header className="text-center mb-10">
        <p className="text-sm uppercase tracking-[0.3em]" style={{ color: "#A0583C" }}>
          {trabalho ? "Produtividade com IA, na prática" : "IA na prática, de verdade"}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">
          {trabalho ? "Meu escritório de agentes de IA" : "Minha fábrica de conteúdo com IA"}
        </h1>
        <p className="mt-2 text-base md:text-lg" style={{ color: "#6B7A7A" }}>
          {trabalho
            ? "agentes especializados trabalhando 24h · decisão sempre humana"
            : "rodando sozinha numa VPS · curadoria sempre humana · @andreiarfrois"}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-12">
        {contadores.map((c) => <Contador key={c.rotulo} {...c} />)}
      </section>

      {!trabalho && (
        <section className="max-w-3xl mx-auto mb-12 rounded-2xl p-6 md:p-8" style={{ background: "#FFFFFF" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-1">
            A IA aprendendo o meu gosto 📈
          </h2>
          <p className="text-center text-sm mb-4" style={{ color: "#6B7A7A" }}>
            % das pautas propostas pela IA que eu aprovo, semana a semana
          </p>
          <GraficoLinha pontos={taxaSemanal} unidade="%" maxY={100} altura={260} />
        </section>
      )}

      {trabalho && (
        <section className="max-w-3xl mx-auto mb-12 rounded-2xl p-6 md:p-8" style={{ background: "#FFFFFF" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-4">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
            <div><div className="text-3xl mb-2">🤖</div>Agentes especializados monitoram, organizam e preparam o trabalho repetitivo</div>
            <div><div className="text-3xl mb-2">👩🏽</div>A decisão é sempre humana: eu aprovo, ajusto ou descarto num quadro simples</div>
            <div><div className="text-3xl mb-2">📱</div>O sistema me avisa no WhatsApp e se monitora sozinho, 24h por dia</div>
          </div>
        </section>
      )}

      {/* A tese: IA constrói, Python roda — contra o mito do "gastar rios com IA" */}
      <section className="max-w-3xl mx-auto mb-12 rounded-2xl p-6 md:p-8 text-center" style={{ background: "#2D6B6B", color: "#F5F0EA" }}>
        <p className="text-2xl md:text-4xl font-bold">
          {SEM_IA} das {AUTOMACOES.length} automações rodam <u>sem gastar IA</u>
        </p>
        <p className="mt-3 text-sm md:text-base" style={{ color: "#C9D8D5" }}>
          Eu uso IA pra <strong>construir</strong> — depois, é Python rodando de graça, pra sempre.
          A IA só entra onde precisa pensar: escrever, analisar, decidir.
        </p>
      </section>

      <section className="max-w-4xl mx-auto text-center">
        <h2 className="text-lg font-semibold mb-1" style={{ color: "#6B7A7A" }}>
          A equipe (cada um com sua especialidade)
        </h2>
        <p className="text-xs mb-4" style={{ color: "#A0583C" }}>toque num agente pra conhecer 👇</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {EQUIPE.map((a) => (
            <button key={a.nome} onClick={() => setAgenteAberto(a)}
              className="rounded-xl py-3 px-1 cursor-pointer hover:scale-105 transition-transform"
              style={{ background: "#FFFFFF" }}>
              <div className="text-2xl">{a.icone}</div>
              <div className="text-xs mt-1 font-medium">{a.nome}</div>
            </button>
          ))}
        </div>
      </section>

      {agenteAberto && <CartaoAgente agente={agenteAberto} onFechar={() => setAgenteAberto(null)} />}

      <footer className="text-center mt-12 text-sm" style={{ color: "#6B7A7A" }}>
        {trabalho ? "Andréia Frois · IA aplicada ao serviço público" : "andreiafrois.tech · Imersão IA na Prática"}
      </footer>
    </main>
  );
}
