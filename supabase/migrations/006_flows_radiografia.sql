-- Migração 006 — Mapa de fluxos: identidade das rotinas e grupos editáveis (18/10/2026)
-- Revisada: junta o rascunho anterior (status/origem/radiografia) com o que o Mapa v4 precisa.
--
-- COMO USAR: abra o Supabase > SQL Editor, cole TUDO e clique em Run. Pode rodar de novo sem medo
-- (tudo é "if not exists" / "on conflict do nothing"): não apaga nem muda nenhum fluxo existente.
--
-- O QUE FAZ
--   1. flows_doc.automacao_id : liga o desenho à rotina que roda (nome da rotina no catálogo), em vez de
--      depender só do título, que pode mudar.
--   2. flow_grupos            : os grupos do Mapa (slug, nome, emoji, ordem), com os 8 atuais já cadastrados.
--   3. flows_doc.grupo/ordem  : em que grupo cada fluxo está e em que posição. Os fluxos atuais já nascem no
--                               grupo que o macro-fluxos.ts dá a eles. Depois disso a lista lateral do Mapa
--                               deixa ARRASTAR um fluxo para outro grupo e salva aqui.
--   4. status / origem / radiografia : colunas opcionais do rascunho anterior (fluxo por voz, resumo leigo).
--
-- O painel funciona COM e SEM esta migração: sem ela, usa o macro-fluxos.ts e a lista não arrasta.

-- 1) identidade estável da rotina
alter table flows_doc add column if not exists automacao_id text;
create index if not exists flows_doc_automacao_id_idx on flows_doc(automacao_id);

-- 2) grupos do Mapa
create table if not exists flow_grupos (
  slug text primary key,
  nome text not null,
  emoji text not null default '🗂️',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table flow_grupos enable row level security;
drop policy if exists "grupos: ler" on flow_grupos;
create policy "grupos: ler" on flow_grupos for select using (auth.role() = 'authenticated');
drop policy if exists "grupos: escrever" on flow_grupos;
create policy "grupos: escrever" on flow_grupos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into flow_grupos (slug, nome, emoji, ordem) values
  ('noticias-grupo-ia', 'Notícias e dicas do Grupo IA', '📰', 1),
  ('reels', 'Reels, da pauta ao vídeo editado', '🎬', 2),
  ('ideias-carrossel', 'Ideias e carrossel de Instagram', '📸', 3),
  ('financas', 'Finanças da casa', '💰', 4),
  ('donna-dia-a-dia', 'Donna no dia a dia', '🗓️', 5),
  ('saude-vps', 'Saúde e segurança dos sistemas', '🩺', 6),
  ('painel-equipe-memoria', 'Painel, equipe e memória', '🖥️', 7),
  ('licitacao-igam', 'Licitação Igam', '🏛️', 8)
on conflict (slug) do nothing;

-- 3) em que grupo cada fluxo está (null = usa o padrão do macro-fluxos.ts; 'outros' = grupo Outros)
alter table flows_doc add column if not exists grupo text;
alter table flows_doc add column if not exists ordem int;
create index if not exists flows_doc_grupo_idx on flows_doc(grupo);

-- os fluxos que já existem entram no grupo em que o painel já os mostra (só se ainda não tiverem grupo)
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 1 where grupo is null and id::text like '36078246%';
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 2 where grupo is null and id::text like '177f5f98%';
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 3 where grupo is null and id::text like '803b72b5%';
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 4 where grupo is null and id::text like 'da5be261%';
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 5 where grupo is null and id::text like 'c92bc84a%';
update flows_doc set grupo = 'noticias-grupo-ia', ordem = 6 where grupo is null and id::text like 'cb704473%';
update flows_doc set grupo = 'reels', ordem = 1 where grupo is null and id::text like '3890db81%';
update flows_doc set grupo = 'reels', ordem = 2 where grupo is null and id::text like '455a8267%';
update flows_doc set grupo = 'reels', ordem = 3 where grupo is null and id::text like '422fd5b7%';
update flows_doc set grupo = 'reels', ordem = 4 where grupo is null and id::text like '5352dad3%';
update flows_doc set grupo = 'ideias-carrossel', ordem = 1 where grupo is null and id::text like '3a1c5bd1%';
update flows_doc set grupo = 'ideias-carrossel', ordem = 2 where grupo is null and id::text like 'e80ccc82%';
update flows_doc set grupo = 'ideias-carrossel', ordem = 3 where grupo is null and id::text like 'bbdeea3e%';
update flows_doc set grupo = 'financas', ordem = 1 where grupo is null and id::text like 'a4a9889e%';
update flows_doc set grupo = 'financas', ordem = 2 where grupo is null and id::text like '144398ee%';
update flows_doc set grupo = 'financas', ordem = 3 where grupo is null and id::text like '2dfbdb58%';
update flows_doc set grupo = 'financas', ordem = 4 where grupo is null and id::text like 'b6bda8c8%';
update flows_doc set grupo = 'financas', ordem = 5 where grupo is null and id::text like 'd0634136%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 1 where grupo is null and id::text like '6a105095%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 2 where grupo is null and id::text like '57a89e2e%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 3 where grupo is null and id::text like '9403a9da%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 4 where grupo is null and id::text like 'f3cf1cd8%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 5 where grupo is null and id::text like '32d7a394%';
update flows_doc set grupo = 'donna-dia-a-dia', ordem = 6 where grupo is null and id::text like 'b88ee029%';
update flows_doc set grupo = 'saude-vps', ordem = 1 where grupo is null and id::text like 'a3eb53a2%';
update flows_doc set grupo = 'saude-vps', ordem = 2 where grupo is null and id::text like '1e65b77a%';
update flows_doc set grupo = 'saude-vps', ordem = 3 where grupo is null and id::text like '2667808f%';
update flows_doc set grupo = 'saude-vps', ordem = 4 where grupo is null and id::text like 'a05e09b8%';
update flows_doc set grupo = 'saude-vps', ordem = 5 where grupo is null and id::text like 'b16013c7%';
update flows_doc set grupo = 'saude-vps', ordem = 6 where grupo is null and id::text like '94c60e3b%';
update flows_doc set grupo = 'saude-vps', ordem = 7 where grupo is null and id::text like 'be4b019e%';
update flows_doc set grupo = 'painel-equipe-memoria', ordem = 1 where grupo is null and id::text like '47b33465%';
update flows_doc set grupo = 'painel-equipe-memoria', ordem = 2 where grupo is null and id::text like '539c9aa3%';
update flows_doc set grupo = 'painel-equipe-memoria', ordem = 3 where grupo is null and id::text like '3787b3b9%';
update flows_doc set grupo = 'painel-equipe-memoria', ordem = 4 where grupo is null and id::text like 'a4d3382c%';
update flows_doc set grupo = 'painel-equipe-memoria', ordem = 5 where grupo is null and id::text like 'e0ec4684%';
update flows_doc set grupo = 'licitacao-igam', ordem = 1 where grupo is null and id::text like '86017c53%';
update flows_doc set grupo = 'licitacao-igam', ordem = 2 where grupo is null and id::text like '738a9db2%';

