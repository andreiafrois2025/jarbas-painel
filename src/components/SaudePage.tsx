"use client";

import { useState } from "react";
import { useStatus, NIVEL_UI } from "@/lib/status";
import { useMetricsHistory, tempoRelativo } from "@/lib/metrics";
import { Tile, NOME_AUTOMACAO } from "./MetricasPage";
import type { StatusSaude } from "@/lib/status";

// =============================================================
// 🩺 Saúde — o lugar único pra "está tudo funcionando?".
//
// 25/07/2026 (F3.5): antes essa resposta estava espalhada em quatro telas —
// o semáforo do topo, Métricas › Saúde, Config › Integrações e, desde 24/07,
// a lista de Automações. Cada uma com um pedaço, nenhuma conversando com as
// outras. Foi o buraco entre elas que escondeu por 5 dias uma automação morta.
//
// Agora: o semáforo continua no topo do painel (é o que ela olha primeiro) e
// LEVA pra cá, que é o detalhe. Métricas volta a ser só métrica e Config volta
// a ser só conta.
//
// Os avisos de WhatsApp e Telegram NÃO passam por aqui: saem direto da VPS
// (watchdog.py e status-saude.py) e seguem funcionando com ou sem painel.
// =============================================================

type Aba = "saude" | "integracoes";

export default function SaudePage() {
  const [aba, setAba] = useState<Aba>("saude");

  const botao = (id: Aba, rotulo: string) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all cursor-pointer ${
        aba === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        <h1 className="text-base md:text-lg font-semibold mr-2 md:mr-4 py-3">🩺 Saúde</h1>
        {botao("saude", "❤️ Do sistema")}
        {botao("integracoes", "🔌 Integrações")}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          {aba === "saude" ? <AbaSaude /> : <AbaIntegracoes />}
        </div>
      </div>
    </div>
  );
}

