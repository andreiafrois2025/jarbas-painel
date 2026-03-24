// =============================================
// Storage — Funções de acesso ao Supabase
// Centraliza todas as operações de CRUD
// =============================================

import { supabase } from "./supabase";
import { Agent, Category, Flow, Execution, DEFAULT_AGENTS, DEFAULT_CATEGORIES } from "./types";

// ---- AUTH ----

/** Registrar novo usuário */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/** Login com email e senha */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/** Logout */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Obter sessão atual */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Obter usuário atual */
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ---- SEED (dados iniciais para novos usuários) ----

/** Popula dados padrão na primeira vez que o usuário loga */
export async function seedDefaultData(userId: string) {
  // Verificar se já tem agentes
  const { data: existing } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return; // já tem dados

  // Inserir categorias padrão com contexto
  const categories = DEFAULT_CATEGORIES.map((cat) => ({
    name: cat.name,
    context: cat.context,
    order: cat.order,
    user_id: userId,
  }));
  await supabase.from("categories").insert(categories);

  // Inserir agentes padrão
  const agents = DEFAULT_AGENTS.map((agent) => ({
    ...agent,
    user_id: userId,
  }));
  await supabase.from("agents").insert(agents);
}

// ---- AGENTS ----

/** Buscar todos os agentes do usuário */
export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Criar novo agente */
export async function addAgent(
  agent: Omit<Agent, "id" | "user_id" | "created_at">
): Promise<Agent> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("agents")
    .insert({ ...agent, user_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Atualizar agente */
export async function updateAgent(
  id: string,
  updates: Partial<Agent>
): Promise<void> {
  const { error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Excluir agente */
export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

// ---- CATEGORIES ----

/** Buscar categorias do usuário */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Criar categoria */
export async function addCategory(name: string, context: string = "IGAM"): Promise<Category> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, context, user_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Renomear categoria */
export async function updateCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

/** Excluir categoria */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ---- FLOWS ----

/** Buscar fluxos do usuário */
export async function getFlows(): Promise<Flow[]> {
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Criar fluxo */
export async function addFlow(flow: { name: string; steps: Flow["steps"] }): Promise<Flow> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("flows")
    .insert({ name: flow.name, steps: flow.steps, user_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Atualizar fluxo */
export async function updateFlow(id: string, updates: { name?: string; steps?: Flow["steps"] }): Promise<void> {
  const { error } = await supabase
    .from("flows")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Excluir fluxo */
export async function deleteFlow(id: string): Promise<void> {
  const { error } = await supabase.from("flows").delete().eq("id", id);
  if (error) throw error;
}

/** Executar fluxo (registra execução e abre agentes em sequência) */
export async function executeFlow(flow: Flow): Promise<void> {
  const user = await getUser();
  // Registrar execução do fluxo
  await supabase.from("executions").insert({
    flow_id: flow.id,
    status: "completed",
    user_id: user?.id,
  });
  // Registrar execução de cada agente do fluxo
  for (const step of flow.steps) {
    await supabase.from("executions").insert({
      agent_id: step.agentId,
      flow_id: flow.id,
      status: "completed",
      user_id: user?.id,
    });
  }
}

// ---- EXECUTIONS ----

/** Registrar execução de agente (clique em "Abrir") */
export async function recordExecution(agentId: string): Promise<void> {
  const user = await getUser();
  await supabase.from("executions").insert({
    agent_id: agentId,
    status: "completed",
    user_id: user?.id,
  });
}

/** Buscar execuções do usuário */
export async function getExecutions(): Promise<Execution[]> {
  const { data, error } = await supabase
    .from("executions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Contar execuções de hoje */
export async function getTodayExecutionCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("executions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  if (error) return 0;
  return count || 0;
}
