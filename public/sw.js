// Service worker do Fut Campinho.
// Não guarda páginas em cache (o app sempre mostra dados ao vivo). Existe para o app poder ser
// instalado e para receber notificações quando o envio for ligado.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let dados = {}
  try {
    dados = e.data ? e.data.json() : {}
  } catch {
    dados = { corpo: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(dados.titulo || 'Fut Campinho', {
      body: dados.corpo || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: dados.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
      for (const c of abertas) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
