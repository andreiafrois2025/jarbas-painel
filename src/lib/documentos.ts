"use client";

// Anexos das squads ficam no bucket PRIVADO "squad-documents" do Supabase.
// Nunca mais usar getPublicUrl: para abrir um arquivo, gera-se um link assinado
// de 15 minutos na hora do clique.

import { supabase } from "./supabase";

const BUCKET = "squad-documents";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

/** Referência estável gravada junto do documento. NÃO é um link público (o bucket é
 *  privado); a squad-api usa a referência para baixar com a chave de serviço. */
export function refDocumento(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Link assinado de 15 minutos para leitura. */
export async function urlAssinadaDocumento(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 15 * 60);
  if (error || !data) throw new Error(error?.message || "não consegui gerar o link do arquivo");
  return data.signedUrl;
}

/** Abre o documento numa nova aba (a aba é aberta no clique para o navegador não bloquear). */
export async function abrirDocumento(path: string): Promise<void> {
  const aba = window.open("", "_blank");
  try {
    const url = await urlAssinadaDocumento(path);
    if (aba) { aba.opener = null; aba.location.href = url; } else window.location.href = url;
  } catch (e) {
    aba?.close();
    throw e;
  }
}
