// Apoio da página Equipe › Habilidades: categoria simples, "como pedir" e
// "quem usa" de cada habilidade.
//
// - grupo: tabela GRUPO abaixo (pelo uso dela); fora da tabela, pela categoria do catálogo.
// - "como pedir": primeira frase entre aspas da descrição do SKILL.md
//   ("Use quando ela disser ..."). Sem aspas na descrição, não mostra nada.
// - "quem usa": mapeamento óbvio habilidade -> agente da equipe (abaixo).
//   Habilidade fora da tabela não mostra "quem usa" (nada inventado).

export type CategoriaChip = "igam" | "design" | "video" | "memoria" | "agentes" | "sistema";

// 21/10: grupos pensados pelo uso dela (antes eram 4 chips pela categoria técnica).
// A ordem aqui é a ordem das seções em "Todas": o que ela procura rápido primeiro,
// o que os agentes usam sozinhos e a manutenção no fim.
export const CATEGORIAS: { id: CategoriaChip; rotulo: string; emoji: string; explica: string }[] = [
  { id: "igam", rotulo: "Igam", emoji: "🏛️", explica: "Trabalho no Igam: avisos do grupo, mapas e documentos." },
  { id: "design", rotulo: "Design, sites e imagens", emoji: "🎨", explica: "Apresentações, sites, propostas e imagens." },
  { id: "video", rotulo: "Vídeo e posts", emoji: "🎬", explica: "Reels, vídeos animados e textos para as redes." },
  { id: "memoria", rotulo: "Memória e organização", emoji: "🧠", explica: "Lembrar, lembretes e guardar jeitos de fazer." },
  { id: "agentes", rotulo: "Os agentes usam sozinhos", emoji: "🤖", explica: "Você não precisa chamar: o Jarbas, a Donna ou as squads usam por trás quando a tarefa pede." },
  { id: "sistema", rotulo: "Sistema e manutenção", emoji: "⚙️", explica: "Para consertar, entender ou montar o próprio sistema." },
];

// Grupo de cada habilidade pelo nome do catálogo. Fora da tabela: cai pela categoria técnica.
export const GRUPO: Record<string, CategoriaChip> = {
  "acontece-no-igam": "igam", "mapa-por-audio": "igam", "mapa-institucional": "igam", "documento-confirmar": "igam",
  "slide-animado": "design", "site-animado": "design", "site-animado-cinema": "design", "gerador-proposta": "design",
  "mascote-agente": "design", "criacao-edicao-imagem-gpt-image": "design", "pedir-ao-codex": "design", "frontend-design": "design",
  "gerador-post": "video", "gerar-prompt-seedance": "video", "assistir-video": "video", "dg-editar-gravacao-bruta": "video",
  "motion-design": "video", "video-animado": "video",
  lembrar: "memoria", lembretes: "memoria", aprender: "memoria", "especificacao-curta": "memoria",
  "telegram-audio": "agentes", "reels-studio": "agentes", "gerador-mapas": "agentes", apify: "agentes", blotato: "agentes",
  canva: "agentes", "instagram-publisher": "agentes", resend: "agentes", "image-ai-generator": "agentes", "image-creator": "agentes",
  "image-fetcher": "agentes", "template-designer": "agentes", "gcp-image-gen": "agentes", "image-to-prompt": "agentes",
  weather: "agentes", himalaya: "agentes", healthcheck: "agentes", "opensquad-skill-creator": "agentes", "Best-Practice Creator": "agentes",
  socorro: "sistema", radiografar: "sistema", "fabrica-de-squads": "sistema", opensquad: "sistema", "opensquad-dev": "sistema",
  "opensquad-dashboard-design": "sistema", salvatelegram: "sistema",
};

export function categoriaChip(categoria?: string, nome?: string): CategoriaChip {
  if (nome && GRUPO[nome]) return GRUPO[nome];
  const c = (categoria || "").toLowerCase();
  if (/design|imagem/.test(c)) return "design";
  if (/v[ií]deo/.test(c)) return "video";
  if (/document|mem[oó]ria/.test(c)) return "memoria";
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
  "acontece-no-igam": "Acontece no Igam",
  opensquad: "OpenSquad",
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
  "mapa-institucional": "Mapa institucional", "gerador-mapas": "Motor dos mapas", "reels-studio": "Estúdio de reels",
  "telegram-audio": "Áudio do Telegram", salvatelegram: "Levar a conversa pro Telegram", "Best-Practice Creator": "Manual de boas práticas",
  "opensquad-skill-creator": "Criar habilidade (OpenSquad)", "opensquad-dev": "Checklist do OpenSquad", "opensquad-dashboard-design": "Visual do escritório virtual",
  apify: "Coletar dados de sites", blotato: "Publicar nas redes", canva: "Canva", "instagram-publisher": "Publicar no Instagram",
  resend: "Enviar e-mails", "image-ai-generator": "Gerar imagem com IA", "image-creator": "Finalizar imagem", "image-fetcher": "Buscar imagens",
  "template-designer": "Escolher modelo visual", "gcp-image-gen": "Imagem pelo Google", "image-to-prompt": "Descrever imagem",
  weather: "Previsão do tempo", himalaya: "E-mail (Donna)", healthcheck: "Hábitos de saúde",
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
  "mapa-institucional": ["eric"],
  "gerador-mapas": ["eric"],
  "reels-studio": ["theo"],
  "telegram-audio": ["jarbas"],
  "salvatelegram": ["jarbas"],
};

export const NOME_AGENTE: Record<string, string> = {
  jarbas: "Jarbas", felipe: "Felipe", izzy: "Izzy", junior: "Junior", eric: "Eric", theo: "Theo", mike: "Mike",
  katrina: "Katrina", donna: "Donna", sofia: "Sofia",
};
