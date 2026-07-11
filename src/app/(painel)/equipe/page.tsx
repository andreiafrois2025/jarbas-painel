"use client";

import { useRouter } from "next/navigation";
import HRPage from "@/components/HRPage";
import { usePainel, pageToPath } from "@/lib/painel-context";

export default function EquipePage() {
  const router = useRouter();
  const { reload } = usePainel();

  return (
    <HRPage
      onNavigate={(p) => router.push(pageToPath(p))}
      onDataChanged={reload}
    />
  );
}
