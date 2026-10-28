// 28/10/2026: mostra no chat a foto que ela anexou. Só imagem, só da pasta de anexos do app.
// O painel inteiro fica atrás da porta com senha (Traefik), então só quem entrou chega aqui.
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
const PASTA = "/root/jarbas-app-anexos";
const TIPOS: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export async function GET(req: Request) {
  const c = new URL(req.url).searchParams.get("c") || "";
  let real = "";
  try { real = await fs.realpath(c); } catch { return new Response("Anexo não encontrado.", { status: 404 }); }
  const tipo = TIPOS[path.extname(real).toLowerCase()];
  if (!real.startsWith(PASTA + "/") || !tipo) return new Response("Só imagens anexadas.", { status: 403 });
  const dados = await fs.readFile(real);
  return new Response(new Uint8Array(dados), { headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
