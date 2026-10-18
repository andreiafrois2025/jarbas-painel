// Service worker mínimo: existe só para o navegador oferecer "Instalar app".
// NÃO guarda nada em cache (nenhum dado privado fica salvo no aparelho) e não
// intercepta pedidos: tudo vai direto para a rede, como numa aba normal.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* sem cache, a rede responde */ });