-- liga cada desenho à rotina do relógio da VPS (pelo título atual; o curador mantém daqui pra frente)
update flows_doc set automacao_id = 'Dispatcher do Jarbas (ensure)' where automacao_id is null and lower(title) = lower('Dispatcher de finanças do Jarbas (ensure)');
update flows_doc set automacao_id = 'Watchdog geral (5 em 5min)' where automacao_id is null and lower(title) = lower('Donna alerta falhas (canal cruzado)');
update flows_doc set automacao_id = 'Heartbeat do OpenClaw (notícias/dicas)' where automacao_id is null and lower(title) = lower('Notícias diárias — fluxo normal (Mike → Izzy → Grupo IA)');
update flows_doc set automacao_id = 'Backup diário da VPS (2h BRT)' where automacao_id is null and lower(title) = lower('Backup diário da VPS pro Drive');
update flows_doc set automacao_id = 'Status de saúde do ecossistema (a cada 5min)' where automacao_id is null and lower(title) = lower('Saúde do ecossistema (semáforo painel)');
update flows_doc set automacao_id = 'Ronda diária (7h BRT)' where automacao_id is null and lower(title) = lower('Ronda diária de saúde (7h BRT)');
update flows_doc set automacao_id = 'Watchdog do bot Telegram' where automacao_id is null and lower(title) = lower('Watchdog do bot Telegram');
update flows_doc set automacao_id = 'Restart preventivo do bot Telegram' where automacao_id is null and lower(title) = lower('Restart preventivo do bot Telegram');
update flows_doc set automacao_id = 'Aprendiz de estilo do Mike (domingo)' where automacao_id is null and lower(title) = lower('Aprendiz de estilo (Mike melhorando)');
update flows_doc set automacao_id = 'Ponte Radar → Instagram (de hora em hora)' where automacao_id is null and lower(title) = lower('Ponte Radar → Instagram');
update flows_doc set automacao_id = 'Snapshot diário de métricas do painel' where automacao_id is null and lower(title) = lower('Snapshot diário de métricas');
update flows_doc set automacao_id = 'Pautas de reels da semana' where automacao_id is null and lower(title) = lower('Pipeline de reels (pauta → roteiro → feedback)');
update flows_doc set automacao_id = 'Lembrete de gravar os reels (sexta)' where automacao_id is null and lower(title) = lower('Lembrete de gravar os reels (sexta)');
update flows_doc set automacao_id = 'Sincroniza equipe pública (modo palco)' where automacao_id is null and lower(title) = lower('Equipe pública do modo palco');
update flows_doc set automacao_id = 'Escola do Luiz: aviso D-2' where automacao_id is null and lower(title) = lower('Escola do Luiz: aviso D-2');
update flows_doc set automacao_id = 'Escola do Luiz: relatório semanal' where automacao_id is null and lower(title) = lower('Escola do Luiz: relatório da semana');
update flows_doc set automacao_id = 'Curador de fluxos (domingo à noite)' where automacao_id is null and lower(title) = lower('Curador de fluxos semanal');

-- 4) opcionais do rascunho anterior (fluxo por voz e resumo leigo por fluxo)
alter table flows_doc add column if not exists status text not null default 'no_ar'
  check (status in ('rascunho', 'aprovado', 'construido', 'no_ar', 'recusado'));
alter table flows_doc add column if not exists origem text not null default 'manual'
  check (origem in ('manual', 'curador', 'audio'));
alter table flows_doc add column if not exists radiografia jsonb;
create index if not exists flows_doc_status_idx on flows_doc(status);
