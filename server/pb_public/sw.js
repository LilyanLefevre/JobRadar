// Service worker de JobRadar : notifications push uniquement (aucun cache, pour ne jamais servir une ancienne version).
const V = '__V__' // change à chaque déploiement : le navigateur met le service worker à jour
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'JobRadar', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/badge-72.png',
    data: { url: d.url || '/#/alerts' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data && e.notification.data.url) || '/#/alerts', self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) if (new URL(w.url).origin === self.location.origin && 'focus' in w) return w.navigate(url).then(() => w.focus()).catch(() => w.focus())
    return self.clients.openWindow(url)
  }))
})
