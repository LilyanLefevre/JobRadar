import { pb, $, $$, esc, call, state, bus, toast, store, hasProfile, profile, providerLabel, setupTodo, openDialog, avatarHtml, bindAvatars } from './lib.js?v=__V__'
import { ic } from './icons.js?v=__V__'
import * as search from './search.js?v=__V__'
import * as profileView from './profile.js?v=__V__'
import * as settings from './settings.js?v=__V__'
import * as alertsView from './alerts.js?v=__V__'
import * as pwa from './install.js?v=__V__'
import * as push from './push.js?v=__V__'

const routes = { search, alerts: alertsView, profile: profileView, settings }

async function start() {
  const authed = pb.authStore.isValid && await pb.collection('users').authRefresh().then(() => true, () => false)
  $('#login').hidden = authed
  $('#app').hidden = !authed
  if (authed) return enter()
  $('#login').innerHTML = `<div class="login"><div class="head">${ic('radar')}<span>JobRadar</span></div>
    <div class="body"><div class="stack"><h1>Se connecter</h1><p class="muted">Trouvez des offres et sachez, pour chacune, comment adapter votre CV.</p></div>
    <div class="stack" id="providers"></div><p class="muted small" id="loginMsg" role="status"></p></div></div>`
  try {
    const { oauth2 } = await pb.collection('users').listAuthMethods()
    $('#providers').innerHTML = oauth2.providers.map((p) => `<button class="btn secondary" data-p="${esc(p.name)}">Continuer avec ${esc(p.displayName)}</button>`).join('')
    if (!oauth2.providers.length) $('#loginMsg').textContent = "Aucun fournisseur de connexion n'est configuré."
    $$('#providers button').forEach((b) => (b.onclick = async () => {
      try { await pb.collection('users').authWithOAuth2({ provider: b.dataset.p }); start() }
      catch (e) { $('#loginMsg').textContent = 'Connexion impossible : ' + e.message }
    }))
  } catch { $('#loginMsg').textContent = 'Serveur injoignable.' }
}

async function enter() {
  $('#brand').innerHTML = `${ic('radar')}<span>JobRadar</span>`
  try {
    const [{ providers, batch }, key] = await Promise.all([call('providers'), call('status')])
    state.providers = providers; state.batch = batch; state.key = key
  } catch (e) { toast(e.message, 'err') }
  chrome()
  await refreshPushState()
  banner()
  route()
  alertsView.refreshBadge()
}

