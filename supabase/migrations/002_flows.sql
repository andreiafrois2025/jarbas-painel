-- Migration 002 — tabela `flows_doc` para o editor visual (n8n-like)
-- Não confunde com a tabela `flows` antiga (Puppeteer). Nome novo pra convivência.

create table if not exists flows_doc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('squad', 'automation', 'manual')),
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  is_seed boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flows_doc_user_id_idx on flows_doc(user_id);
create index if not exists flows_doc_category_idx on flows_doc(category);
create index if not exists flows_doc_is_seed_idx on flows_doc(is_seed) where is_seed = true;

alter table flows_doc enable row level security;

-- todo mundo autenticado lê os seed (fluxos das automações que já rodam) + os próprios
create policy "read own or seed or public"
on flows_doc for select
using (auth.uid() = user_id or is_seed = true or is_public = true);

-- só escreve nos próprios
create policy "insert own"
on flows_doc for insert
with check (auth.uid() = user_id);

create policy "update own"
on flows_doc for update
using (auth.uid() = user_id);

create policy "delete own"
on flows_doc for delete
using (auth.uid() = user_id);

-- auto-update do updated_at
create or replace function flows_doc_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists flows_doc_updated_at on flows_doc;
create trigger flows_doc_updated_at
before update on flows_doc
for each row execute function flows_doc_touch_updated_at();
