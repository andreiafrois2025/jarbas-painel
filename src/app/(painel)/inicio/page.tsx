"use client";

import { useRouter } from "next/navigation";
import InicioPanel from "@/components/InicioPanel";
import { usePainel } from "@/lib/painel-context";

export default function InicioPage() {
  const router = useRouter();
  const { collaborators, assignments, categories, quickLinks } = usePainel();

  return (
    <InicioPanel
      collaborators={collaborators}
      assignments={assignments}
      categories={categories}
      quickLinks={quickLinks}
      onOpenEquipe={() => router.push("/equipe")}
    />
  );
}
