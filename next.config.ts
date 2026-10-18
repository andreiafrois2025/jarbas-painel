import type { NextConfig } from "next";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// Rotas antigas -> casca nova (painel v2). Servem pra link salvo, atalho e o
// app instalado (PWA) continuarem funcionando. O ?fluxo=... de um link antigo é
// repassado sozinho pelo Next ao destino.
const redirecionar = (source: string, destination: string) => ({ source, destination, permanent: false });

const nextConfig: NextConfig = {
  async redirects() {
    return [
      redirecionar("/", "/conversa"),
      redirecionar("/inicio", "/conversa"),
      redirecionar("/chat", "/conversa"),
      redirecionar("/producao", "/maquina?aba=mapa"),
      redirecionar("/producao/automacoes", "/maquina?aba=mapa"),
      redirecionar("/producao/fluxos", "/maquina?aba=mapa"),
      redirecionar("/producao/squads", "/maquina?aba=squads"),
      redirecionar("/producao/estudio", "/areas?aba=conteudo&sub=estudio"),
      redirecionar("/producao/licitacao", "/areas?aba=igam"),
      redirecionar("/saude", "/maquina?aba=saude"),
      redirecionar("/pessoal", "/areas?aba=casa"),
      redirecionar("/metricas", "/numeros"),
      redirecionar("/biblioteca", "/equipe?aba=habilidades"),
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