// Barre d'application : bouton « Terminer la configuration » tant qu'il manque l'IA ou le CV, et menu de compte.
function chrome() {
  const u = pb.authStore.record || {}, todo = setupTodo(), name = u.name || u.email || 'Compte'
  const p = profile(), k = state.key
  const profTag = p?.verifie ? '<span class="tag ok">Validé</span>' : hasProfile() ? '<span class="tag warn">À vérifier</span>' : '<span class="tag warn">Vide</span>'
  const n = (k.providers || []).length
  const iaTag = k.has_key ? `<span class="tag ok">IA · ${esc(providerLabel(k.provider))}${n > 1 ? ` +${n - 1}` : ''}</span>` : '<span class="tag warn">IA à configurer</span>'
  $('#end').innerHTML = `${todo.length ? `<a class="setup" href="${todo[0].to}">${ic('alert')}<span>Terminer la configuration</span></a>` : ''}
    <div class="acct"><button class="avatar" id="acctBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="acctMenu" aria-label="Menu du compte de ${esc(name)}">${avatarHtml(36)}</button>
      <div class="menu" id="acctMenu" role="menu" aria-label="Compte" hidden>
        <div class="who">${avatarHtml(96, "lg")}<div><b>${esc(name)}</b><span class="muted small">Connecté</span></div></div>
        <a role="menuitem" href="#/profile">${ic('user')}Mon profil ${profTag}</a>
        <a role="menuitem" href="#/settings">${ic('settings')}Paramètres ${iaTag}</a>
        ${pwa.installable() ? `<button role="menuitem" id="installBtn">${ic('download')}Installer l'application</button>` : ''}
        <div class="sep" role="separator"></div>
        <button role="menuitem" id="logoutBtn">${ic('logout')}Se déconnecter</button>
      </div></div>`
  bindAvatars($('#end'))
  const btn = $('#acctBtn'), menu = $('#acctMenu')
  const items = () => $$('[role=menuitem]', menu)
  const close = (focus) => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus() }
  const open = () => { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); items()[0].focus() }
  btn.onclick = () => (menu.hidden ? open() : close())
  menu.onclick = (e) => { if (e.target.closest('a')) close() }
  menu.onkeydown = (e) => {
    const list = items(), i = list.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus() }
    else if (e.key === 'Escape') { e.preventDefault(); close(true) }
    else if (e.key === 'Tab') close()
  }
  $('#installBtn')?.addEventListener('click', () => { close(); pwa.canPrompt() ? pwa.install() : showIosHelp() })
  $('#logoutBtn').onclick = () => { pb.authStore.clear(); location.hash = ''; location.reload() }
}
document.addEventListener('click', (e) => { const m = $('#acctMenu'); if (m && !m.hidden && !e.target.closest('.acct')) { m.hidden = true; $('#acctBtn').setAttribute('aria-expanded', 'false') } })
bus.addEventListener('chrome', chrome)

// Bandeau d'installation (sous la barre) : bouton Installer sur Chrome / Edge / Android, mode d'emploi sur iPhone.
function showIosHelp() {
  openDialog(`<h2>Installer JobRadar sur l'iPhone</h2>
    <ol class="steps"><li>Touchez <b>Partager</b> ${ic('share')} dans la barre de Safari.</li><li>Choisissez <b>Sur l'écran d'accueil</b>.</li><li>Ouvrez JobRadar depuis son icône : les notifications deviennent disponibles.</li></ol>
    <div class="actions"><button class="btn" data-close="ok">Compris</button></div>`)
}
// Invitation aux notifications : dès qu'il y a quelque chose à notifier (au moins une alerte), tant que cet appareil n'est pas abonné.
// Jamais d'insistance : « Plus tard » repousse de 7 jours, deux refus arrêtent, et un refus du navigateur ou une désactivation volontaire sont respectés.
let alertCount = 0, hasSub = false
const nsKey = (k) => Number(store.get('jr_notif_' + k) || 0)
const notifSnoozed = () => Date.now() < nsKey('until') || nsKey('dismissed') >= 2
export const notifDismiss = (forever = false) => { store.set('jr_notif_dismissed', String(forever ? 9 : nsKey('dismissed') + 1)); store.set('jr_notif_until', String(Date.now() + 7 * 86400000)); banner() }
const notifEligible = () => push.supported() && !push.needsInstall() && Notification.permission !== 'denied' && !hasSub && alertCount > 0 && !notifSnoozed()
async function refreshPushState() {
  if (push.supported()) { try { hasSub = !!(await push.currentSubscription()) } catch { hasSub = false } }
  try { alertCount = (await pb.collection('alerts').getList(1, 1, { requestKey: null })).totalItems } catch { /* sans alertes connues, pas d'invitation */ }
}

// Un seul bandeau à la fois sous la barre : notifications d'abord, puis installation de l'application.
function banner() {
  const el = $('#installbar'); if (!el) return
  const notif = notifEligible(), inst = !notif && pwa.shouldOffer()
  el.hidden = !(notif || inst)
  if (el.hidden) { el.innerHTML = ''; return }
  if (notif) {
    el.innerHTML = `<div class="in">${ic('bell')}<p><b>Activez les notifications</b> : soyez prévenu dès qu'une alerte trouve de nouvelles offres.</p>
      <div class="row"><button class="btn sm" id="ntGo">Activer</button><button class="btn ghost sm" id="ntLater">Plus tard</button></div></div>`
    $('#ntGo').onclick = async () => {
      $('#ntGo').disabled = true
      try { await push.enable(); hasSub = true; toast('Notifications activées sur cet appareil.'); bus.dispatchEvent(new Event('push')) }
      catch (e) { toast(e.message, 'err'); if (Notification.permission === 'denied') notifDismiss(true) }
      banner()
    }
    $('#ntLater').onclick = () => notifDismiss()
    return
  }
  const ios = !pwa.canPrompt()
  el.innerHTML = `<div class="in">${ic('download')}<p><b>Installez JobRadar</b> : accès direct depuis l'écran d'accueil et notifications des alertes.</p>
    <div class="row"><button class="btn sm" id="instGo">${ios ? 'Comment faire' : 'Installer'}</button><button class="btn ghost sm" id="instLater">Plus tard</button></div></div>`
  $('#instGo').onclick = () => (ios ? showIosHelp() : pwa.install())
  $('#instLater').onclick = () => pwa.dismiss()
}
bus.addEventListener('install', () => { banner(); chrome() })
// Alertes créées ou supprimées, notifications activées ou désactivées : on réévalue tout de suite (l'invitation arrive juste après la création d'une alerte).
for (const ev of ['alerts', 'push']) bus.addEventListener(ev, () => refreshPushState().then(banner))

function route() {
  const name = location.hash.replace(/^#\//, '') || 'search'
  const view = routes[name] || search
  const cur = routes[name] ? name : 'search'
  $$('[data-nav]').forEach((a) => (a.dataset.nav === cur ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')))
  const root = $('#view')
  root.oninput = root.onchange = root.onclick = null
  view.render(root)
  window.scrollTo(0, 0)
}

// Quitter le profil avec des modifications non enregistrées demande confirmation.
let lastHash = location.hash
window.addEventListener('hashchange', () => {
  if (lastHash.startsWith('#/profile') && !location.hash.startsWith('#/profile') && profileView.isDirty() && !confirm('Des modifications du profil ne sont pas enregistrées. Quitter quand même ?')) {
    location.hash = lastHash; return
  }
  lastHash = location.hash; route(); alertsView.refreshBadge()
})

// PWA : le service worker reçoit les notifications push ; aucun cache, donc jamais de version périmée.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {})

start()
