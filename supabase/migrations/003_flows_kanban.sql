-- Migration 003 — kanban interno de fluxos
-- Cada fluxo ganha uma "coluna" (texto livre) pra agrupar por tema/área.
-- Colunas são gerenciadas por usuário+categoria numa nova tabela.

alter table flows_doc add column if not exists kanban_column text;

-- Ordem dentro da coluna (drag-and-drop reordena)
alter table flows_doc add column if not exists kanban_order integer default 0;

create index if not exists flows_doc_kanban_idx on flows_doc(category, kanban_column, kanban_order);

-- ─── Tabela de colunas gerenciadas pelo usuário ───
create table if not exists flow_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null check (category in ('squad', 'automation', 'manual')),
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, category, name)
);

create index if not exists flow_columns_user_cat_idx on flow_columns(user_id, category, "order");

alter table flow_columns enable row level security;

create policy "read own flow_columns"
on flow_columns for select using (auth.uid() = user_id);

create policy "insert own flow_columns"
on flow_columns for insert with check (auth.uid() = user_id);

create policy "update own flow_columns"
on flow_columns for update using (auth.uid() = user_id);

create policy "delete own flow_columns"
on flow_columns for delete using (auth.uid() = user_id);
