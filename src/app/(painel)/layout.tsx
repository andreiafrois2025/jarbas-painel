"use client";

import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import Dashboard from "@/components/Dashboard";
import LoginScreen from "@/components/LoginScreen";
import type { Session } from "@supabase/supabase-js";
import { VIVO_DISPONIVEL, vivoApi } from "@/lib/jarbasVivo";
import AvisosPorta from "@/components/AvisosPorta";

// Layout compartilhado de todas as páginas do painel.
// Persiste entre navegações: o Dashboard (sidebar + dados) não remonta a cada rota.
export default function PainelLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // 21/10: no painel da VPS quem passou pela porta forte já entra, sem o e-mail e senha antigos
      if (!session && VIVO_DISPONIVEL) {
        const t = await vivoApi.sessaoPainel().catch(() => null);
        if (t) {
          const { data } = await supabase.auth.setSession(t);
          session = data.session;
        }
      }
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  if (!session) {
    return <LoginScreen />;
  }

  return <Dashboard session={session}>{children}{VIVO_DISPONIVEL && <AvisosPorta />}</Dashboard>;
}
