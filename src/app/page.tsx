import { redirect } from "next/navigation";

// A raiz agora só redireciona pro painel; o login vive no layout do grupo (painel).
export default function Home() {
  redirect("/inicio");
}