function AbaSaude() {
  const { status: vivo, mudo, carregando } = useStatus();
  const { hoje } = useMetricsHistory();

  if (carregando && !vivo) {
    return <p className="text-sm text-[var(--text-muted)]">lendo o estado da VPS…</p>;
  }

  const nivel = mudo ? "vermelho" : (vivo?.nivel ?? hoje?.saude?.nivel);
  const ui = NIVEL_UI[nivel as keyof typeof NIVEL_UI];
  const problemas: string[] = mudo
    ? ["A VPS parou de publicar o estado — pode estar fora do ar"]
    : (vivo?.problemas ?? hoje?.saude?.problemas ?? []);
  const sinais = Object.entries((vivo?.sinais_vitais ?? hoje?.saude?.sinais ?? {}) as Record<string, boolean>);
  const fila = vivo?.fila_kanban ?? hoje?.fila;
  const automacoes = vivo?.automacoes ?? hoje?.automacoes;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-secondary)]">
        Estado ao vivo, republicado a cada 5 minutos pela VPS
        {vivo?.gerado_em && <> · última leitura {tempoRelativo(vivo.gerado_em)}</>}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile titulo="Estado geral" valor={ui ? `${ui.dot} ${ui.label}` : `⚪ ${nivel ?? "?"}`}
          sub={problemas.length ? problemas.join(" · ") : "nenhum problema aberto"} />
        <Tile icone="⏰" titulo="Rotinas automáticas"
          valor={`${hoje?.saude?.crons_ok ?? "?"}/${hoje?.saude?.crons_total ?? "?"}`}
          sub="rodando no horário" />
        <Tile icone="💾" titulo="Disco da VPS"
          valor={`${vivo?.disco_pct ?? hoje?.saude?.disco_pct ?? "?"}%`} sub="usado" />
        <Tile icone="📬" titulo="Fila do grupo IA"
          valor={fila?.pausado ? "⏸ pausada" : `${fila?.aprovados ?? 0} na fila`}
          sub={`${fila?.pendentes ?? 0} aguardando sua avaliação`} />
      </div>

      <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Sinais vitais</h3>
          <ul className="space-y-1 text-sm text-[var(--text-primary)]">
            {sinais.length === 0 && <li className="text-[var(--text-muted)]">sem leitura agora</li>}
            {sinais.map(([nome, ok]) => (
              <li key={nome} className="flex justify-between">
                <span className="capitalize">{nome}</span>
                <span>{ok ? "✅ no ar" : "❌ fora"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Última execução das automações</h3>
          <ul className="space-y-1 text-sm text-[var(--text-primary)]">
            {Object.entries((automacoes ?? {}) as Record<string, string | null>).map(([k, iso]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{NOME_AUTOMACAO[k] ?? k}</span>
                <span className="text-[var(--text-secondary)] whitespace-nowrap">{tempoRelativo(iso)}</span>
              </li>
            ))}
          </ul>
          <a href="/producao/automacoes" className="text-xs underline decoration-dotted text-[var(--text-secondary)] mt-2 inline-block">
            ver todas as automações →
          </a>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Onde os avisos chegam</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Problema novo é avisado no <strong>WhatsApp</strong>; se o problema for justamente o
            WhatsApp, o aviso vai pelo <strong>Telegram</strong>. Isso sai direto da VPS e funciona
            com o painel fechado.
          </p>
        </div>
      </div>
    </div>
  );
}

function AbaIntegracoes() {
  const { status: st } = useStatus();
  const { hoje } = useMetricsHistory();

  // A leitura do estado agora vem do useStatus compartilhado — este bloco tinha
  // seu próprio fetch, que era o terceiro download do mesmo arquivo por minuto.

  const autom = hoje?.automacoes ?? {};
  const rodouRecente = (iso: string | null | undefined, horas: number) =>
    !!iso && Date.now() - new Date(iso).getTime() < horas * 3600 * 1000;

  const itens: { nome: string; icone: string; ok: boolean | null; detalhe: string; onde: string;
                 links?: { rotulo: string; url: string }[] }[] = [
    {
      nome: "WhatsApp (Donna)", icone: "📱",
      ok: st ? !!st.sinais_vitais?.whatsapp : null,
      detalhe: "Briefing matinal, grupo IA, alertas de falha e avisos de tarefas.",
      onde: "Gateway OpenClaw na VPS (re-parear: openclaw channels)",
      links: [{ rotulo: "WhatsApp Web", url: "https://web.whatsapp.com" }],
    },
    {
      nome: "Telegram (bot)", icone: "💬",
      ok: st ? !!st.sinais_vitais?.telegram : null,
      detalhe: "Canal de fallback: checkpoints das squads, entrega de carrosséis.",
      onde: "claude-telegram.service + OpenClaw",
      links: [{ rotulo: "Abrir bot", url: "https://t.me/jarbas_af_bot" }],
    },
    {
      nome: "Notion", icone: "🗂️",
      ok: hoje ? rodouRecente(autom.status_saude, 2) : null,
      detalhe: "Radar de Posts IA, banco Conteúdos, lista de tarefas, Segundo Cérebro.",
      onde: "Token no container OpenClaw (workspace/notion_radar.py)",
      links: [
        { rotulo: "Radar", url: "https://app.notion.com/p/391b90b9061d81d993b7dc2de46eab87" },
        { rotulo: "Tarefas", url: "https://app.notion.com/p/a73b90b9061d8299899f81c8938e9de6" },
        { rotulo: "Produção de Conteúdo", url: "https://app.notion.com/p/2fbb90b9061d812f9afce74e767879eb" },
      ],
    },
    {
      nome: "Google Gemini", icone: "🤖",
      ok: null,
      detalhe: "Gerador de posts, roteiros de reels e aprendiz de estilo (conta do Jarbas).",
      onde: "GEMINI_API_KEY no container — uso visível nos logs da VPS",
      links: [{ rotulo: "Console (uso/quota)", url: "https://aistudio.google.com" }],
    },
    {
      nome: "Google Calendar", icone: "📅",
      ok: st ? !!st.sinais_vitais?.container : null,
      detalhe: "Agenda do briefing matinal (conta assistentejarbas.ia@gmail.com).",
      onde: "google_calendar_token.json no container",
      links: [{ rotulo: "Abrir agenda", url: "https://calendar.google.com" }],
    },
    {
      nome: "Google Drive (backups e reels)", icone: "☁️",
      ok: st ? st.crons?.backup_diario?.ok ?? null : null,
      detalhe: "Backup diário da VPS + acervo Instagram/Reels + Marca.",
      onde: "rclone remote JarbasDrive2",
      links: [{ rotulo: "Abrir Drive", url: "https://drive.google.com/drive/my-drive" }],
    },
    {
      nome: "Supabase (painel)", icone: "⚡",
      ok: st !== null,
      detalhe: "Login, fluxos, equipe, status e métricas do painel.",
      onde: ".env.local do painel + bucket público status",
      links: [
        { rotulo: "Projeto", url: "https://supabase.com/dashboard/project/pmmyqljiuslstwbmiron" },
        { rotulo: "Deploys (Vercel)", url: "https://vercel.com/andreiafrois2025s-projects/jarbas-painel" },
        { rotulo: "Repositório", url: "https://github.com/andreiafrois2025/jarbas-painel" },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">
        Status ao vivo (semáforo {st ? tempoRelativo(st.gerado_em) : "…"}). Chaves e tokens ficam na VPS — nunca aqui.
      </p>
      {itens.map((i) => (
        <div key={i.nome} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] flex gap-3 items-start">
          <span className="text-2xl">{i.icone}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">{i.nome}</span>
              <span className="text-xs">
                {i.ok === null ? "⚪ sem medição direta" : i.ok ? "🟢 funcionando" : "🔴 com problema"}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{i.detalhe}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Onde vive: {i.onde}</p>
            {i.links && (
              <div className="flex flex-wrap gap-2 mt-2">
                {i.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full border font-medium hover:opacity-80"
                    style={{ borderColor: "#2D6B6B", color: "#2D6B6B" }}>
                    {l.rotulo} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
