"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { signIn, signUp, seedDefaultData } from "@/lib/storage";
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

            {/* Opção de criar conta removida para segurança */}
          </div>
        </div>
      </div>
    );
  }

  // ---- DASHBOARD (usuário logado) ----
  return <Dashboard session={session} />;
}
