"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updatePassword } from "@/lib/storage";

// Página para onde o link do email de "esqueci minha senha" leva.
// O Supabase entrega o usuário aqui já com sessão temporária de recovery
// via evento PASSWORD_RECOVERY. Se cair aqui sem sessão, mostra "link
// inválido ou expirado".
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase dispara PASSWORD_RECOVERY assim que processa o hash da URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasSession(true);
        }
        setReady(true);
      }
    );

    // Se o hash já foi consumido antes desse listener anexar, checa sessão manualmente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar senha");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <span className="text-4xl animate-pulse">⚡</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nova senha</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Define uma senha nova pro Jarbas</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
          {!hasSession ? (
            <>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                O link expirou ou já foi usado. Volta pra tela de login e clica de novo em <strong className="text-[var(--text-primary)]">Esqueci minha senha</strong>.
              </p>
              <button onClick={() => router.push("/")} className="btn-primary w-full">
                Voltar ao login
              </button>
            </>
          ) : done ? (
            <>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                ✅ Senha atualizada! Redirecionando pro painel…
              </p>
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern"
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Repete a senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-modern"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
                {saving ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
