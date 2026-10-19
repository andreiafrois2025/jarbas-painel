"use client";

import Link from "next/link";
import { useStatus, NIVEL_UI } from "@/lib/status";
import { useMetricsHistory, tempoRelativo } from "@/lib/metrics";
import { useIntegracoes } from "@/lib/integracoes";
import { useSaudeResumo, useAutomacoesCron, type AutomacaoCron } from "@/lib/saude";
import { interpretaCron, formataProxima } from "@/lib/cron";
import { usePainel } from "@/lib/painel-context";
import { ehPessoal } from "@/lib/modo";
import Mascote from "./Mascote";
import { CartaoSecao, LinhaItem, Pilula, type Tom } from "./ui";

// =============================================================
// 🩺 Máquina › Saúde — uma tela só para "está tudo funcionando?".
//
// 19/10/2026: redesenhada conforme o mock aprovado (saude-novo). Antes eram duas
// sub-abas (Do sistema e Integrações); agora tudo cabe numa tela: faixa do estado
// geral, três colunas (serviços, conexões, rotinas de hoje) e, embaixo, gasto do
// mês e últimos avisos.
//
// De onde vem cada dado:
//  - status.json (VPS, a cada 5 min): semáforo, sinais vitais, disco, memória,
//    pm2, trava do grupo, backup.
//  - /api/saude/resumo (squad-api): controle remoto, Outlook, Pluggy, Codex,
//    custos e últimos avisos (só leitura, sem segredo).
//  - /api/integracoes: ping do Notion.   - /api/catalogo: rotinas e última execução.
// O que não tem fonte aparece como "sem dado" — nunca inventamos.
// =============================================================

const HORA = 3600_000;
const idadeH = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / HORA : null);

const TOM_BANNER = {
  verde: "var(--success)", amarelo: "var(--warning)", vermelho: "var(--danger)",
} as const;

interface Linha { chave: string; titulo: string; detalhe: string; tom: Tom; rotulo: string }

const SEM_DADO = (chave: string, titulo: string, detalhe = "não consegui ler agora"): Linha =>
  ({ chave, titulo, detalhe, tom: "neutro", rotulo: "sem dado" });

