// Preferências guardadas no navegador (localStorage). Tudo com try/catch:
// navegador bloqueando o armazenamento não pode derrubar a tela.

/** Escritório: as mesmas chaves que EscritorioPage sempre usou. */
export const CHAVE_SOM = "escritorioSom";   // "1" = ligado (padrão: desligado)
export const CHAVE_ANIM = "escritorioAnim"; // "0" = desligado (padrão: ligado)

/** Rota inicial do painel (Ajustes › Aparência › Abrir o painel em). */
export const CHAVE_INICIO = "painelInicio";
export type Inicio = "conversa" | "areas";

export function lerChave(chave: string): string | null {
  try { return window.localStorage.getItem(chave); } catch { return null; }
}
export function gravaChave(chave: string, valor: string) {
  try { window.localStorage.setItem(chave, valor); } catch { /* sem storage */ }
}

export const lerInicio = (): Inicio => (lerChave(CHAVE_INICIO) === "areas" ? "areas" : "conversa");
export const rotaInicial = (): string => (lerInicio() === "areas" ? "/areas" : "/conversa");
