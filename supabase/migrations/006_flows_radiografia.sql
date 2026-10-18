-- Migração 006 — OPCIONAL, NÃO APLICADA (18/10/2026, branch fluxos-radiografar)
--
-- A página de Fluxos em 3 níveis funciona SEM esta migração: usa só flows_doc.nodes/edges
-- (os trechos de código, quando existirem, ficam em nodes[].data.codigo, dentro do jsonb).
--
-- Esta migração só é necessária para:
--   (a) FASE 2 (fluxo por áudio): estado rascunho/aprovado/construído
--   (b) guardar por fluxo o resumo leigo, glossário e fontes escritos pelo curador
-- Só ACRESCENTA colunas com valor padrão; não altera nem apaga nada existente.

alter table flows_doc add column if not exists status text not null default 'no_ar'
  check (status in ('rascunho', 'aprovado', 'construido', 'no_ar', 'recusado'));

alter table flows_doc add column if not exists origem text not null default 'manual'
  check (origem in ('manual', 'curador', 'audio'));

-- {"resumo_leigo": "...", "glossario": [{"termo","definicao"}], "fontes": [{"titulo","url"}]}
alter table flows_doc add column if not exists radiografia jsonb;

-- Os fluxos que já existem continuam como 'no_ar' (padrão) e seguem valendo como hoje.
create index if not exists flows_doc_status_idx on flows_doc(status);