export default function SaudePage() {
  const { status: vivo, mudo, carregando } = useStatus();
  const { hoje } = useMetricsHistory();
  const { servidora } = usePainel();
  const { dados: extra, erro: erroExtra } = useSaudeResumo();
  const { integracoes } = useIntegracoes();
  const { automacoes } = useAutomacoesCron();

  const nivel = (mudo ? "vermelho" : (vivo?.nivel ?? hoje?.saude?.nivel)) as keyof typeof NIVEL_UI | undefined;
  const ui = nivel ? NIVEL_UI[nivel] : undefined;
  const problemas: string[] = mudo
    ? ["A VPS parou de publicar o estado — pode estar fora do ar"]
    : (vivo?.problemas ?? hoje?.saude?.problemas ?? []);
  const sinais = (vivo?.sinais_vitais ?? {}) as Record<string, boolean | undefined>;
  const disco = vivo?.disco_pct ?? hoje?.saude?.disco_pct ?? null;
  const memLivre = vivo?.vigias?.memoria_livre_pct;
  const memUso = memLivre != null ? Math.round(100 - memLivre) : null;

  // ── Serviços ──
  const sim = (v: boolean | undefined | null, ok: string, fora: string): Pick<Linha, "tom" | "rotulo"> =>
    v === true ? { tom: "ok", rotulo: ok } : v === false ? { tom: "fora", rotulo: fora } : { tom: "neutro", rotulo: "sem dado" };
  const pm2 = vivo?.vigias?.pm2?.["squad-api"];
  const pausado = vivo?.fila_kanban?.envio_pausado;
  const servicos: Linha[] = [
    { chave: "tg", titulo: "Jarbas no Telegram", detalhe: (sinais.bot_telegram ?? sinais.telegram) === false ? "não está respondendo" : "respondendo",
      ...sim(sinais.bot_telegram ?? sinais.telegram, "no ar", "fora") },
    { chave: "wa", titulo: "Donna no WhatsApp", detalhe: sinais.whatsapp === false ? "desconectada" : "conectada",
      ...sim(sinais.whatsapp, "no ar", "fora") },
    { chave: "painel", titulo: "Painel e chat", detalhe: "squad-api ativa",
      ...(pm2 ? sim(pm2 === "online", "no ar", "fora") : extra ? { tom: "ok" as Tom, rotulo: "no ar" } : { tom: "neutro" as Tom, rotulo: "sem dado" }) },
    extra
      ? { chave: "remoto", titulo: "Controle remoto", detalhe: "sessão permanente", ...sim(extra.servicos.claude_remoto, "no ar", "fora") }
      : SEM_DADO("remoto", "Controle remoto", erroExtra ? "a VPS não respondeu" : "lendo…"),
    pausado === undefined
      ? SEM_DADO("grupo", "Grupo da comunidade")
      : { chave: "grupo", titulo: "Grupo da comunidade",
          detalhe: pausado ? "trava ligada (seu pedido)" : "envio automático ligado",
          tom: pausado ? "atencao" : "ok", rotulo: pausado ? "pausado" : "enviando" },
  ];

  // ── Conexões ──
  const conexoes: Linha[] = [];
  const cal = sinais.container, drive = vivo?.crons?.backup_diario?.ok;
  conexoes.push(cal === undefined && drive === undefined
    ? SEM_DADO("google", "Google (Agenda e Drive)")
    : { chave: "google", titulo: "Google (Agenda e Drive)", detalhe: "conta do Jarbas e conectores do Claude",
        tom: cal === false || drive === false ? "fora" : "ok", rotulo: cal === false || drive === false ? "com problema" : "ok" });
  const notion = integracoes?.find((i) => i.nome === "Notion");
  conexoes.push(!notion || notion.ok == null
    ? SEM_DADO("notion", "Notion", "tarefas, radar, finanças")
    : { chave: "notion", titulo: "Notion", detalhe: "tarefas, radar, finanças", tom: notion.ok ? "ok" : "fora", rotulo: notion.ok ? "ok" : "com problema" });
  const ol = extra?.conexoes.outlook;
  if (!ol || !ol.ultima_atividade_em) conexoes.push(SEM_DADO("outlook", "Outlook (ponte do ChatGPT)", "sem registro da ponte"));
  else {
    const h = idadeH(ol.ultima_atividade_em) ?? 0;
    conexoes.push({ chave: "outlook", titulo: "Outlook (ponte do ChatGPT)",
      detalhe: `última atividade ${tempoRelativo(ol.ultima_atividade_em)}${ol.prazos_abertos != null ? ` · ${ol.prazos_abertos} ${ol.prazos_abertos === 1 ? "prazo" : "prazos"} a vencer` : ""}`,
      tom: h > 24 * 7 ? "atencao" : "ok", rotulo: h > 24 * 7 ? "parada" : "ok" });
  }
  const cx = extra?.conexoes.codex;
  conexoes.push(!cx || !cx.ultimo_uso_em
    ? SEM_DADO("codex", "ChatGPT / Codex", "imagens pela sua assinatura")
    : { chave: "codex", titulo: "ChatGPT / Codex",
        detalhe: `último uso ${tempoRelativo(cx.ultimo_uso_em)}${cx.imagens_mes != null ? ` · ${cx.imagens_mes} imagens no mês` : ""}`,
        tom: cx.ultimo_ok === false ? "atencao" : "ok", rotulo: cx.ultimo_ok === false ? "atenção" : "ok" });
  const pl = extra?.conexoes.pluggy.ultima_leitura_em;
  conexoes.push(!pl
    ? SEM_DADO("pluggy", "Pluggy (bancos)", "sem registro de leitura")
    : { chave: "pluggy", titulo: "Pluggy (bancos)", detalhe: `última leitura ${tempoRelativo(pl)}`,
        tom: (idadeH(pl) ?? 0) > 36 ? "atencao" : "ok", rotulo: (idadeH(pl) ?? 0) > 36 ? "atenção" : "ok" });

  // ── Rotinas de hoje ──
  const PRINCIPAIS: [RegExp, string][] = [
    [/Heartbeat/i, "Notícias e dicas do grupo"],
    [/Ronda di[aá]ria/i, "Ronda diária"],
    [/Backup di[aá]rio/i, "Backup"],
    [/Snapshot di[aá]rio de m[eé]tricas/i, "Snapshot de métricas"],
    [/Ponte Radar/i, "Radar → Instagram"],
  ];
  const rotinas = automacoes
    ? PRINCIPAIS.map(([re, rotulo]) => {
        const a: AutomacaoCron | undefined = automacoes.find((x) => re.test(x.nome));
        if (!a) return null;
        const info = interpretaCron(a.agenda);
        const idade = idadeH(a.ultima_execucao);
        const limiteH = (info.frequenciaMin * 1.5 + 30) / 60;
        const tom: Tom = idade == null ? "neutro" : idade <= limiteH ? "ok" : "atencao";
        return { chave: rotulo, titulo: rotulo,
          detalhe: `próxima ${formataProxima(info.proxima)} · ${a.ultima_execucao ? `última ${tempoRelativo(a.ultima_execucao)}` : "sem registro da última"}`,
          tom, rotulo: tom === "ok" ? "em dia" : tom === "atencao" ? "atrasada" : "sem dado",
          dica: a.log_compartilhado ? "o registro dessa rotina é compartilhado: sinal indireto" : undefined };
      }).filter((x): x is NonNullable<typeof x> => !!x)
    : null;

  // ── Gasto do mês ──
  const cu = extra?.custos;
  const gastos: Linha[] = extra && cu ? [
    cu.claude
      ? { chave: "claude", titulo: "Claude (assinatura)", detalhe: `uso dos últimos ${cu.claude.dias} dias${cu.claude.medido_em ? ` · medido ${tempoRelativo(cu.claude.medido_em)}` : ""}`, tom: "neutro", rotulo: `${cu.claude.mensagens_semana} mensagens` }
      : SEM_DADO("claude", "Claude (assinatura)", "ainda sem medição de uso"),
    { chave: "gemini", titulo: "Gemini (Donna e Louis)",
      detalhe: cu.gemini.valor_brl == null
        ? `${cu.gemini.chamadas_mes} chamadas medidas no mês · valor em R$ ainda não é medido`
        : "até hoje no mês",
      tom: "neutro", rotulo: cu.gemini.valor_brl == null ? "sem valor em R$" : `R$ ${cu.gemini.valor_brl.toFixed(2).replace(".", ",")}` },
    cx && cx.imagens_mes != null
      ? { chave: "codex", titulo: "Codex (imagens)", detalhe: `dentro da sua assinatura${cx.falhas_mes ? ` · ${cx.falhas_mes} tentativas falharam` : ""}`, tom: "neutro", rotulo: `${cx.imagens_mes} imagens` }
      : SEM_DADO("codex", "Codex (imagens)", "sem registro de uso"),
  ] : [SEM_DADO("claude", "Claude (assinatura)", erroExtra ? "a VPS não respondeu" : "lendo…"),
       SEM_DADO("gemini", "Gemini (Donna e Louis)", erroExtra ? "a VPS não respondeu" : "lendo…"),
       SEM_DADO("codex", "Codex (imagens)", erroExtra ? "a VPS não respondeu" : "lendo…")];

  const visivel = <T extends { titulo: string; detalhe: string }>(l: T[]) =>
    servidora ? l.filter((x) => !ehPessoal(x.titulo, x.detalhe)) : l;

  const corBanner = nivel ? TOM_BANNER[nivel] : "var(--text-secondary)";
  const textoSub = carregando && !vivo
    ? "lendo o estado da VPS…"
    : [
        problemas.length ? `${problemas.length} ${problemas.length === 1 ? "ponto" : "pontos"} de atenção abaixo` : "Nenhum problema aberto",
        vivo?.gerado_em ? `última conferência ${tempoRelativo(vivo.gerado_em)}` : null,
        "o Junior vigia isso pra você",
      ].filter(Boolean).join(" · ");

  const Lista = ({ itens }: { itens: (Linha & { dica?: string })[] }) => (
    <ul>
      {itens.map((i) => (
        <LinhaItem key={i.chave} titulo={i.titulo} detalhe={i.detalhe} direita={<Pilula tom={i.tom} title={i.dica}>{i.rotulo}</Pilula>} />
      ))}
    </ul>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-4 w-full">
        <div className="rounded-2xl p-4 md:p-5 flex flex-wrap items-center gap-x-4 gap-y-3"
          style={{ background: `color-mix(in srgb, ${corBanner} 14%, var(--bg-secondary))`, border: `1px solid color-mix(in srgb, ${corBanner} 25%, transparent)` }}>
          <Mascote nome="junior" emoji="💻" tamanho={56} />
          <div className="min-w-0 flex-1 basis-60">
            <h2 className="fonte-maquina text-[26px] leading-tight" style={{ color: `color-mix(in srgb, ${corBanner} 80%, var(--text-primary))` }}>
              {ui ? ui.label : carregando ? "Conferindo…" : "Sem leitura"}
            </h2>
            <p className="text-[14.5px] text-[var(--text-primary)] mt-0.5">{textoSub}</p>
          </div>
          <span className="rounded-full px-4 py-2 text-[13.5px] font-bold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] whitespace-nowrap">
            disco {disco != null ? `${disco}%` : "sem dado"} · memória {memUso != null ? `${memUso}%` : "sem dado"}
          </span>
        </div>

        <Atencao problemas={problemas} />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <CartaoSecao titulo="Serviços"><Lista itens={visivel(servicos)} /></CartaoSecao>
          <CartaoSecao titulo="Conexões"><Lista itens={visivel(conexoes)} /></CartaoSecao>
          <CartaoSecao titulo="Rotinas de hoje"
            direita={<Link href="/maquina?aba=mapa" className="text-[13.5px] font-extrabold text-[var(--ac)] hover:underline whitespace-nowrap">ver no Mapa ›</Link>}>
            {rotinas === null
              ? <p className="text-sm text-[var(--text-secondary)] py-3">sem dado: não consegui ler as rotinas da VPS agora.</p>
              : <Lista itens={visivel(rotinas)} />}
          </CartaoSecao>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <CartaoSecao titulo="Gasto do mês"><Lista itens={visivel(gastos)} /></CartaoSecao>
          <CartaoSecao titulo="Últimos avisos">
            {!extra
              ? <p className="text-sm text-[var(--text-secondary)] py-3">{erroExtra ? "sem dado: a VPS não respondeu." : "lendo…"}</p>
              : extra.avisos.length === 0
                ? <p className="text-sm text-[var(--text-secondary)] py-3">Nenhum aviso no registro do vigia.</p>
                : (
                  <ul>
                    {extra.avisos.map((a, i) => (
                      <LinhaItem key={i} titulo={a.texto}
                        detalhe={`${a.quando_texto}${a.duracao_min ? ` · durou ${a.duracao_min} min` : ""}`}
                        direita={<Pilula tom={a.resolvido ? "ok" : "atencao"}>{a.resolvido ? "resolvido" : "aberto"}</Pilula>} />
                    ))}
                  </ul>
                )}
          </CartaoSecao>
        </div>
      </div>
    </div>
  );
}

