"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { signIn, signUp, seedDefaultData, sendPasswordReset } from "@/lib/storage";
import Dashboard from "@/components/Dashboard";
import type { Session } from "@supabase/supabase-js";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotError, setForgotError] = useState("");

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotStatus("sending");
    setForgotError("");
    try {
      await sendPasswordReset(forgotEmail);
      setForgotStatus("sent");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Erro ao enviar email");
      setForgotStatus("error");
    }
  };

  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setAuthLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const data = await signUp(email, password);
        if (data.user) {
          await seedDefaultData(data.user.id);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse">⚡</span>
          <span className="text-[var(--text-secondary)]">Carregando...</span>
        </div>
      </div>
    );
  }

  // ---- LOGIN / SIGNUP (design moderno dark) ----
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚡</div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Jarbas</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Seu escritório de agentes de IA
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-5">Entrar</h2>

            {error && (
              <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-modern"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {authLoading ? "Carregando..." : "Entrar"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotStatus("idle"); }}
              className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline mt-4"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {showForgot && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowForgot(false)}
          >
            <div
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Recuperar senha</h3>
              {forgotStatus === "sent" ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Se o email <strong className="text-[var(--text-primary)]">{forgotEmail}</strong> existir,
                    você vai receber um link em alguns segundos. Clica nele pra definir uma nova senha.
                  </p>
                  <button
                    onClick={() => setShowForgot(false)}
                    className="btn-primary w-full"
                  >
                    Fechar
                  </button>
                </>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Digita seu email que a gente te manda um link pra criar uma nova senha.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="input-modern"
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                  {forgotError && (
                    <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm rounded-lg p-3">
                      {forgotError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-2 px-4 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotStatus === "sending"}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {forgotStatus === "sending" ? "Enviando..." : "Enviar link"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- DASHBOARD (usuário logado) ----
  return <Dashboard session={session} />;
}
