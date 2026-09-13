// Notifications push de cet appareil (Web Push) : abonnement, désabonnement, état.
import { call } from './lib.js?v=__V__'

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const b64ToU8 = (s) => Uint8Array.from(atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
export const deviceLabel = () => {
  const ua = navigator.userAgent
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil'
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  return `${br} · ${os}`
}
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const needsInstall = () => /iPhone|iPad/.test(navigator.userAgent) && !installed() // iOS : le push n'existe que dans l'application ajoutée à l'écran d'accueil

export async function currentSubscription() {
  if (!supported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enable() {
  if (!supported()) throw new Error("Ce navigateur ne gère pas les notifications push.")
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications refusées : autorisez-les dans les réglages du navigateur, puis réessayez.')
  const { public: key } = await call('push/key')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) }))
  await call('push/subscribe', 'POST', { subscription: sub.toJSON(), label: deviceLabel() })
  return sub
}

export async function disable() {
  const sub = await currentSubscription()
  if (!sub) return
  await call('push/unsubscribe', 'POST', { endpoint: sub.endpoint }).catch(() => {})
  await sub.unsubscribe()
}
