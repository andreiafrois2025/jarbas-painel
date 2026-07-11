-- Migration 004 — permitir que usuários autenticados movam seeds no kanban
-- Seeds são compartilhados (is_seed=true) mas o campo kanban_column é da
-- organização visual da usuária. Como só há uma usuária hoje, liberamos update
-- em seeds pra ela organizar como quiser.

create policy "update seeds in kanban"
on flows_doc for update
using (is_seed = true and auth.uid() is not null);
