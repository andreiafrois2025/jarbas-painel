// Jarbas sempre ligado (21/10/2026): o chat do Jarbas no painel fala direto com a
// sessão viva em jarbas.andreiafrois.tech (VPS), em vez do chat antigo da squad-api.
// O navegador manda os cookies do "aparelho de confiança" (mesmo site andreiafrois.tech),
// então a senha forte e o "Permitir" no celular continuam valendo aqui dentro.
import type { Mensagem } from "./chat";

export const JARBAS_VIVO = "https://jarbas.andreiafrois.tech";

export interface EstadoVivo { temSenha: boolean; entrou: boolean; aparelho?: string; principal?: boolean; temPrincipal?: boolean }
export interface LicencaVivo { id: string; ferramenta: string; resumo: string; aparelho?: string }
export interface MotorVivo { ligado: boolean; ocupado: boolean; fila: number; modelo?: string; permissoes?: LicencaVivo[] }
interface ItemVivo { quando: number; quem: "ela" | "jarbas" | "acao" | "sistema"; texto: string; aparelho?: string; segundos?: number }

const ir = (p: string, init?: RequestInit) => fetch(JARBAS_VIVO + p, { credentials: "include", ...init });
const postar = (p: string, corpo?: unknown) =>
  ir(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo ?? {}) }).then((r) => r.json());

export const vivoApi = {
  estado: async (): Promise<EstadoVivo> => (await ir("/api/estado")).json(),
  historico: async (): Promise<{ itens: ItemVivo[]; motor: MotorVivo }> => (await ir("/api/historico")).json(),
  enviar: (texto: string) => postar("/api/mensagem", { texto }) as Promise<{ ok?: boolean; erro?: string }>,
  interromper: () => postar("/api/interromper"),
  modelo: (modelo: string) => postar("/api/modelo", { modelo }) as Promise<{ ok?: boolean; erro?: string }>,
  permissao: (id: string, permitir: boolean) => postar("/api/permissao", { id, permitir }) as Promise<{ ok?: boolean; erro?: string }>,
  nova: () => postar("/api/nova-conversa"),
  anexo: async (f: File): Promise<string> => {
    const r = await ir("/api/anexo", { method: "POST", headers: { "X-Nome": encodeURIComponent(f.name) }, body: f }).then((x) => x.json());
    if (!r.caminho) throw new Error(r.erro || "Não consegui anexar.");
    return r.caminho;
  },
  transcrever: async (b: Blob): Promise<string> => {
    const r = await ir("/api/transcrever", { method: "POST", headers: { "Content-Type": b.type || "audio/webm" }, body: b }).then((x) => x.json());
    if (r.texto === undefined) throw new Error(r.erro || "Não consegui transcrever.");
    return r.texto;
  },
  eventos: () => new EventSource(JARBAS_VIVO + "/api/eventos", { withCredentials: true }),
  // abre a tela do Jarbas só para conectar este aparelho (senha + Permitir no celular) e volta
  conectar: () => window.open(JARBAS_VIVO + "/?voltar=painel", "jarbas-conectar", "width=480,height=720"),
};

// histórico da sessão viva no formato das mensagens do painel; ações seguidas viram uma linha só
export function paraMensagens(itens: ItemVivo[], desde = 0): Mensagem[] {
  const out: Mensagem[] = [];
  let acao: Mensagem | null = null;
  itens.forEach((it, i) => {
    if (desde && it.quando < desde) return;
    const ts = new Date(it.quando).toISOString();
    if (it.quem === "acao") {
      if (acao) { acao.texto = `${acao.texto.split(" … ")[0]} … ${it.texto}`; return; }
      acao = { id: `v${i}`, papel: "sistema", texto: `⚙️ ${it.texto}`, ts };
      out.push(acao);
      return;
    }
    acao = null;
    out.push({ id: `v${i}`, papel: it.quem === "ela" ? "user" : it.quem === "jarbas" ? "assistant" : "sistema", texto: it.texto, ts,
      modeloRotulo: it.quem === "jarbas" ? `sempre ligado${it.segundos ? ` · ${it.segundos}s` : ""}` : undefined });
  });
  return out;
}
