import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync("/opt/jarbas-painel/.env.local","utf-8").split("\n")
  .filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
async function main(){
  const { data } = await sb.from("flows_doc").select("title,category,is_seed,kanban_column,updated_at").order("category");
  const porCol = new Map<string,number>();
  for (const f of data||[]) porCol.set(f.kanban_column ?? "(sem coluna)", (porCol.get(f.kanban_column ?? "(sem coluna)")||0)+1);
  console.log("total de fluxos:", data?.length);
  console.log("distribuição por coluna do kanban:");
  for (const [k,v] of porCol) console.log(`   ${k}: ${v}`);
  console.log("seeds:", data?.filter(f=>f.is_seed).length, "| dela (não-seed):", data?.filter(f=>!f.is_seed).length);
}
main();
