// Apoio da página Equipe › Habilidades: categoria simples, "como pedir" e
// "quem usa" de cada habilidade.
//
// - categoria: vem do catálogo (/api/catalogo) e é agrupada em 4 chips.
// - "como pedir": primeira frase entre aspas da descrição do SKILL.md
//   ("Use quando ela disser ..."). Sem aspas na descrição, não mostra nada.
// - "quem usa": mapeamento óbvio habilidade -> agente da equipe (abaixo).
//   Habilidade fora da tabela não mostra "quem usa" (nada inventado).

export type CategoriaChip = "design" | "video" | "docs" | "sistema";

export const CATEGORIAS: { id: CategoriaChip; rotulo: string; emoji: string }[] = [
  { id: "design", rotulo: "Design", emoji: "🎨" },
  { id: "video", rotulo: "Vídeo e conteúdo", emoji: "🎬" },
  { id: "docs", rotulo: "Documentos", emoji: "📄" },
  { id: "sistema", rotulo: "Sistema", emoji: "⚙️" },
];

export function categoriaChip(categoria?: string): CategoriaChip {
  const c = (categoria || "").toLowerCase();
  if (/design|imagem/.test(c)) return "design";
  if (/v[ií]deo/.test(c)) return "video";
  if (/document|mem[oó]ria/.test(c)) return "docs";
  return "sistema";
}

export function comoPedir(descricao: string): string | null {
  const d = descricao || "";
  // só vale o que vem depois de "Use/Usar/Ativar quando..." (as frases que ela diria)
  const mk = d.search(/(use|usar|ativar|ative|acione)\s+(sempre\s+)?quando|ativar:/i);
  const resto = mk >= 0 ? d.slice(mk) : "";
  const re = /["“]([^"”]+)["”]|'([^']+)'/g;
  const boas: string[] = [];
  const reticencias: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(resto))) {
    const t = (m[1] || m[2] || "").trim();
    if (t.length < 8 || t.length > 60 || !/\s/.test(t)) continue;
    if (/[\/<>{}\[\]]|\.\s|^[.,;:]/.test(t) || !/^[a-zà-ú]/.test(t)) continue;
    (/\.\.\.$|…$/.test(t) ? reticencias : boas).push(t);
  }
  return boas[0] ?? (reticencias[0] ? reticencias[0].replace(/\.\.\.$/, "…") : null);
}

// Nome para mostrar (o nome da pasta vira palavra de gente). Fora da tabela: o nome do catálogo, com hífens trocados por espaço.
export const NOME_BONITO: Record<string, string> = {
  "slide-animado": "Apresentação animada",
  "site-animado": "Site animado",
  "site-animado-cinema": "Site animado com imagens",
  "frontend-design": "Design de telas",
  "gerador-proposta": "Proposta comercial",
  "gerador-post": "Post para redes sociais",
  "mascote-agente": "Mascote de agente",
  "criacao-edicao-imagem-gpt-image": "Criar e editar imagem",
  "pedir-ao-codex": "Imagem pelo Codex",
  "mapa-por-audio": "Mapa por áudio",
  "assistir-video": "Assistir vídeo",
  "dg-editar-gravacao-bruta": "Limpar gravação bruta",
  "motion-design": "Motion design",
  "video-animado": "Vídeo animado",
  "gerar-prompt-seedance": "Prompt de vídeo (Seedance)",
  "documento-confirmar": "Documento sem inventar",
  "especificacao-curta": "Especificação curta",
  "fabrica-de-squads": "Fábrica de squads",
  lembrar: "Lembrar", lembretes: "Lembretes", aprender: "Aprender", socorro: "Socorro", radiografar: "Radiografar",
};
export function nomeBonito(nome: string): string {
  if (NOME_BONITO[nome]) return NOME_BONITO[nome];
  const t = nome.replace(/[-_]/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const QUEM_USA: Record<string, string[]> = {
  "slide-animado": ["felipe", "izzy"],
  "site-animado": ["felipe", "junior"],
  "site-animado-cinema": ["felipe", "junior"],
  "frontend-design": ["junior", "felipe"],
  "gerador-proposta": ["izzy", "felipe"],
  "gerador-post": ["izzy", "felipe"],
  "mascote-agente": ["felipe"],
  "criacao-edicao-imagem-gpt-image": ["felipe"],
  "pedir-ao-codex": ["felipe"],
  "mapa-por-audio": ["eric"],
  "assistir-video": ["theo", "mike"],
  "dg-editar-gravacao-bruta": ["theo"],
  "motion-design": ["theo", "felipe"],
  "video-animado": ["theo", "felipe"],
  "gerar-prompt-seedance": ["theo"],
  "documento-confirmar": ["katrina", "donna"],
  "especificacao-curta": ["jarbas", "junior"],
  "fabrica-de-squads": ["jarbas", "junior"],
  "lembretes": ["donna"],
  "lembrar": ["jarbas", "sofia"],
  "aprender": ["jarbas"],
  "socorro": ["jarbas", "junior"],
  "radiografar": ["junior"],
  "opensquad": ["jarbas"],
  "canva": ["felipe"],
  "template-designer": ["felipe"],
  "image-creator": ["felipe"],
  "image-fetcher": ["felipe"],
  "image-ai-generator": ["felipe"],
  "gcp-image-gen": ["felipe"],
  "image-to-prompt": ["felipe"],
  "instagram-publisher": ["donna"],
  "blotato": ["donna"],
  "resend": ["donna"],
  "himalaya": ["donna"],
  "apify": ["mike"],
};

export const NOME_AGENTE: Record<string, string> = {
  jarbas: "Jarbas", felipe: "Felipe", izzy: "Izzy", junior: "Junior", eric: "Eric", theo: "Theo", mike: "Mike",
  katrina: "Katrina", donna: "Donna", sofia: "Sofia",
};
