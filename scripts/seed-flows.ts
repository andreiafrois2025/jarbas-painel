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

  // Limpa seeds existentes (idempotente)
  const { error: delErr } = await supabase.from("flows_doc").delete().eq("is_seed", true);
  if (delErr) {
    console.error("Erro ao limpar seeds antigos:", delErr);
    // segue mesmo assim, pode ser que a tabela esteja vazia
  } else {
    console.log("Seeds antigos limpos.");
  }

  // Insere os novos seeds
  const rows = SEED_FLOWS.map((f) => ({ ...f, user_id: userId, is_seed: true }));
  const { data, error } = await supabase.from("flows_doc").insert(rows).select("id, title");
  if (error) {
    console.error("Erro ao inserir seeds:", error);
    process.exit(1);
  }
  console.log(`✓ ${data?.length || 0} fluxos-semente inseridos:`);
  data?.forEach((r) => console.log(`  · ${r.title}`));
}

main();
