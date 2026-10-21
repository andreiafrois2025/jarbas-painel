"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { usePainel } from "@/lib/painel-context";
import { squadFetch } from "@/lib/squadFetch";
import { useSquadJson } from "@/lib/saude";
import { useTema } from "../BotaoTema";
import { CartaoSecao, LinhaItem, Pilula, useUI } from "../ui";
import { Interruptor, Opcoes, BotaoPilula, Etiqueta } from "./pecas";
import { liberaSom, somPlim } from "@/lib/escritorio";
import { CHAVE_ANIM, CHAVE_SOM, CHAVE_INICIO, lerChave, gravaChave, lerInicio, type Inicio } from "@/lib/preferencias";
import { VIVO_DISPONIVEL, vivoApi } from "@/lib/jarbasVivo";

// Cartões de Ajustes (19/10/2026, mock aprovado "ajustes-novo").
// Conta e Aparência mexem em coisas dela; Avisos e Modo obra mostram o que a VPS faz.

// ─────────────────────────── Conta ───────────────────────────

function redimensionarFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const LADO = 128;
      const canvas = document.createElement("canvas");
      canvas.width = LADO; canvas.height = LADO;
      const ctx = canvas.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, LADO, LADO);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const campo = "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm";

export function CartaoConta({ id }: { id?: string }) {
  const { servidora } = usePainel();
  const [user, setUser] = useState<User | null>(null);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [editaSenha, setEditaSenha] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setNome((data.user?.user_metadata?.display_name as string) ?? "");
    });
  }, []);

  const avatar = user?.user_metadata?.avatar_b64 as string | undefined;
  const aviso = (ok: boolean, texto: string) => { setMsg({ ok, texto }); setTimeout(() => setMsg(null), 5000); };

  const trocarFoto = async (file: File) => {
    try {
      const b64 = await redimensionarFoto(file);
      const { data, error } = await supabase.auth.updateUser({ data: { avatar_b64: b64 } });
      if (error) throw error;
      setUser(data.user);
      aviso(true, "Foto atualizada!");
    } catch { aviso(false, "Não consegui salvar a foto. Tenta uma imagem menor."); }
  };
  const salvarNome = async () => {
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: nome } });
    if (error) return aviso(false, "Erro ao salvar o nome.");
    setUser(data.user);
    aviso(true, "Nome salvo!");
  };
  const trocarSenha = async () => {
    if (senha.length < 8) return aviso(false, "A senha precisa de pelo menos 8 caracteres.");
    if (senha !== senha2) return aviso(false, "As senhas não conferem.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return aviso(false, `Erro: ${error.message}`);
    setSenha(""); setSenha2(""); setEditaSenha(false);
    aviso(true, "Senha alterada com sucesso!");
  };
  const sair = async () => {
    await supabase.auth.signOut();
    if (VIVO_DISPONIVEL) { await vivoApi.sair().catch(() => {}); window.location.href = "/porta/"; return; }
    window.location.href = "/";
  };

  return (
    <CartaoSecao titulo="Conta" id={id}>
      {msg && (
        <div role="status" className={`mb-3 px-4 py-2 rounded-lg text-sm ${msg.ok ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>{msg.texto}</div>
      )}
      <ul>
        <LinhaItem
          titulo={
            <span className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} title="Trocar foto" aria-label="Trocar foto"
                className="w-11 h-11 rounded-full overflow-hidden grid place-items-center text-[13px] font-extrabold text-white shrink-0 cursor-pointer"
                style={{ background: "var(--ouro)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {avatar ? <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" /> : "AF"}
              </button>
              <span className="truncate">{servidora ? "e-mail oculto neste modo" : user?.email ?? "…"}</span>
            </span>
          }
          direita={<BotaoPilula onClick={() => fileRef.current?.click()}>trocar foto</BotaoPilula>} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && trocarFoto(e.target.files[0])} />
        <LinhaItem titulo="Nome de exibição"
          direita={
            <span className="flex items-center gap-2">
              <input className={`${campo} !w-36`} aria-label="Nome de exibição" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvarNome()} />
              <BotaoPilula onClick={salvarNome}>salvar</BotaoPilula>
            </span>
          } />
        {/* 21/10: no painel da VPS a entrada é a porta forte; senha e aparelhos se cuidam lá */}
        {VIVO_DISPONIVEL ? (
          <LinhaItem titulo="Senha e aparelhos (senha forte, Permitir no celular)" direita={<BotaoPilula onClick={() => { window.location.href = "/porta/#aparelhos"; }}>📱 abrir</BotaoPilula>} />
        ) : <LinhaItem titulo="Senha" direita={<BotaoPilula onClick={() => setEditaSenha((v) => !v)}>{editaSenha ? "cancelar" : "alterar"}</BotaoPilula>} />}
        {editaSenha && !VIVO_DISPONIVEL && (
          <li className="py-3 space-y-2 border-b border-dashed border-[var(--border)]">
            <input className={campo} type="password" placeholder="Nova senha (mín. 8 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
            <input className={campo} type="password" placeholder="Confirmar nova senha" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" />
            <BotaoPilula onClick={trocarSenha} desabilitado={salvando}>{salvando ? "salvando…" : "salvar a nova senha"}</BotaoPilula>
            <p className="text-xs text-[var(--text-muted)]">Trocar o e-mail de login exige confirmação nos dois e-mails: se precisar, peça no chat que eu te guio.</p>
          </li>
        )}
        <LinhaItem titulo="Sessão" direita={<BotaoPilula perigo onClick={sair}>sair do painel</BotaoPilula>} />
      </ul>
    </CartaoSecao>
  );
}

// ─────────────────────────── Aparência ───────────────────────────

export function CartaoAparencia({ id }: { id?: string }) {
  const [tema, escolherTema] = useTema();
  const [anim, setAnim] = useState(true);
  const [som, setSom] = useState(false);
  const [inicio, setInicio] = useState<Inicio>("conversa");

  useEffect(() => {
    setAnim(lerChave(CHAVE_ANIM) !== "0");
    setSom(lerChave(CHAVE_SOM) === "1");
    setInicio(lerInicio());
  }, []);

  const mudaAnim = (v: boolean) => { setAnim(v); gravaChave(CHAVE_ANIM, v ? "1" : "0"); };
  const mudaSom = (v: boolean) => {
    if (v) { liberaSom(); somPlim(); } // o navegador só libera o som dentro de um clique
    setSom(v); gravaChave(CHAVE_SOM, v ? "1" : "0");
  };
  const mudaInicio = (v: Inicio) => { setInicio(v); gravaChave(CHAVE_INICIO, v); };

  return (
    <CartaoSecao titulo="Aparência" id={id}>
      <ul>
        <LinhaItem titulo="Tema" direita={
          <Opcoes rotulo="Tema da tela" valor={tema} onChange={escolherTema}
            opcoes={[{ id: "sistema", rotulo: "sistema" }, { id: "claro", rotulo: "claro" }, { id: "escuro", rotulo: "noturno" }]} />} />
        <LinhaItem titulo="Animações do escritório" direita={<Interruptor rotulo="Animações do escritório" ligado={anim} onChange={mudaAnim} />} />
        <LinhaItem titulo="Sons do escritório" direita={<Interruptor rotulo="Sons do escritório" ligado={som} onChange={mudaSom} />} />
        <LinhaItem titulo="Abrir o painel em" detalhe="vale só neste navegador" direita={
          <Opcoes rotulo="Abrir o painel em" valor={inicio} onChange={mudaInicio}
            opcoes={[{ id: "conversa", rotulo: "Conversa" }, { id: "areas", rotulo: "Áreas" }]} />} />
      </ul>
    </CartaoSecao>
  );
}

// ─────────────────────────── Avisos ───────────────────────────

export function CartaoAvisos({ id }: { id?: string }) {
  const { dados, erro } = useSquadJson<{ ligado: boolean }>("/api/avisos/esperando", 0);
  const { avisar } = useUI();
  const [ligado, setLigado] = useState<boolean | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => { if (dados) setLigado(dados.ligado); }, [dados]);

  const mudar = async (v: boolean) => {
    setGravando(true);
    try {
      const r = await squadFetch("/api/avisos/esperando", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ligado: v }) });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setLigado(d.ligado);
      avisar(d.ligado ? "Aviso ligado: te chamo no WhatsApp quando eu parar." : "Aviso pausado: não vou te chamar quando eu parar.");
    } catch { avisar("Não consegui mudar o aviso agora."); }
    finally { setGravando(false); }
  };

  return (
    <CartaoSecao titulo="Avisos" id={id}>
      <p className="text-[13px] text-[var(--text-secondary)] -mt-1 mb-1">Onde cada aviso chega hoje (só leitura, menos o último).</p>
      <ul>
        <LinhaItem titulo="Problemas do sistema" detalhe="só quando precisa de você" direita={<Etiqueta>WhatsApp</Etiqueta>} />
        <LinhaItem titulo="Bom dia e prazos" direita={<Etiqueta>WhatsApp 7h</Etiqueta>} />
        <LinhaItem titulo="Notícias do grupo" direita={<Etiqueta>8h e 18h</Etiqueta>} />
        <LinhaItem titulo="“Parei e estou te esperando”"
          detalhe={erro ? "sem dado: a VPS não respondeu" : ligado == null ? "lendo…" : ligado ? "ligado: te chamo no WhatsApp quando eu paro" : "pausado: não te chamo quando eu paro"}
          direita={ligado == null
            ? <Pilula tom="neutro">{erro ? "sem dado" : "…"}</Pilula>
            : <Interruptor rotulo="Avisar no WhatsApp quando eu parar e estiver te esperando" ligado={ligado} onChange={mudar} desabilitado={gravando} />} />
      </ul>
    </CartaoSecao>
  );
}

// ─────────────────────────── Modo obra ───────────────────────────

interface EstadoObra { ligado: boolean; expira_em: string | null; tarefas_hoje: number; limite: number; ocupada: boolean; permitido: boolean }
interface ItemRegistro { quando: string; ferramenta: string; decisao: string; motivo: string; resumo: string }

const hora = (iso: string) => {
  // o log grava "...-0300"/"+0000" sem dois-pontos no fuso; normaliza antes de ler
  const d = new Date(iso.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 19);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export function CartaoModoObra({ id, abertoInicial = false }: { id?: string; abertoInicial?: boolean }) {
  const { confirmar, avisar } = useUI();
  const [estado, setEstado] = useState<EstadoObra | null>(null);
  const [erro, setErro] = useState(false);
  const [registro, setRegistro] = useState<ItemRegistro[] | null>(null);
  const [aberto, setAberto] = useState(abertoInicial);
  const [desligando, setDesligando] = useState(false);

  const ler = useCallback(async () => {
    try {
      const r = await squadFetch("/api/obra/estado");
      if (!r.ok) throw new Error(String(r.status));
      setEstado(await r.json()); setErro(false);
    } catch { setErro(true); }
  }, []);
  useEffect(() => { ler(); }, [ler]);

  useEffect(() => {
    if (!aberto || !estado?.permitido) return;
    let vivo = true;
    squadFetch("/api/obra/registro").then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => vivo && setRegistro(d.itens ?? [])).catch(() => vivo && setRegistro([]));
    return () => { vivo = false; };
  }, [aberto, estado?.permitido]);

  const desligar = async () => {
    const sim = await confirmar({ titulo: "Desligar o modo obra?", descricao: "Ele para de executar tarefas em todos os aparelhos. Para ligar de novo você pede um código pelo Telegram.", acao: "Desligar", destrutivo: true });
    if (!sim) return;
    setDesligando(true);
    try {
      const r = await squadFetch("/api/obra/desligar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) throw new Error(String(r.status));
      setEstado(await r.json());
      avisar("Modo obra desligado.");
    } catch { avisar("Não consegui desligar agora. Tente de novo."); }
    finally { setDesligando(false); }
  };

  const expira = estado?.expira_em ? new Date(estado.expira_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <CartaoSecao titulo="Modo obra" id={id}>
      {erro && !estado ? (
        <p className="text-sm text-[var(--text-secondary)] py-2">sem dado: a VPS não respondeu.</p>
      ) : !estado ? (
        <p className="text-sm text-[var(--text-secondary)] py-2">lendo…</p>
      ) : !estado.permitido ? (
        <p className="text-sm text-[var(--text-secondary)] py-2">O modo obra não está liberado para esta conta.</p>
      ) : (
        <ul>
          <LinhaItem titulo="Estado" detalhe={estado.ligado && expira ? `ligado até ${expira}` : "para ligar, peça o código no chat"}
            direita={<Pilula tom={estado.ligado ? "atencao" : "neutro"}>{estado.ligado ? "ligado" : "desligado"}</Pilula>} />
          <LinhaItem titulo="Código de ativação" direita={<Etiqueta>pelo Telegram</Etiqueta>} />
          <LinhaItem titulo="Tarefas hoje" direita={<Etiqueta>{estado.tarefas_hoje} de {estado.limite}</Etiqueta>} />
          <LinhaItem titulo="Registro do que ele fez" detalhe="as últimas 50 ações, da mais nova para a mais antiga"
            direita={<BotaoPilula onClick={() => setAberto((v) => !v)}>{aberto ? "esconder" : "ver ›"}</BotaoPilula>} />
          {aberto && (
            <li className="py-2 border-b border-dashed border-[var(--border)]">
              {registro === null ? <p className="text-sm text-[var(--text-secondary)] py-2">lendo…</p>
                : registro.length === 0 ? <p className="text-sm text-[var(--text-secondary)] py-2">Nenhuma ação registrada ainda.</p>
                : (
                  <ol className="max-h-[24rem] overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                    {registro.map((r, i) => (
                      <li key={i} className="px-3 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate"><span className="tabular-nums text-[var(--text-secondary)]">{hora(r.quando)}</span> · <span className="font-semibold" title={r.ferramenta}>{r.ferramenta}</span></span>
                          <Pilula tom={r.decisao === "permitiu" ? "ok" : r.decisao === "negou" ? "fora" : "neutro"}>{r.decisao}</Pilula>
                        </div>
                        {r.motivo && <p className="mt-1 text-[var(--text-primary)]">{r.motivo}</p>}
                        {r.resumo && <p className="mt-0.5 text-[11.5px] text-[var(--text-muted)] break-words">{r.resumo}</p>}
                      </li>
                    ))}
                  </ol>
                )}
            </li>
          )}
          <LinhaItem titulo="Desligar em todos os aparelhos" direita={<BotaoPilula perigo onClick={desligar} desabilitado={!estado.ligado || desligando}>desligar</BotaoPilula>} />
        </ul>
      )}
    </CartaoSecao>
  );
}

// ─────────────────────────── App no celular ───────────────────────────

export function CartaoAppCelular({ id }: { id?: string }) {
  const passos = (lista: string[]) => (
    <ol className="list-decimal pl-5 space-y-1.5 text-[14.5px] text-[var(--text-primary)]">
      {lista.map((p) => <li key={p}>{p}</li>)}
    </ol>
  );
  return (
    <CartaoSecao titulo="App no celular" id={id}>
      <p className="text-[14px] text-[var(--text-secondary)] mb-4">
        O painel vira um ícone na tela inicial e abre em tela cheia, como um aplicativo. Não precisa de loja de apps.
      </p>
      <div className="space-y-5">
        <div>
          <h3 className="text-[14px] font-extrabold mb-2">🤖 Android (Chrome)</h3>
          {passos(["Abra painel.andreiafrois.tech no Chrome.", "Toque nos três pontinhos, no canto de cima.", "Toque em “Instalar app” (ou “Adicionar à tela inicial”).", "Confirme em “Instalar”. O ícone do Jarbas aparece na tela inicial."])}
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold mb-2">🍎 iPhone (Safari)</h3>
          {passos(["Abra painel.andreiafrois.tech no Safari (tem que ser o Safari).", "Toque no botão Compartilhar (o quadrado com a seta para cima).", "Role e toque em “Adicionar à Tela de Início”.", "Toque em “Adicionar”. O ícone do Jarbas aparece na tela inicial."])}
        </div>
      </div>
    </CartaoSecao>
  );
}
