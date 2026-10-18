-- Chat do painel (Fase 5-B, 18/10/2026). NÃO aplicada ainda: a squad-api grava hoje em
-- arquivos JSONL na VPS (/opt/opensquad/chat-painel/historico/). Aplicar no SQL Editor do
-- Supabase quando for migrar o histórico para o banco. Tabelas novas, não altera nenhuma existente.

create table if not exists public.chat_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agente text not null,
  titulo text not null default 'Nova conversa',
  sessao_claude uuid,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table if not exists public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.chat_conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('user','assistant','sistema')),
  texto text not null,
  anexos jsonb,
  acoes jsonb,
  modelo text,
  criada_em timestamptz not null default now()
);

create index if not exists chat_conversas_user_idx on public.chat_conversas(user_id, agente, atualizada_em desc);
create index if not exists chat_mensagens_conversa_idx on public.chat_mensagens(conversa_id, criada_em);

alter table public.chat_conversas enable row level security;
alter table public.chat_mensagens enable row level security;

create policy "chat_conversas: só o dono" on public.chat_conversas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chat_mensagens: só o dono" on public.chat_mensagens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
