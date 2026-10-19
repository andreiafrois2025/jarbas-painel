# Jarbas — Painel (Central Inteligente da Andréia)

## Visão geral
Painel web pessoal da Andréia Frois: resumo do dia, aprovação de conteúdo,
produção (squads/fluxos/estúdio de reels), métricas do ecossistema e biblioteca.
Identidade visual AF (teal #2D6B6B, terracota #A0583C, creme #F5F0EA).

## Deploy
- **Produção:** https://painel.andreiafrois.tech (também jarbas-painel.vercel.app)
- **Vercel** plano Hobby; push na `main` → deploy automático (~1 min)
- **Repositório:** https://github.com/andreiafrois2025/jarbas-painel
- **Cópia de trabalho nesta VPS:** `/opt/jarbas-painel` (é daqui que se edita e pusha)

## Stack
- Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL + Auth email/senha, RLS por user_id)
- Dados vivos vêm de duas fontes externas ao Supabase:
  1. **squad-api** (VPS, `/opt/opensquad/squad-api/server.js`, pm2 `squad-api`,
     https://squad.srv1536795.hstgr.cloud) — endpoints `/api/*` autenticados com
     o JWT da sessão Supabase (padrão `comToken`/`squadFetch`)
  2. **Bucket público `status`** do Supabase Storage — JSONs publicados pela VPS:
     `status.json` (semáforo+atividades+fila, 5/5min, `/root/status-saude.py`),
     `metrics-history.json` (snapshot noturno, `/root/metrics-snapshot.py`),
     `equipe-publica.json` (`/root/equipe-sync.py`), `grafo_conteudo.json`
     (coletor `grafo_conteudo.py` no container OpenClaw)

## Regra de ouro dos dados
**Tempo-real = status.json (5/5min) · Histórico = metrics-history.json (noturno).**
Nunca mostrar dado operacional "de agora" lendo o snapshot noturno.

## Rotas e páginas (App Router)
| Rota | Componente | O que é |
|------|-----------|---------|
| `/inicio` | HojePanel + AssistentesPorArea + InicioPanel | Dia dela: agenda, tarefas, escola do Luiz, feed "o que a equipe fez", Caixa de aprovação (só notícias do grupo), escritório (iframe da squad-api) |
| `/equipe` | HRPage | RH: colaboradores (16 personas), setores, assistentes (assignments), quick-links — CRUD no Supabase |
| `/producao/squads` | SquadsPage | Inicia/acompanha squads do OpenSquad |
| `/producao/fluxos` | FlowsPageV2 (FlowKanban + FlowCanvas) | Desenho de fluxos estilo excalidraw + kanban por categoria |
| `/producao/estudio` | EstudioPage | Revisão da edição automática de reels (blocos, zooms, legendas, re-render) |
| `/pessoal` | PessoalPage | Luiz (escola) + finanças (resumo do mês via squad-api) |
| `/areas` | AreasPage | Porta Áreas (19/10/2026): abas Igam (processos + prazos do Outlook), Conteúdo (Esteira, Radar, Reels, Calendário) e Casa (Luiz, Finanças, Rotina). Faixa "Fazer agora" configurada em `src/lib/fazer-agora.ts`. Dados novos vêm de `/api/areas/{esteira,prazos-outlook,casa}` (squad-api, módulo `areas-v2.js`, só leitura). `?aba=casa&sub=financas` = tela completa de finanças |
| `/numeros` | MetricasPage + HorasEquipe | Abas: Visão geral (horas economizadas, livro-caixa via `/api/numeros/resumo`), Por agente, Diário de bordo. Botão leva ao modo palco |
| `/maquina?aba=saude` | SaudePage | Tela única: estado geral, serviços, conexões, rotinas, gasto do mês, últimos avisos (`status.json` + `/api/saude/resumo`; sem fonte = "sem dado") |
| `/metricas/palestra` | (publico)/metricas/palestra | Modo palco público pra projetar em palestras |
| `/biblioteca` | BibliotecaPage | Criações, Skills, Grafo do ecossistema (GrafoView), Grafo de conhecimento (GrafoConteudoView) |
| `/config` | ConfigPage | Ajustes: menu de seções (`?s=`) com Conta, Aparência, Avisos, Modo obra, App no celular, Atalhos, Organização, Grafo. "Abrir o painel em" fica em localStorage `painelInicio` e é lido por `src/app/page.tsx` (rota `/`) |

O shell (sidebar + JobsMonitor + dados compartilhados) vive em
`src/app/(painel)/layout.tsx` → `Dashboard.tsx` e persiste entre rotas
(`PainelContext`).

## Tabelas Supabase
`collaborators` (personas, sincronizadas de `/opt/personas` por
`scripts/sync_personas.py`), `categories` (setores por contexto),
`assignments` (assistente = colaborador × setor × ferramenta/link),
`quick_links`, `flows`/`flow_docs` + `flow_columns` (kanban), `executions`.
Tudo com RLS por `user_id`. CRUD centralizado em `src/lib/storage.ts`.

## Catálogos: o que já é vivo e o que ainda é à mão (F2 do plano, 25/07/2026)
- **Automações — resolvido.** `src/lib/automacoes.ts` não existe mais. A lista
  vem do crontab real da VPS (`src/lib/cron.ts` traduz a expressão pra
  português). Mudar horário ou criar/aposentar uma automação na VPS já aparece
  no painel sozinho — não há arquivo pra editar. Mudança só no comportamento
  interno de um script não muda nada aqui.
- **Desenhos dos fluxos — resolvido por rotina.** `/root/curador-fluxos.py`
  roda domingo 21h BRT (cron `0 0 * * 1` UTC), compara o relógio real com os
  desenhos e desenha/redesenha/marca o que saiu do lugar, registrando em
  "⚡ O que a equipe fez".
- **Ainda à mão:** `src/lib/equipe.ts` (tem `fetchEquipePublica` ao vivo, mas
  com `EQUIPE`/`fallbackPublico` escritos aqui) e `src/lib/biblioteca.ts`.
  Quem mexer no ecossistema DEVE atualizar esses dois.

## Convenções
- Commits em português `tipo: descrição`; código em inglês, comentários PT-BR
- Indentação 2 espaços; Tailwind com CSS vars do tema (`globals.css`)
- Fontes carregadas via `next/font/google` (Inter no corpo, Kalam nos nós do fluxo)
- Antes de push: `npx tsc --noEmit` e `npm run build`
- Segredos só em `.env.local` (nunca commitar, nunca imprimir)

## Rodar localmente (na VPS)
```bash
cd /opt/jarbas-painel && npm run dev   # porta 3000
```

## Documentos relacionados
- Plano mestre vigente: `/root/docs/plano-central-inteligente-2026-07-19.md`
- Progresso geral: `/root/PROGRESS.md`
