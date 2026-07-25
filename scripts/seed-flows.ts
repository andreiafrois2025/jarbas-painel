#!/usr/bin/env node
// Popula os fluxos-semente na tabela flows_doc.
// Roda com: npx tsx scripts/seed-flows.ts [USER_ID]
// Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Se USER_ID não for passado, tenta pegar o único user do projeto.
// Rodar APÓS aplicar a migration 002_flows.sql.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SEED_FLOWS } from "../src/lib/seed-flows";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Faltam envs SUPABASE.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Descobre user_id — se não passou por arg, pega o primeiro user
  let userId = process.argv[2];
  if (!userId) {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Erro ao listar users:", error);
      process.exit(1);
    }
    if (!users.users.length) {
      console.error("Nenhum usuário no projeto.");
      process.exit(1);
    }
    userId = users.users[0].id;
    console.log(`Usando user_id=${userId} (${users.users[0].email})`);
  }

  // 25/07/2026 — NÃO APAGA MAIS NADA.
  //
  // Até 24/07 este script fazia delete de todos os seeds e inseria de novo. Em
  // 24/07 isso apagou a organização que a Andréia tinha feito no kanban, e ela
  // percebeu ("voltou tudo para a parte inicial"). Além disso, recriar do zero
  // troca os ids — quebrando qualquer link salvo pra um fluxo.
  //
  // Agora a regra é: casa pelo TÍTULO. Se o fluxo já existe, atualiza só o
  // desenho (nós e ligações) e preserva o id e tudo que for organização dela.
  // Se não existe, cria. Nada é removido automaticamente.
  const { data: atuais, error: erroLer } = await supabase
    .from("flows_doc")
    .select("id, title, is_seed")
    .eq("is_seed", true);
  if (erroLer) {
    console.error("Erro ao ler os seeds atuais:", erroLer);
    process.exit(1);
  }
  const porTitulo = new Map((atuais || []).map((f) => [f.title.toLowerCase(), f]));

  let criados = 0, atualizados = 0;
  for (const f of SEED_FLOWS) {
    const existente = porTitulo.get(f.title.toLowerCase());
    if (existente) {
      // Só o conteúdo do desenho. kanban_column e afins são dela, não se toca.
      const { error } = await supabase
        .from("flows_doc")
        .update({ nodes: f.nodes, edges: f.edges, description: f.description, category: f.category })
        .eq("id", existente.id);
      if (error) console.error(`  ✗ ${f.title}: ${error.message}`);
      else { atualizados++; console.log(`  ↻ ${f.title}`); }
      porTitulo.delete(f.title.toLowerCase());
    } else {
      const { error } = await supabase
        .from("flows_doc")
        .insert({ ...f, user_id: userId, is_seed: true });
      if (error) console.error(`  ✗ ${f.title}: ${error.message}`);
      else { criados++; console.log(`  + ${f.title}`); }
    }
  }

  console.log(`\n✓ ${criados} criados, ${atualizados} atualizados.`);
  if (porTitulo.size) {
    console.log(`\n⚠ ${porTitulo.size} fluxo(s) existem no banco e não estão mais no código:`);
    for (const f of porTitulo.values()) console.log(`  · ${f.title}`);
    console.log("  Não foram apagados. Se for pra remover, remova à mão no painel.");
  }
}

main();
