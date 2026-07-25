import { redirect } from "next/navigation";

// 25/07/2026: Automações virou a porta de entrada de Produção — é a tela onde
// ficam os fluxos (agrupados por categoria) e de onde se cria um novo.
export default function ProducaoIndex() {
  redirect("/producao/automacoes");
}
