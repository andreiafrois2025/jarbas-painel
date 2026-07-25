// =============================================================
// PERCURSOS — o caminho completo, do começo ao fim.
//
// 25/07/2026. Nasceu de uma pergunta dela: "alguém me pergunta, Andréia, como
// funciona seu envio de conteúdo no WhatsApp? Eu tenho que buscar cada
// automação. Queria ter concentrado um lugar que mostra esse fluxo todo em
// ordem de início, meio e fim."
//
// O painel tinha dois níveis e faltava o de cima:
//   · Automação → uma peça que roda (o Mike buscando, o sender publicando)
//   · Fluxo     → o desenho de dentro de UMA peça
//   · Percurso  → o encadeamento de várias peças até entregar algo   ← este
//
// Um percurso atravessa categorias de propósito: o envio de conteúdo passa por
// Conteúdo & Notícias e por Sistema & Saúde sem pedir licença.
//
// LIMITAÇÃO ASSUMIDA: a ordem dos passos é escrita à mão — não dá pra deduzir
// que uma automação vem depois da outra só olhando o relógio da VPS. O que os
// passos fazem é APONTAR pra automação real, e daí puxar horário, sinal de vida
// e custo ao vivo. Quando um passo apontar pra automação que não existe mais, a
// tela avisa em vez de mentir.
// =============================================================

export type TipoPasso = "automacao" | "voce" | "regra" | "guardado";

export interface PassoPercurso {
  icone: string;
  titulo: string;
  tipo: TipoPasso;
  /** Nome exato da automação no catálogo — é o que liga o passo ao card real. */
  automacao?: string;
  /** Título do fluxo desenhado, quando o passo tem um. */
  fluxo?: string;
  /** Uma linha explicando o que acontece aqui. */
  detalhe?: string;
  /** Só pra tipo "regra": os critérios em ordem, que é como ela gosta de ler. */
  regras?: string[];
  /** Onde a coisa fica guardada (Notion, WhatsApp, Drive). */
  onde?: string;
}

export interface Percurso {
  id: string;
  icone: string;
  titulo: string;
  /** A pergunta que este percurso responde, na voz dela. */
  pergunta: string;
  resumo: string;
  passos: PassoPercurso[];
}