// ── Tradutor de problemas ──────────────────────────────────────────────
// A VPS descreve os problemas em linguagem de máquina ("sinal vital caído:
// whatsapp"). Aqui cada um vira um tópico com: o que significa, o que fazer, e
// principalmente QUEM resolve — ela ou eu. Pedido dela em 25/07: "tem que
// falar em português leigo o que significa e como é a solução, se é eu fazendo
// algo ou se tenho que pedir você".
type QuemResolve = "voce" | "claude" | "sozinho";

interface Explicacao {
  titulo: string;
  significa: string;
  solucao: string;
  quem: QuemResolve;
}

const QUEM: Record<QuemResolve, { rotulo: string; cor: string }> = {
  voce: { rotulo: "👤 Você resolve", cor: "text-emerald-700" },
  claude: { rotulo: "🤖 Me peça", cor: "text-[var(--accent)]" },
  sozinho: { rotulo: "⏳ Se resolve sozinho", cor: "text-[var(--text-muted)]" },
};

function explica(problema: string): Explicacao {
  const p = problema.toLowerCase();

  if (p.includes("sinal vital") && p.includes("whatsapp")) return {
    titulo: "O WhatsApp da Donna caiu",
    significa: "A conexão do WhatsApp com o servidor caiu. A Donna não recebe nem manda mensagem por lá enquanto isso — inclusive os avisos automáticos.",
    solucao: "Costuma voltar sozinho em segundos. Se passar de uns 10 minutos, o celular pode ter desconectado a sessão do WhatsApp Web e é preciso parear de novo.",
    quem: "claude",
  };
  if (p.includes("sinal vital") && p.includes("telegram")) return {
    titulo: "O bot do Telegram caiu",
    significa: "O canal do Telegram parou. Você continua com o WhatsApp funcionando, então não fica sem aviso nenhum.",
    solucao: "Existe um vigia que reinicia sozinho a cada 30 minutos. Se persistir, me chame.",
    quem: "sozinho",
  };
  if (p.includes("sinal vital") && p.includes("gateway")) return {
    titulo: "O porteiro das mensagens caiu",
    significa: "O programa que entrega as mensagens dos agentes parou. Nada sai nem entra até ele voltar.",
    solucao: "Tem religamento automático. Se ficar vermelho por mais de 15 minutos, me peça pra olhar.",
    quem: "claude",
  };
  if (p.includes("sinal vital") && p.includes("container")) return {
    titulo: "O container da Donna parou",
    significa: "É a caixa onde a Donna e o Louis moram. Parada, nenhum dos dois funciona.",
    solucao: "Precisa ser religado no servidor — não dá pra fazer pelo painel.",
    quem: "claude",
  };
  if (p.includes("fila do kanban alta")) {
    const n = problema.match(/(\d+)/)?.[1] ?? "várias";
    return {
      titulo: `${n} notícias esperando sua avaliação`,
      significa: "O Mike buscou e a Izzy escreveu, mas ninguém aprovou nem descartou. A fila só anda com a sua decisão.",
      solucao: "Abrir o Radar no Notion e passar os cards: aprovar o que vale, descartar o resto. Uns minutos resolvem.",
      quem: "voce",
    };
  }
  if (p.includes("pausado")) return {
    titulo: "O envio pro grupo está pausado",
    significa: "Mesmo com notícias aprovadas, nada é enviado pro grupo enquanto estiver pausado. Normalmente alguém pausou de propósito.",
    solucao: "Se foi sem querer, é só despausar. Se não souber quem pausou, me pergunte.",
    quem: "voce",
  };
  if (p.includes("disco em")) {
    const n = problema.match(/(\d+)/)?.[1] ?? "";
    return {
      titulo: `O disco da VPS está em ${n}%`,
      significa: "O espaço do servidor está acabando. Cheio, as automações começam a falhar sem explicação clara.",
      solucao: "Preciso entrar no servidor e limpar arquivos velhos (logs, backups antigos, vídeos já entregues).",
      quem: "claude",
    };
  }
  if (p.includes("cron atrasado") || p.includes("nao rodou") || p.includes("não rodou")) {
    const nome = problema.split(":").pop()?.trim() ?? "uma rotina";
    return {
      titulo: `A rotina "${nome}" não rodou no horário`,
      significa: "Alguma tarefa automática deveria ter rodado e não rodou, ou rodou e não deixou registro.",
      solucao: "Preciso olhar o registro dela pra saber se falhou ou se só atrasou.",
      quem: "claude",
    };
  }
  if (p.includes("briefing") && (p.includes("nao saiu") || p.includes("não saiu") || p.includes("falhou") || p.includes("sem registro"))) return {
    titulo: "O briefing da manhã não chegou",
    significa: "O resumo do dia (agenda + tarefas) deveria ter chegado e não chegou. Normalmente é o WhatsApp que estava fora na hora.",
    solucao: "Você pode pedir pra Donna: \"me manda o briefing\". Se falhar de novo amanhã, me chame.",
    quem: "voce",
  };
  if (p.includes("heartbeat")) return {
    titulo: "O motor central está com a configuração errada",
    significa: "O ritmo do motor que dispara notícias e dicas está fora do valor combinado. Isso pode gastar créditos à toa.",
    solucao: "É correção de configuração no servidor — me peça pra ajustar.",
    quem: "claude",
  };
  if (p.startsWith("ronda diária")) return {
    titulo: "A ronda da manhã achou algo",
    significa: problema.replace(/^ronda diária:\s*/i, ""),
    solucao: "Depende do que ela achou. Me mande esta linha que eu investigo.",
    quem: "claude",
  };
  return {
    titulo: problema,
    significa: "Esse aviso ainda não tem tradução pra português comum aqui.",
    solucao: "Me mande esta linha que eu explico e resolvo.",
    quem: "claude",
  };
}

function Atencao({ problemas }: { problemas: string[] }) {
  if (!problemas.length) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
        ⚠️ Precisa de atenção{" "}
        <span className="text-[var(--text-muted)] font-normal">({problemas.length})</span>
      </h3>
      <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {problemas.map((p, i) => {
          const e = explica(p);
          return (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] border-l-[3px] border-l-amber-500">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-[var(--text-primary)]">{e.titulo}</p>
                <span className={`text-[11px] whitespace-nowrap font-medium ${QUEM[e.quem].cor}`}>
                  {QUEM[e.quem].rotulo}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                <strong className="text-[var(--text-primary)]">O que é:</strong> {e.significa}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                <strong className="text-[var(--text-primary)]">O que fazer:</strong> {e.solucao}
              </p>
              <details className="mt-2">
                <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer select-none">
                  texto técnico original
                </summary>
                <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1 break-words">{p}</p>
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}
