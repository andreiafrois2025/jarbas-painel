// =============================================
// Storage — Funções de acesso ao Supabase
// Centraliza todas as operações de CRUD
// =============================================

import { supabase } from "./supabase";
import { Agent, Category, Flow, Execution, DEFAULT_AGENTS, DEFAULT_CATEGORIES, Collaborator, Assignment, QuickLink, DeskOccupant, Product, Squad, FlowDoc, FlowCategory } from "./types";

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

/** Envia email pra resetar a senha. Usuário clica no link e cai em /reset-password */
export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Define uma nova senha (usado dentro da sessão temporária de recovery) */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
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

/** Atualizar categoria (nome e/ou ordem) */
export async function updateCategory(id: string, updates: string | { name?: string; order?: number }): Promise<void> {
  const data = typeof updates === "string" ? { name: updates } : updates;
  const { error } = await supabase
    .from("categories")
    .update(data)
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

// =============================================
// COLLABORATORS (Novo modelo v2.0)
// =============================================

/** Buscar colaboradores */
export async function getCollaborators(): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from("collaborators")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Criar colaborador */
export async function addCollaborator(
  collab: Omit<Collaborator, "id" | "user_id" | "created_at">
): Promise<Collaborator> {
  const user = await getUser();
  // Remover campos que podem não existir no banco ainda
  const { bio, status, specialization, skills, personality, ...safeFields } = collab as Record<string, unknown>;
  const payload = { ...safeFields, user_id: user?.id } as Record<string, unknown>;
  // Incluir campos opcionais apenas se tiverem valor (tentativa segura)
  if (bio) payload.bio = bio;
  if (status && status !== "active") payload.status = status;
  if (specialization) payload.specialization = specialization;
  if (skills) payload.skills = skills;
  if (personality) payload.personality = personality;
  const { data, error } = await supabase
    .from("collaborators")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Collaborator;
}

/** Atualizar colaborador */
export async function updateCollaborator(id: string, updates: Partial<Collaborator>): Promise<void> {
  // Remover campos que podem não existir no banco ainda
  const { bio, status, specialization, skills, personality, ...safeUpdates } = updates;
  const payload = { ...safeUpdates } as Record<string, unknown>;
  if (bio !== undefined) payload.bio = bio;
  if (status !== undefined) payload.status = status;
  if (specialization !== undefined) payload.specialization = specialization;
  if (skills !== undefined) payload.skills = skills;
  if (personality !== undefined) payload.personality = personality;
  const { error } = await supabase.from("collaborators").update(payload).eq("id", id);
  if (error) throw error;
}

/** Excluir colaborador */
export async function deleteCollaborator(id: string): Promise<void> {
  const { error } = await supabase.from("collaborators").delete().eq("id", id);
  if (error) throw error;
}

// =============================================
// ASSIGNMENTS (Atribuições por sala)
// =============================================

/** Buscar todas as atribuições com colaborador e categoria */
export async function getAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, collaborator:collaborators(*), category:categories(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Criar atribuição */
export async function addAssignment(
  assignment: Omit<Assignment, "id" | "user_id" | "created_at" | "collaborator" | "category">
): Promise<Assignment> {
  const user = await getUser();
  // Remover campos que podem não existir no banco ainda
  const { time_saved_minutes, ...safeFields } = assignment;
  const payload = { ...safeFields, user_id: user?.id } as Record<string, unknown>;
  if (time_saved_minutes && time_saved_minutes !== 2) payload.time_saved_minutes = time_saved_minutes;
  const { data, error } = await supabase
    .from("assignments")
    .insert(payload)
    .select("*, collaborator:collaborators(*), category:categories(*)")
    .single();
  if (error) throw error;
  return data;
}

/** Atualizar atribuição */
export async function updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
  // Remover campos joined e campos que podem não existir no banco
  const { collaborator, category, time_saved_minutes, ...clean } = updates;
  void collaborator; void category;
  const payload = { ...clean } as Record<string, unknown>;
  if (time_saved_minutes !== undefined) payload.time_saved_minutes = time_saved_minutes;
  const { error } = await supabase.from("assignments").update(payload).eq("id", id);
  if (error) throw error;
}

/** Excluir atribuição */
export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

/** Montar DeskOccupants a partir de assignments */
export function buildOccupants(assignments: Assignment[]): DeskOccupant[] {
  return assignments
    .filter(a => a.collaborator && a.category)
    .map(a => ({
      assignment: a,
      collaborator: a.collaborator!,
    }));
}

// =============================================
// QUICK LINKS
// =============================================

/** Buscar quick-links */
export async function getQuickLinks(): Promise<QuickLink[]> {
  const { data, error } = await supabase
    .from("quick_links")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Criar quick-link */
export async function addQuickLink(ql: Omit<QuickLink, "id" | "user_id">): Promise<QuickLink> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("quick_links")
    .insert({ ...ql, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Atualizar quick-link */
export async function updateQuickLink(id: string, updates: Partial<QuickLink>): Promise<void> {
  const { error } = await supabase.from("quick_links").update(updates).eq("id", id);
  if (error) throw error;
}

/** Excluir quick-link */
export async function deleteQuickLink(id: string): Promise<void> {
  const { error } = await supabase.from("quick_links").delete().eq("id", id);
  if (error) throw error;
}

// =============================================
// PRODUCTS (Produtos/entregas por área)
// =============================================

/** Buscar todos os produtos */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Buscar produtos de uma categoria/sala */
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Criar produto */
export async function addProduct(
  product: Omit<Product, "id" | "user_id" | "created_at">
): Promise<Product> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...product, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Atualizar produto */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const { error } = await supabase.from("products").update(updates).eq("id", id);
  if (error) throw error;
}

/** Excluir produto */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// =============================================
// SQUADS (pipelines multi-agente)
// =============================================

/** Buscar squads do usuário */
export async function getSquads(): Promise<Squad[]> {
  const { data, error } = await supabase
    .from("squads")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    // Tabela pode não existir ainda — retornar vazio sem quebrar
    console.warn("squads table not ready:", error.message);
    return [];
  }
  return data || [];
}

/** Criar squad */
export async function addSquad(
  squad: Omit<Squad, "id" | "user_id" | "created_at">
): Promise<Squad> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("squads")
    .insert({ ...squad, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Atualizar squad */
export async function updateSquad(id: string, updates: Partial<Squad>): Promise<void> {
  const { error } = await supabase.from("squads").update(updates).eq("id", id);
  if (error) throw error;
}

/** Excluir squad */
export async function deleteSquad(id: string): Promise<void> {
  const { error } = await supabase.from("squads").delete().eq("id", id);
  if (error) throw error;
}

// =============================================
// MIGRAÇÃO: agents → collaborators + assignments
// =============================================

/** Migrar dados do modelo antigo (agents) para o novo (collaborators + assignments) */
export async function migrateFromAgents(userId: string): Promise<void> {
  // Verificar se já migrou
  const { data: existing } = await supabase
    .from("collaborators")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Buscar agentes e categorias atuais
  const { data: agents } = await supabase.from("agents").select("*").eq("user_id", userId);
  const { data: cats } = await supabase.from("categories").select("*").eq("user_id", userId);
  if (!agents || agents.length === 0 || !cats) return;

  // Agrupar por agent_name para criar 1 colaborador por nome
  const collabMap = new Map<string, Collaborator>();
  for (const ag of agents) {
    const name = ag.agent_name || ag.name;
    if (!collabMap.has(name)) {
      const { data } = await supabase
        .from("collaborators")
        .insert({
          name,
          gender: ag.gender || "male",
          skin_tone: ag.skin_tone ?? 0,
          hair_color: ag.hair_color ?? 0,
          shirt_color: ag.shirt_color ?? 0,
          has_glasses: ag.has_glasses ?? false,
          icon: ag.icon || "⚡",
          user_id: userId,
        })
        .select()
        .single();
      if (data) collabMap.set(name, data);
    }
  }

  // Criar assignments
  for (const ag of agents) {
    const name = ag.agent_name || ag.name;
    const collab = collabMap.get(name);
    if (!collab) continue;

    // Encontrar a categoria pelo nome
    const cat = cats.find(c => c.name === ag.category);
    if (!cat) continue;

    await supabase.from("assignments").insert({
      collaborator_id: collab.id,
      category_id: cat.id,
      tool_name: ag.name,
      link: ag.link,
      description: ag.description || "",
      type: ag.type || "manual",
      sub_links: ag.sub_links || [],
      user_id: userId,
    }).select().single();
  }
}

// ---- FLOWS DOC (editor visual n8n-like) ----

/** Listar fluxos-desenho — próprios + seed (globais) */
export async function getFlowDocs(): Promise<FlowDoc[]> {
  const { data, error } = await supabase
    .from("flows_doc")
    .select("*")
    .order("is_seed", { ascending: false })
    .order("title", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Um fluxo por id */
export async function getFlowDoc(id: string): Promise<FlowDoc | null> {
  const { data, error } = await supabase.from("flows_doc").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Criar fluxo novo */
export async function addFlowDoc(input: {
  title: string;
  category: FlowCategory;
  description?: string;
  nodes?: FlowDoc["nodes"];
  edges?: FlowDoc["edges"];
}): Promise<FlowDoc> {
  const user = await getUser();
  if (!user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("flows_doc")
    .insert({
      title: input.title,
      category: input.category,
      description: input.description || null,
      nodes: input.nodes || [],
      edges: input.edges || [],
      user_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Salvar edits (nodes/edges/título/descrição) */
export async function updateFlowDoc(
  id: string,
  updates: Partial<Pick<FlowDoc, "title" | "description" | "nodes" | "edges" | "is_public">>,
): Promise<void> {
  const { error } = await supabase.from("flows_doc").update(updates).eq("id", id);
  if (error) throw error;
}

/** Duplicar um fluxo (útil pra clonar um seed pra editar) */
export async function duplicateFlowDoc(id: string): Promise<FlowDoc> {
  const src = await getFlowDoc(id);
  if (!src) throw new Error("Fluxo não encontrado");
  return addFlowDoc({
    title: `${src.title} (cópia)`,
    category: src.category,
    description: src.description,
    nodes: src.nodes,
    edges: src.edges,
  });
}

/** Deletar (só próprios, RLS bloqueia deletar seed) */
export async function deleteFlowDoc(id: string): Promise<void> {
  const { error } = await supabase.from("flows_doc").delete().eq("id", id);
  if (error) throw error;
}