export const PERCURSOS: Percurso[] = [
  {
    id: "conteudo-grupo",
    icone: "📰",
    titulo: "Envio de conteúdo no grupo de IA",
    pergunta: "Como funciona meu envio de conteúdo no WhatsApp?",
    resumo:
      "Da varredura de notícias até a mensagem no grupo. Passa por quatro automações e uma decisão sua — que é onde o percurso para e espera.",
    passos: [
      {
        icone: "🔍",
        titulo: "Mike varre as fontes de notícia",
        tipo: "automacao",
        automacao: "Heartbeat do OpenClaw (notícias/dicas)",
        fluxo: "Notícias diárias — fluxo normal (Mike → Izzy → Grupo IA)",
        detalhe: "Cerca de 28 fontes, de meia em meia hora. A busca em si não usa IA.",
      },
      {
        icone: "🔥",
        titulo: "O detector decide se a notícia é UAU",
        tipo: "regra",
        detalhe: "UAU é a notícia que não pode esperar. Ganha [Prioridade] no título do card.",
        regras: [
          "Lançamento grande de modelo ou empresa relevante",
          "Mudança de regra que afeta quem usa IA no Brasil (LGPD, órgãos públicos)",
          "Movimento dos laboratórios chineses",
          "Rebrand ou virada de estratégia de uma big tech",
        ],
      },
      {
        icone: "✍️",
        titulo: "Izzy escreve o texto do post",
        tipo: "automacao",
        automacao: "Heartbeat do OpenClaw (notícias/dicas)",
        fluxo: "Notícias diárias — fluxo normal (Mike → Izzy → Grupo IA)",
        detalhe: "Notícia via Claude (assinatura), dica via Gemini. É o único passo que gasta IA.",
      },
      {
        icone: "📋",
        titulo: "O card entra no Radar",
        tipo: "guardado",
        onde: "Notion — Radar de Posts IA",
        detalhe: "Chega em 'Pra avaliar'. UAU chega na hora; o resto entra na fila.",
      },
      {
        icone: "👤",
        titulo: "Você aprova, descarta ou agenda",
        tipo: "voce",
        detalhe:
          "É aqui que o percurso para e espera por você. Aprovar manda pra fila; preencher 'Publicar em' escolhe o dia; descartar tira de circulação.",
      },
      {
        icone: "🔢",
        titulo: "A hierarquia decide quem sai primeiro",
        tipo: "regra",
        detalhe: "Definida por você em 25/07. Vale para tudo que está aprovado e liberado.",
        regras: [
          "Enviar agora — sai em até 5 min e não conta no intervalo de 2h",
          "Próximo — primeiro da próxima janela de envio",
          "UAU — na frente das normais, mesmo as já agendadas para o dia",
          "Agendadas — data mais antiga primeiro",
          "Sem data — ordem de aprovação",
        ],
      },
      {
        icone: "📤",
        titulo: "O sender publica no grupo",
        tipo: "automacao",
        automacao: "Heartbeat do OpenClaw (notícias/dicas)",
        detalhe:
          "Janela de 8h às 20h30, com 2h entre um envio e outro, alternando notícia e dica. Fim de semana e feriado: no máximo 4 por dia.",
      },
      {
        icone: "⚡",
        titulo: "Ou sai na hora, se você marcou",
        tipo: "automacao",
        automacao: "Envio imediato do que você marcou (5 em 5 min)",
        fluxo: "Envio imediato marcado no Radar",
        detalhe: "Checagem separada, de 5 em 5 min, só pros cards marcados 'Enviar agora'.",
      },
      {
        icone: "✅",
        titulo: "O card vira 'Enviado' no Radar",
        tipo: "guardado",
        onde: "Notion — Radar de Posts IA",
        detalhe:
          "Com a data preenchida e a marcação de prioridade limpa. Se o aviso ao Notion falhar, o sistema tenta de novo até conseguir.",
      },
    ],
  },

  {
    id: "reels",
    icone: "🎬",
    titulo: "Produção de um reel",
    pergunta: "Como sai um reel, da ideia ao vídeo pronto?",
    resumo:
      "Da pauta ao arquivo editado. O sistema entrega o roteiro; a gravação é sua; a edição volta a ser automática.",
    passos: [
      {
        icone: "💡",
        titulo: "As pautas da semana são geradas",
        tipo: "automacao",
        automacao: "Pautas de reels da semana",
        fluxo: "Pipeline de reels (pauta → roteiro → feedback)",
        detalhe: "Quarta à tarde. Uma chamada de IA por pauta.",
      },
      {
        icone: "👤",
        titulo: "Você escolhe as pautas que valem",
        tipo: "voce",
        detalhe: "No kanban do Notion. O que você não aprovar não vira roteiro.",
      },
      {
        icone: "📝",
        titulo: "Os roteiros são escritos",
        tipo: "automacao",
        automacao: "Heartbeat do OpenClaw (notícias/dicas)",
        fluxo: "Pipeline de reels (pauta → roteiro → feedback)",
        detalhe: "Chegam à noite, pra você ler e deixar a ideia decantar.",
      },
      {
        icone: "🎥",
        titulo: "Você grava",
        tipo: "voce",
        detalhe:
          "Sexta é o dia combinado, sábado é o plano B. Errou? Fala 'corta isso' e segue — a edição limpa depois.",
      },
      {
        icone: "🔔",
        titulo: "A Donna te lembra na sexta",
        tipo: "automacao",
        automacao: "Lembrete de gravar os reels (sexta)",
        fluxo: "Lembrete de gravar os reels (sexta)",
        detalhe: "18h no WhatsApp. Texto fixo, sem IA.",
      },
      {
        icone: "✂️",
        titulo: "Você manda o bruto no Telegram e ele volta editado",
        tipo: "automacao",
        fluxo: 'Reels-studio: edição automática ("meu CapCut")',
        detalhe:
          "Corta silêncios e os trechos com 'corta isso'. Legenda e zoom só se você pedir. Roda na própria VPS, sem IA.",
      },
      {
        icone: "📱",
        titulo: "Você publica",
        tipo: "voce",
        detalhe: "A publicação no Instagram continua sendo manual, por escolha sua.",
      },
    ],
  },

  {
    id: "captura-donna",
    icone: "💬",
    titulo: "Captura da Donna",
    pergunta: "Mandei um áudio ou print pra Donna — onde isso foi parar?",
    resumo:
      "Você fala com a Donna no WhatsApp e a coisa aparece organizada no Notion, sem você abrir o Notion. Sete destinos possíveis, e ela escolhe.",
    passos: [
      {
        icone: "📱",
        titulo: "Você manda áudio, print ou link",
        tipo: "voce",
        detalhe: "Pelo WhatsApp. Pode dizer o que é ('ideia', 'tarefa', 'compras') ou deixar ela decidir.",
      },
      {
        icone: "🧠",
        titulo: "A Donna entende o que é",
        tipo: "automacao",
        fluxo: "Donna captura ideias de conteúdo (WhatsApp)",
        detalhe: "Usa Gemini pra classificar. Centavos por captura.",
      },
      {
        icone: "🖼️",
        titulo: "A imagem sobe junto",
        tipo: "automacao",
        fluxo: "Donna guarda filme, livro e compra",
        detalhe:
          "O print vai anexado no card, não só o texto lido dele. Se o upload falhar, o item é salvo assim mesmo — melhor sem foto do que sem registro.",
      },
      {
        icone: "🗂️",
        titulo: "Vai pro banco certo do Notion",
        tipo: "guardado",
        onde: "Notion",
        detalhe:
          "Tarefas · Conteúdos (como ideia) · Despejo · demanda do Igam · Filmes & Séries · Livros · Minha Lista de Desejos.",
      },
      {
        icone: "✅",
        titulo: "Ela confirma em uma linha",
        tipo: "automacao",
        detalhe: "Pra você saber que chegou, sem precisar conferir.",
      },
    ],
  },

  {
    id: "saude",
    icone: "🩺",
    titulo: "Quando alguma coisa quebra",
    pergunta: "Como eu fico sabendo que algo parou?",
    resumo:
      "Da medição ao aviso no seu celular. Não depende do painel estar aberto — os avisos saem direto da VPS.",
    passos: [
      {
        icone: "📊",
        titulo: "O estado é medido",
        tipo: "automacao",
        automacao: "Status de saúde do ecossistema (a cada 5min)",
        fluxo: "Saúde do ecossistema (semáforo painel)",
        detalhe: "Confere entregas de verdade, não só se os programas estão de pé.",
      },
      {
        icone: "🚨",
        titulo: "O aviso vai pelo canal que ainda funciona",
        tipo: "automacao",
        automacao: "Watchdog geral (5 em 5min)",
        fluxo: "Donna alerta falhas (canal cruzado)",
        detalhe:
          "Problema no WhatsApp é avisado pelo Telegram, e vice-versa. Não faz sentido o canal caído anunciar a própria queda.",
      },
      {
        icone: "🚦",
        titulo: "O semáforo do painel muda de cor",
        tipo: "guardado",
        onde: "Topo do painel",
        detalhe: "Clique nele pra ver o detalhe do que está acontecendo.",
      },
      {
        icone: "👤",
        titulo: "Você decide se resolve ou me chama",
        tipo: "voce",
        detalhe:
          "A tela de Saúde diz, em cada alerta, se é você quem resolve, se é comigo, ou se aquilo se resolve sozinho.",
      },
      {
        icone: "🔎",
        titulo: "A ronda da manhã confere tudo de novo",
        tipo: "automacao",
        automacao: "Ronda diária (7h BRT)",
        fluxo: "Ronda diária de saúde (7h BRT)",
        detalhe: "Um relatório por dia, às 7h, mesmo quando não houve problema nenhum.",
      },
    ],
  },
];

export const ROTULO_TIPO: Record<TipoPasso, { rotulo: string; cor: string }> = {
  automacao: { rotulo: "automação", cor: "var(--accent, #2D6B6B)" },
  voce: { rotulo: "você faz", cor: "#A0583C" },
  regra: { rotulo: "regra", cor: "#5A6B6B" },
  guardado: { rotulo: "fica guardado", cor: "#5A6B6B" },
};
