// Installation de l'application (PWA) : on capte l'invite du navigateur pour la proposer au bon moment, sans insister.
import { bus, store, toast } from './lib.js?v=__V__'

let deferred = null // événement beforeinstallprompt (Chrome, Edge, Android)
const DAY = 86400000

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const canPrompt = () => !!deferred && !isStandalone()
export const iosHint = () => isIOS() && !isStandalone()
export const installable = () => canPrompt() || iosHint()

// Pas de harcèlement : « Plus tard » repousse de 14 jours, et après deux refus on ne propose plus (le menu du compte reste).
export const snoozed = () => Date.now() < Number(store.get('jr_install_until') || 0) || Number(store.get('jr_install_dismissed') || 0) >= 2
export const dismiss = () => {
  store.set('jr_install_dismissed', String(Number(store.get('jr_install_dismissed') || 0) + 1))
  store.set('jr_install_until', String(Date.now() + 14 * DAY))
  bus.dispatchEvent(new Event('install'))
}
export const shouldOffer = () => installable() && !snoozed()

export async function install() {
  if (!deferred) return 'unavailable'
  const e = deferred; deferred = null
  e.prompt()
  const { outcome } = await e.userChoice
  bus.dispatchEvent(new Event('install'))
  return outcome
}

addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; bus.dispatchEvent(new Event('install')) })
addEventListener('appinstalled', () => { deferred = null; store.set('jr_install_dismissed', '9'); bus.dispatchEvent(new Event('install')); toast('JobRadar est installée.') })
