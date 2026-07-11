"use client";

import { useRouter } from "next/navigation";
import ConfigPage from "@/components/ConfigPage";
import { pageToPath } from "@/lib/painel-context";

export default function ConfigRoute() {
  const router = useRouter();

  return <ConfigPage onNavigate={(p) => router.push(pageToPath(p))} />;
}
