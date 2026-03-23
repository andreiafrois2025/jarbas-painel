# Jarbas — Painel de Agentes de IA

## Visão Geral
Painel web para gerenciar agentes de IA com visual estilo Windows 97/98.
Cada agente é representado por um bonequinho pixel art sentado em uma mesa.
Clicar no bonequinho abre o link do agente.

## Proprietária
Andréia Rodrigues Frois — andreiamgbh@gmail.com

## Deploy
- **URL:** https://jarbas-painel.vercel.app
- **Plataforma:** Vercel (plano Hobby, gratuito)
- **Repositório:** https://github.com/andreiafrois2025/jarbas-painel
- **Branch principal:** main
- **Deploy automático:** push no main → Vercel atualiza sozinho

## Stack
- **Framework:** Next.js 15 + React 19 + TypeScript
- **Estilo:** Tailwind CSS 4 + CSS customizado Win98
- **Banco de dados:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email + senha)

## Supabase
- **URL:** https://pmmyqljiuslstwbmiron.supabase.co
- **Projeto:** Jarbas (FREE tier)
- **Anon Key:** sb_publishable_XT73QR_hOggP8bNwOmDj6A_AHvMuII2

### Tabelas
| Tabela | Descrição |
|--------|-----------|
| `agents` | Agentes de IA cadastrados (id, agent_name, name, link, category, type, icon, description, gender, user_id) |
| `categories` | Setores/abas (id, name, order, user_id) |
| `executions` | Registro de uso (id, agent_id, flow_id, status, result, user_id, created_at) |
| `flows` | Fluxos de automação (id, name, steps JSONB, user_id) |

### RLS (Row Level Security)
Cada tabela filtra por `user_id` — cada usuário vê apenas seus dados.

## Estrutura de Arquivos
```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Página principal (auth + redirect pro Dashboard)
│   │   ├── layout.tsx        # Layout global
│   │   ├── globals.css       # Estilos globais + variáveis Win98
│   │   └── api/automation/   # Rota de automação de fluxos
│   ├── components/
│   │   ├── Dashboard.tsx     # Dashboard principal (sidebar + escritório Win98)
│   │   ├── DeskCard.tsx      # Bonequinho pixel art na mesa (SVG animado)
│   │   ├── AgentModal.tsx    # Modal criar/editar agente
│   │   ├── CategoryModal.tsx # Modal gerenciar setores
│   │   ├── FlowsPage.tsx     # Página de fluxos de automação
│   │   └── MetricsPage.tsx   # Página de métricas (funcionário do mês etc)
│   └── lib/
│       ├── supabase.ts       # Cliente Supabase
│       ├── storage.ts        # Todas as funções CRUD (agents, categories, flows, executions)
│       └── types.ts          # Interfaces TypeScript (Agent, Category, Flow, Execution)
├── .env.local                # Variáveis de ambiente (NÃO sobe pro git)
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Interface

### Layout Principal (Dashboard.tsx)
- **Sidebar esquerda (64px):** ícones de navegação — Escritório 🏢 | Fluxos 🔄 | Métricas 📊 | Sair 🚪
- **Header:** título da página, contador de agentes/execuções, busca, botões "Setores" e "+ Novo Agente"
- **Abas de categorias:** filtra por setor (Todos | Trabalho | Pessoal | Criação | Pesquisa | ...)
- **Janela Win98:** área central com visual retrô — barra de título, menu, escritório, statusbar

### Escritório Win98
- Parede com plaquinha "JARBAS" e gráfico de sucesso
- Grid de `DeskCard` (bonequinhos nas mesas)
- Statusbar: total de funcionários | execuções hoje | horário | dia da semana

### DeskCard (DeskCard.tsx)
- SVG pixel art: mesa com monitor CRT verde, teclado, mouse, caneca de café, planta, papéis
- Bonequinho animado digitando (braços se movem)
- Cores do bonequinho geradas por hash do nome (único por agente)
- Suporta gênero masculino/feminino
- Hover: aparece botões Editar ✏️ e Excluir 🗑️
- Clique → abre link do agente + registra execução no Supabase

### Tipos de Agente (types.ts)
```typescript
interface Agent {
  id: string
  agent_name?: string    // Nome personalizado (ex: "Sofia") — aparece acima da cabeça
  name: string           // Nome da ferramenta (ex: "Claude") — plaquinha da mesa
  link: string           // URL para abrir
  category: string       // Setor (aba)
  type: "manual" | "automatic"
  icon?: string          // Emoji
  description?: string   // Função curta (ex: "Chat", "Imagem")
  gender?: "male" | "female"
}
```

### Agentes padrão (novos usuários)
Atlas (ChatGPT) • Sofia (Claude) • Neo (Gemini) • Luna (Midjourney) • Max (Perplexity) • Dev (GitHub Copilot)

### Categorias padrão
Trabalho • Pessoal • Criação • Pesquisa

## Páginas

### Fluxos (FlowsPage.tsx)
- Criar sequências de agentes para executar em ordem
- Fluxo salvo no Supabase: `flows` com `steps` JSONB
- Exemplo existente: "Gerar Carrossel"

### Métricas (MetricsPage.tsx)
- Dashboard de uso dos agentes
- "Funcionário do Mês" — agente mais usado no período
- Gráficos de execuções por agente, por setor, por dia

## Variáveis de Ambiente
```
NEXT_PUBLIC_SUPABASE_URL=https://pmmyqljiuslstwbmiron.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XT73QR_hOggP8bNwOmDj6A_AHvMuII2
```
No Vercel: Settings → Environment Variables (já configurado)

## Como Fazer Deploy de Atualização
```bash
cd "C:\Users\Hwaendrix\Desktop\Projetos_AI\Jarbas\frontend"
git add .
git commit -m "descrição da mudança"
git push
```
Vercel detecta o push e faz deploy automático em ~1 minuto.

## Como Rodar Localmente
```bash
cd "C:\Users\Hwaendrix\Desktop\Projetos_AI\Jarbas\frontend"
npm run dev
```
Acessa em http://localhost:3000

## Login
- Email: andreiamgbh@gmail.com
- Criar conta na primeira vez pelo próprio painel

## Domínio Futuro
Quando comprar domínio: Vercel → Settings → Domains → Add Domain
Apontar DNS: registro tipo CNAME para `cname.vercel-dns.com`

## Projetos Relacionados
- **Jarbas Bot (Telegram):** VPS 187.77.245.243 | `/home/jarbas/bot` | PM2: jarbas-bot
- **Scripts VPS:** `/home/jarbas/scripts/` (Notion, Calendar, lembretes, Whisper)
