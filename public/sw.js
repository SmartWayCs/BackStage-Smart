// Service worker do BackStage Smart.
// - Arquivos do app (JS/CSS/ícones): cache com atualização em segundo plano, para abrir rápido.
// - Páginas: tenta a rede primeiro e, sem internet, abre a última versão guardada.
// - Dados do Supabase NUNCA passam por aqui (são de outro domínio), então não ficam desatualizados.
const CACHE = 'backstage-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return res })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res }).catch(() => cached)
      return cached || network
    }),
  )
})
