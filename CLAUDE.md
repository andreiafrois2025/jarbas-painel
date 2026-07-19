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
| `/metricas` | MetricasPage | Abas: Painel Geral, Produtividade IA, Saúde do sistema (ao vivo), Diário de bordo |
| `/metricas/palestra` | (publico)/metricas/palestra | Modo palco público pra projetar em palestras |
| `/biblioteca` | BibliotecaPage | Criações, Skills, Grafo do ecossistema (GrafoView), Grafo de conhecimento (GrafoConteudoView) |
| `/config` | ConfigPage | Conta + integrações |

O shell (sidebar + JobsMonitor + dados compartilhados) vive em
`src/app/(painel)/layout.tsx` → `Dashboard.tsx` e persiste entre rotas
(`PainelContext`).

## Tabelas Supabase
`collaborators` (personas, sincronizadas de `/opt/personas` por
`scripts/sync_personas.py`), `categories` (setores por contexto),
`assignments` (assistente = colaborador × setor × ferramenta/link),
`quick_links`, `flows`/`flow_docs` + `flow_columns` (kanban), `executions`.
Tudo com RLS por `user_id`. CRUD centralizado em `src/lib/storage.ts`.

## Catálogos hardcoded (dívida conhecida — F2 do plano)
`src/lib/equipe.ts`, `src/lib/biblioteca.ts` e `src/lib/automacoes.ts` são
escritos à mão e desatualizam. O plano é substituí-los por JSON publicado da
VPS (`catalogo-sync`). Até lá: quem mexer no ecossistema DEVE atualizar esses
arquivos.

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
