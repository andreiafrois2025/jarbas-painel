"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMetricsHistory, tempoRelativo } from "@/lib/metrics";
import type { User } from "@supabase/supabase-js";

// Config: Conta (perfil + segurança) e Integrações (status real de cada serviço).
const STATUS_URL =
  "https://pmmyqljiuslstwbmiron.supabase.co/storage/v1/object/public/status/status.json";

type SubPage = "conta" | "integracoes";

// ─────────────────────────── Aba Conta ───────────────────────────

function redimensionarFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const LADO = 128;
      const canvas = document.createElement("canvas");
      canvas.width = LADO;
      canvas.height = LADO;
      const ctx = canvas.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, LADO, LADO);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function ContaTab() {
  const [user, setUser] = useState<User | null>(null);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
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

  const aviso = (ok: boolean, texto: string) => {
    setMsg({ ok, texto });
    setTimeout(() => setMsg(null), 5000);
  };

  const trocarFoto = async (file: File) => {
    try {
      const b64 = await redimensionarFoto(file);
      const { data, error } = await supabase.auth.updateUser({ data: { avatar_b64: b64 } });
      if (error) throw error;
      setUser(data.user);
      aviso(true, "Foto atualizada!");
    } catch {
      aviso(false, "Não consegui salvar a foto. Tenta uma imagem menor.");
    }
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
    setSenha(""); setSenha2("");
    aviso(true, "Senha alterada com sucesso!");
  };

  const sair = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const input = "w-full max-w-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm";
  const botao = "px-4 py-2 rounded-lg bg-[var(--af-teal,#2D6B6B)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.ok ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>
          {msg.texto}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Perfil</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl cursor-pointer"
            title="Trocar foto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" /> : "👩🏽"}
          </button>
          <div className="text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">{user?.email}</p>
            <p>Clica na foto pra trocar (fica só no seu login).</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && trocarFoto(e.target.files[0])} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <input className={input} placeholder="Nome de exibição" value={nome}
            onChange={(e) => setNome(e.target.value)} />
          <button className={botao} onClick={salvarNome}>Salvar nome</button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Segurança</h2>
        <input className={input} type="password" placeholder="Nova senha (mín. 8 caracteres)"
          value={senha} onChange={(e) => setSenha(e.target.value)} />
        <input className={input} type="password" placeholder="Confirmar nova senha"
          value={senha2} onChange={(e) => setSenha2(e.target.value)} />
        <button className={botao} disabled={salvando} onClick={trocarSenha}>
          {salvando ? "Salvando…" : "Alterar senha"}
        </button>
        <p className="text-xs text-[var(--text-muted)]">
          Trocar o e-mail de login exige confirmação nos dois e-mails — se precisar, me pede no chat que eu te guio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sessão</h2>
        <button
          className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50"
          onClick={sair}
        >
          Sair do painel
        </button>
      </section>
    </div>
  );
}

// ──────────────────────── Aba Integrações ────────────────────────

interface StatusSaude {
  gerado_em: string;
  sinais_vitais: Record<string, boolean>;
  crons: Record<string, { ok: boolean }>;
}

function IntegracoesTab() {
  const [st, setSt] = useState<StatusSaude | null>(null);
  const { hoje } = useMetricsHistory();

  useEffect(() => {
    fetch(`${STATUS_URL}?t=${Date.now()}`).then((r) => r.json()).then(setSt).catch(() => {});
  }, []);

  const autom = hoje?.automacoes ?? {};
  const rodouRecente = (iso: string | null | undefined, horas: number) =>
    !!iso && Date.now() - new Date(iso).getTime() < horas * 3600 * 1000;

  const itens: { nome: string; icone: string; ok: boolean | null; detalhe: string; onde: string }[] = [
    {
      nome: "WhatsApp (Donna)", icone: "📱",
      ok: st ? !!st.sinais_vitais?.whatsapp : null,
      detalhe: "Briefing matinal, grupo IA, alertas de falha e avisos de tarefas.",
      onde: "Gateway OpenClaw na VPS (re-parear: openclaw channels)",
    },
    {
      nome: "Telegram (bot)", icone: "💬",
      ok: st ? !!st.sinais_vitais?.telegram : null,
      detalhe: "Canal de fallback: checkpoints das squads, entrega de carrosséis.",
      onde: "claude-telegram.service + OpenClaw",
    },
    {
      nome: "Notion", icone: "🗂️",
      ok: hoje ? rodouRecente(autom.status_saude, 2) : null,
      detalhe: "Radar de Posts IA, banco Conteúdos, lista de tarefas, Segundo Cérebro.",
      onde: "Token no container OpenClaw (workspace/notion_radar.py)",
    },
    {
      nome: "Google Gemini", icone: "🤖",
      ok: null,
      detalhe: "Gerador de posts, roteiros de reels e aprendiz de estilo (conta do Jarbas).",
      onde: "GEMINI_API_KEY no container — uso visível nos logs da VPS",
    },
    {
      nome: "Google Calendar", icone: "📅",
      ok: st ? !!st.sinais_vitais?.container : null,
      detalhe: "Agenda do briefing matinal (conta assistentejarbas.ia@gmail.com).",
      onde: "google_calendar_token.json no container",
    },
    {
      nome: "Google Drive (backups e reels)", icone: "☁️",
      ok: st ? st.crons?.backup_diario?.ok ?? null : null,
      detalhe: "Backup diário da VPS + acervo Instagram/Reels + Marca.",
      onde: "rclone remote JarbasDrive2",
    },
    {
      nome: "Supabase (painel)", icone: "⚡",
      ok: st !== null,
      detalhe: "Login, fluxos, equipe, status e métricas do painel.",
      onde: ".env.local do painel + bucket público status",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">
        Status ao vivo (semáforo {st ? tempoRelativo(st.gerado_em) : "…"}). Chaves e tokens ficam na VPS — nunca aqui.
      </p>
      {itens.map((i) => (
        <div key={i.nome} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] flex gap-3 items-start">
          <span className="text-2xl">{i.icone}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">{i.nome}</span>
              <span className="text-xs">
                {i.ok === null ? "⚪ sem medição direta" : i.ok ? "🟢 funcionando" : "🔴 com problema"}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{i.detalhe}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Onde vive: {i.onde}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── Página ───────────────────────────

export default function ConfigPage() {
  const [subPage, setSubPage] = useState<SubPage>("conta");
  const aba = (id: SubPage, rotulo: string) => (
    <button
      onClick={() => setSubPage(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
        subPage === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 md:px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        <h1 className="text-base md:text-lg font-semibold mr-4 py-3">Config</h1>
        {aba("conta", "👤 Conta")}
        {aba("integracoes", "🔌 Integrações")}
      </div>
      <div className="flex-1 overflow-auto">
        {subPage === "conta" ? <ContaTab /> : <IntegracoesTab />}
      </div>
    </div>
  );
}
