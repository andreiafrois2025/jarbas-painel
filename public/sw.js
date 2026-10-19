// Service worker do app (19/10/2026): guarda no aparelho SÓ os arquivos fixos do painel
// (código, fontes, ícones e fotos dos mascotes), pra abrir rápido. Nenhum dado privado:
// páginas, conversas e respostas da VPS/Supabase continuam indo sempre direto pra rede.
const CACHE = "jarbas-estatico-v1";
const FIXO = /^\/(_next\/static\/|mascotes\/|fonts\/|icon-|apple-touch-icon)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !FIXO.test(url.pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const salvo = await cache.match(e.request);
    if (salvo) return salvo;
    const resp = await fetch(e.request);
    if (resp.ok) cache.put(e.request, resp.clone());
    return resp;
  })());
});
